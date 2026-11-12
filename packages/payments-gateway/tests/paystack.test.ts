import { afterEach, describe, expect, it, vi } from "vitest"
import { PaystackClient } from "../src/services/paystack"

const client = (): PaystackClient => new PaystackClient("sk_test", "https://api.paystack.co")

const jsonResponse = (body: unknown, ok = true): Response =>
  ({ ok, json: async () => body }) as unknown as Response

describe("PaystackClient", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("lists banks", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ status: true, data: [{ name: "GTBank", code: "058" }] }),
    ) as unknown as typeof fetch

    const banks = await client().listBanks()

    expect(banks).toEqual([{ name: "GTBank", code: "058" }])
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it("paginates the bank list until a short page is returned", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      name: `Bank ${index}`,
      code: String(index).padStart(3, "0"),
    }))

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ status: true, data: firstPage }))
      .mockResolvedValueOnce(jsonResponse({ status: true, data: [{ name: "Last Bank", code: "999" }] }))

    global.fetch = fetchMock as unknown as typeof fetch

    const banks = await client().listBanks()

    expect(banks).toHaveLength(101)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const [firstUrl] = fetchMock.mock.calls[0] as [string]
    const [secondUrl] = fetchMock.mock.calls[1] as [string]

    expect(firstUrl).toContain("page=1")
    expect(secondUrl).toContain("page=2")
  })

  it("resolves an account through the Paystack resolve endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: true,
        data: { account_name: "ACME LIMITED", account_number: "0123456789", bank_id: 9 },
      }),
    )

    global.fetch = fetchMock as unknown as typeof fetch

    const resolved = await client().resolveAccount("058", "0123456789")

    expect(resolved).toEqual({
      account_name: "ACME LIMITED",
      account_number: "0123456789",
      bank_id: 9,
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]

    expect(url).toBe(
      "https://api.paystack.co/bank/resolve?account_number=0123456789&bank_code=058",
    )
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test")
  })

  it("surfaces Paystack resolve failures", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        status: false,
        message: "Could not resolve account name. Check parameters or try again.",
      }),
    ) as unknown as typeof fetch

    await expect(client().resolveAccount("058", "0123456789")).rejects.toThrow(
      "Could not resolve account name",
    )
  })

  it("initializes a transaction", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: true,
        data: {
          reference: "acme_abc",
          authorization_url: "https://checkout.paystack.com/xyz",
          access_code: "xyz",
        },
      }),
    )

    global.fetch = fetchMock as unknown as typeof fetch

    const initialized = await client().initialize({
      email: "buyer@example.com",
      amount: 500000,
      currency: "NGN",
      reference: "acme_abc",
      callback_url: "https://acme.example.com/checkout",
      subaccount: "ACCT_123",
      vendor_id: "vnd_123",
      external_ref: "payses_123",
    })

    expect(initialized.authorization_url).toContain("checkout.paystack.com")

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body)) as Record<string, unknown>

    expect(body.bearer).toBe("subaccount")
    expect(body.subaccount).toBe("ACCT_123")
    expect(body.metadata).toMatchObject({
      gateway: "flowcheq",
      callback_source: "medusa",
      vendor_id: "vnd_123",
      external_ref: "payses_123",
    })
  })
})
