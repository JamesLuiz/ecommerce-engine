import { afterEach, describe, expect, it, vi } from "vitest"
import { PaystackClient } from "../src/services/paystack"

describe("PaystackClient", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("lists banks", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: true, data: [{ name: "GTBank", code: "058" }] }),
    }) as unknown as typeof fetch

    const client = new PaystackClient("sk_test", "https://api.paystack.co")

    const banks = await client.listBanks()

    expect(banks).toEqual([{ name: "GTBank", code: "058" }])
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it("resolves an account", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: { account_name: "ACME LIMITED", account_number: "0123456789", bank_code: "058" },
      }),
    }) as unknown as typeof fetch

    const client = new PaystackClient("sk_test", "https://api.paystack.co")

    const resolved = await client.resolveAccount("058", "0123456789")

    expect(resolved.account_name).toBe("ACME LIMITED")
  })

  it("initializes a transaction", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: { reference: "acme_abc", authorization_url: "https://checkout.paystack.com/xyz", access_code: "xyz" },
      }),
    }) as unknown as typeof fetch

    const client = new PaystackClient("sk_test", "https://api.paystack.co")

    const initialized = await client.initialize({
      email: "buyer@example.com",
      amount: 500000,
      currency: "NGN",
      reference: "acme_abc",
      callback_url: "https://acme.example.com/checkout",
      subaccount: "ACCT_123",
    })

    expect(initialized.authorization_url).toContain("checkout.paystack.com")
  })
})
