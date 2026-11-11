import { db } from "../db.js"
import type { PaystackClient } from "./paystack.js"
import { findVendorById } from "./vendors.js"
import { loadConfig } from "../config.js"
import type { Settlement, SettlementInput } from "../types.js"

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

export const saveSettlement = async (
  client: PaystackClient,
  vendorId: string,
  input: SettlementInput,
): Promise<Settlement> => {
  const config = loadConfig(process.env)

  const vendor = await findVendorById(vendorId)

  if (!vendor) {
    throw new Error("not_found")
  }

  if (vendor.status !== "active") {
    throw new Error("vendor_suspended")
  }

  const existing = await findSettlementByVendorId(vendorId)

  if (existing) {
    const cooldownEndsAt =
      existing.updated_at.getTime() + config.SETTLEMENT_CHANGE_COOLDOWN_HOURS * 60 * 60 * 1000

    if (Date.now() < cooldownEndsAt) {
      throw new Error("settlement_cooldown")
    }
  }

  const resolved = await client.resolveAccount(input.bank_code, input.account_number)

  if (resolved.account_number.replace(/\D/g, "").length !== 10) {
    throw new Error("account_resolve_failed")
  }

  const now = new Date()

  let subaccountCode = existing?.subaccount_code ?? null

  if (existing) {
    const updated = await client.updateSubaccount(existing.subaccount_code, {
      business_name: vendor.name,
      settlement_bank: `${input.bank_code}-${input.account_number}`,
      account_number: input.account_number,
      percentage_charge: 0,
    })

    subaccountCode = updated.account_code
  } else {
    const created = await client.createSubaccount({
      business_name: vendor.name,
      settlement_bank: `${input.bank_code}-${input.account_number}`,
      account_number: input.account_number,
      percentage_charge: 0,
    })

    subaccountCode = created.account_code
  }

  const bankName = await client.getBankName(input.bank_code)

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
      input.bank_code,
      bankName,
      resolved.account_number.slice(-4),
      resolved.account_name,
      subaccountCode,
      now,
    ],
  )) as SettlementRow[]

  const row = rows[0]

  await db.unsafe(
    `insert into settlement_audit (vendor_id, action, bank_code, account_number_last4, account_name, actor)
     values ($1, 'updated', $2, $3, $4, $5)`,
    [vendorId, input.bank_code, resolved.account_number.slice(-4), resolved.account_name, input.actor],
  )

  if (!row) {
    throw new Error("Failed to save the settlement")
  }

  return toSettlement(row)
}
