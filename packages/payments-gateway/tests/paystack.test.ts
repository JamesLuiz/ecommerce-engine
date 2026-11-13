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

  it("paginates the bank list with Paystack cursors", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      name: `Bank ${index}`,
      code: String(index).padStart(3, "0"),
    }))

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          status: true,
          data: firstPage,
          meta: { next: "cursor-page-2", previous: null, perPage: 100 },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: true,
          data: [{ name: "Last Bank", code: "999" }],
          meta: { next: null, previous: "cursor-page-1", perPage: 100 },
        }),
      )

    global.fetch = fetchMock as unknown as typeof fetch

    const banks = await client().listBanks("nigeria", "NGN")

    expect(banks).toHaveLength(101)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const [firstUrl] = fetchMock.mock.calls[0] as [string]
    const [secondUrl] = fetchMock.mock.calls[1] as [string]

    expect(firstUrl).toContain("use_cursor=true")
    expect(firstUrl).toContain("currency=NGN")
    expect(secondUrl).toContain("next=cursor-page-2")
  })

  it("drops inactive, deleted, and duplicate bank codes", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        status: true,
        data: [
          { name: "GTBank", code: "058", active: true },
          { name: "GTBank duplicate", code: "058", active: true },
          { name: "Closed Bank", code: "999", active: false },
          { name: "Deleted Bank", code: "998", is_deleted: true },
        ],
      }),
    ) as unknown as typeof fetch

    const banks = await client().listBanks()

    expect(banks).toEqual([{ name: "GTBank", code: "058", active: true }])
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

  it("reads the subaccount code from the Paystack subaccount response", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        status: true,
        data: {
          subaccount_code: "ACCT_123",
          percentage_charge: 0,
          settlement_bank: "GTBank",
          account_name: "ACME LIMITED",
        },
      }),
    ) as unknown as typeof fetch

    const created = await client().createSubaccount({
      business_name: "Acme Store",
      settlement_bank: "058",
      account_number: "0123456789",
      percentage_charge: 0,
    })

    expect(created.subaccount_code).toBe("ACCT_123")
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
