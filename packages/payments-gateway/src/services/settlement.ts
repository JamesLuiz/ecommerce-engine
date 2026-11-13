import { db } from "../db.js"
import type { PaystackClient } from "./paystack.js"
import { AccountResolveError, resolveBankAccount } from "./accounts.js"
import { countryForCurrency, isPaystackTestKey } from "./banks.js"
import { findVendorById } from "./vendors.js"
import { loadConfig } from "../config.js"
import type { ErrorCode, Settlement, SettlementInput } from "../types.js"

type SettlementRow = {
  vendor_id: string
  bank_code: string
  bank_name: string
  account_number_last4: string
  account_name: string
  subaccount_code: string
  status: "active"
  verified_at: Date
  updated_at: Date
}

export class SettlementError extends Error {
  readonly code: ErrorCode
  readonly status: number

  constructor(code: ErrorCode, message: string, status = 500) {
    super(message)
    this.name = "SettlementError"
    this.code = code
    this.status = status
  }
}

const toSettlement = (row: SettlementRow): Settlement => ({
  vendor_id: row.vendor_id,
  bank_code: row.bank_code,
  bank_name: row.bank_name,
  account_number_last4: row.account_number_last4,
  account_name: row.account_name,
  subaccount_code: row.subaccount_code,
  status: row.status,
  verified_at: row.verified_at,
  updated_at: row.updated_at,
})

export const findSettlementByVendorId = async (
  vendorId: string,
): Promise<Settlement | null> => {
  const rows = (await db.unsafe<SettlementRow[]>(
    "select * from settlements where vendor_id = $1 limit 1",
    [vendorId],
  )) as SettlementRow[]

  const row = rows[0]

  if (!row) {
    return null
  }

  return toSettlement(row)
}

const resolveBankName = async (
  client: PaystackClient,
  bankCode: string,
  currency: string,
): Promise<string> => {
  try {
    return await client.getBankName(bankCode, countryForCurrency(currency), currency)
  } catch {
    return bankCode === "001" ? "Test Bank (Paystack test mode)" : bankCode
  }
}

const isTestModeResolveLimit = (error: unknown): boolean =>
  error instanceof AccountResolveError && /test mode daily limit/i.test(error.message)

const isInvalidAccountDetails = (error: unknown): boolean =>
  error instanceof Error && /account details are invalid/i.test(error.message)

export const saveSettlement = async (
  client: PaystackClient,
  vendorId: string,
  input: SettlementInput,
): Promise<Settlement> => {
  const config = loadConfig(process.env)

  const vendor = await findVendorById(vendorId)

  if (!vendor) {
    throw new SettlementError("not_found", "Vendor not found.", 404)
  }

  if (vendor.status !== "active") {
    throw new SettlementError("vendor_suspended", "Vendor is suspended.", 403)
  }

  const existing = await findSettlementByVendorId(vendorId)

  if (existing && config.SETTLEMENT_CHANGE_COOLDOWN_HOURS > 0) {
    const cooldownEndsAt =
      existing.updated_at.getTime() +
      config.SETTLEMENT_CHANGE_COOLDOWN_HOURS * 60 * 60 * 1000

    if (Date.now() < cooldownEndsAt) {
      throw new SettlementError(
        "settlement_cooldown",
        "The settlement account was changed too recently. Try again later.",
        429,
      )
    }
  }

  const testMode = isPaystackTestKey(process.env.PAYSTACK_SECRET_KEY ?? "")
  let resolved: Awaited<ReturnType<typeof resolveBankAccount>> | null = null

  try {
    resolved = await resolveBankAccount(client, input)
  } catch (error) {
    // Paystack test mode rate-limits /bank/resolve after a few calls and tells
    // you to use bank code 001, which cannot back a subaccount. The subaccount
    // endpoint still validates the account, so let it do that in test mode.
    if (!testMode || !isTestModeResolveLimit(error)) {
      throw error
    }
  }

  const subaccountInput = {
    business_name: vendor.name,
    settlement_bank: resolved?.bank_code ?? input.bank_code,
    account_number: resolved?.account_number ?? input.account_number,
    percentage_charge: 0,
  }

  let subaccount: Awaited<ReturnType<PaystackClient["createSubaccount"]>>

  try {
    subaccount = existing
      ? await client.updateSubaccount(existing.subaccount_code, subaccountInput)
      : await client.createSubaccount(subaccountInput)
  } catch (error) {
    if (isInvalidAccountDetails(error)) {
      throw new SettlementError(
        "account_resolve_failed",
        error instanceof Error ? error.message : "Paystack could not validate the account details.",
        422,
      )
    }

    throw error
  }

  const subaccountCode = subaccount.subaccount_code

  if (!subaccountCode) {
    throw new SettlementError(
      "paystack_error",
      "Paystack did not return a subaccount code.",
      502,
    )
  }

  const accountName = (resolved?.account_name ?? subaccount.account_name ?? "").trim()

  if (!accountName) {
    throw new SettlementError(
      "account_resolve_failed",
      "Paystack did not return an account name for the settlement account.",
      422,
    )
  }

  const bankCode = resolved?.bank_code ?? input.bank_code
  const accountNumber = resolved?.account_number ?? input.account_number
  const bankName =
    subaccount.settlement_bank ||
    (await resolveBankName(client, bankCode, vendor.currency))
  const now = new Date()

  const rows = (await db.unsafe<SettlementRow[]>(
    `insert into settlements (
       vendor_id, bank_code, bank_name, account_number_last4, account_name, subaccount_code, status, verified_at, updated_at
     )
     values ($1, $2, $3, $4, $5, $6, 'active', $7, $7)
     on conflict (vendor_id)
     do update set
       bank_code = excluded.bank_code,
       bank_name = excluded.bank_name,
       account_number_last4 = excluded.account_number_last4,
       account_name = excluded.account_name,
       subaccount_code = excluded.subaccount_code,
       status = excluded.status,
       verified_at = excluded.verified_at,
       updated_at = excluded.updated_at
     returning *`,
    [
      vendorId,
      bankCode,
      bankName,
      accountNumber.slice(-4),
      accountName,
      subaccountCode,
      now,
    ],
  )) as SettlementRow[]

  const row = rows[0]

  if (!row) {
    throw new SettlementError("internal_error", "Failed to save the settlement.", 500)
  }

  await db.unsafe(
    `insert into settlement_audit (vendor_id, action, bank_code, account_number_last4, account_name, actor)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      vendorId,
      existing ? "updated" : "created",
      bankCode,
      accountNumber.slice(-4),
      accountName,
      input.actor,
    ],
  )

  return toSettlement(row)
}
