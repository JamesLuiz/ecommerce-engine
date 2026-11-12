import type { PaystackClient, PaystackResolveResponse } from "./paystack.js"
import type { ErrorCode } from "../types.js"

export type ResolvedBankAccount = {
  account_name: string
  account_number: string
  bank_code: string
  bank_id: number | null
}

export class AccountResolveError extends Error {
  readonly code: ErrorCode
  readonly status: number

  constructor(code: ErrorCode, message: string, status = 422) {
    super(message)
    this.name = "AccountResolveError"
    this.code = code
    this.status = status
  }
}

const digitsOnly = (value: string | undefined | null): string =>
  (value ?? "").replace(/\D/g, "")

export const resolveBankAccount = async (
  client: PaystackClient,
  input: { bank_code: string; account_number: string },
): Promise<ResolvedBankAccount> => {
  const accountNumber = digitsOnly(input.account_number)

  if (accountNumber.length !== 10) {
    throw new AccountResolveError(
      "validation_error",
      "account_number must be 10 digits.",
      400,
    )
  }

  let resolved: PaystackResolveResponse

  try {
    resolved = await client.resolveAccount(input.bank_code, accountNumber)
  } catch (error) {
    throw new AccountResolveError(
      "account_resolve_failed",
      error instanceof Error ? error.message : "Could not resolve account details.",
    )
  }

  if (digitsOnly(resolved.account_number) !== accountNumber) {
    throw new AccountResolveError(
      "account_number_mismatch",
      "Paystack resolved a different account number than the one submitted.",
    )
  }

  const accountName = (resolved.account_name ?? "").trim()

  if (!accountName) {
    throw new AccountResolveError(
      "account_resolve_failed",
      "Paystack did not return an account name.",
    )
  }

  return {
    account_name: accountName,
    account_number: accountNumber,
    bank_code: input.bank_code,
    bank_id: resolved.bank_id ?? null,
  }
}
