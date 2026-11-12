import { describe, expect, it, vi } from "vitest"
import { AccountResolveError, resolveBankAccount } from "../src/services/accounts"
import type { PaystackClient } from "../src/services/paystack"

const clientWith = (resolveAccount: () => Promise<unknown>): PaystackClient =>
  ({ resolveAccount }) as unknown as PaystackClient

describe("resolveBankAccount", () => {
  it("normalises the Paystack resolve response", async () => {
    const client = clientWith(async () => ({
      account_number: "0123456789",
      account_name: "  ACME LIMITED  ",
      bank_id: 9,
    }))

    const resolved = await resolveBankAccount(client, {
      bank_code: "058",
      account_number: "0123456789",
    })

    expect(resolved).toEqual({
      account_name: "ACME LIMITED",
      account_number: "0123456789",
      bank_code: "058",
      bank_id: 9,
    })
  })

  it("rejects account numbers that are not 10 digits", async () => {
    const client = clientWith(async () => ({}))

    await expect(
      resolveBankAccount(client, { bank_code: "058", account_number: "12345" }),
    ).rejects.toMatchObject({ code: "validation_error", status: 400 })
  })

  it("rejects a resolved account number that differs from the request", async () => {
    const client = clientWith(async () => ({
      account_number: "9999999999",
      account_name: "ACME LIMITED",
      bank_id: 9,
    }))

    await expect(
      resolveBankAccount(client, { bank_code: "058", account_number: "0123456789" }),
    ).rejects.toMatchObject({ code: "account_number_mismatch", status: 422 })
  })

  it("rejects an empty account name", async () => {
    const client = clientWith(async () => ({
      account_number: "0123456789",
      account_name: "   ",
    }))

    await expect(
      resolveBankAccount(client, { bank_code: "058", account_number: "0123456789" }),
    ).rejects.toMatchObject({ code: "account_resolve_failed", status: 422 })
  })

  it("maps Paystack failures to account_resolve_failed", async () => {
    const client = clientWith(async () => {
      throw new Error("Could not resolve account name. Check parameters or try again.")
    })

    const error = await resolveBankAccount(client, {
      bank_code: "058",
      account_number: "0123456789",
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(AccountResolveError)
    expect(error).toMatchObject({
      code: "account_resolve_failed",
      status: 422,
      message: "Could not resolve account name. Check parameters or try again.",
    })
  })
})
