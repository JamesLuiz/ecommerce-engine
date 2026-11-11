import { afterEach, describe, expect, it, vi } from "vitest"
import { forwardVendorWebhook } from "../src/services/webhookForwarder.js"
import { computeWebhookSignature, vendorSecret } from "../src/services/crypto.js"

describe("forwardVendorWebhook", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("posts the raw body with timestamp and signature headers", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []

    global.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} })
      return { ok: true, status: 200 } as unknown as Response
    }) as unknown as typeof fetch

    const input = {
      vendorId: "vendor-1",
      webhookUrl: "https://acme.example.com/hooks/payment/paystack-gateway_1",
      rawBody: '{"event":"charge.success","reference":"acme_abc"}',
      timestamp: "1710000000",
    }

    const result = await forwardVendorWebhook(input)

    expect(result.delivered).toBe(true)
    expect(calls[0].url).toBe(input.webhookUrl)
    expect(calls[0].init.method).toBe("POST")
    expect(calls[0].init.body).toBe(input.rawBody)

    const headers = calls[0].init.headers as Record<string, string>
    expect(headers["content-type"]).toBe("application/json")
    expect(headers["x-gateway-timestamp"]).toBe("1710000000")

    const secret = vendorSecret("vendor-1", process.env.WEBHOOK_SIGNING_ROOT ?? "")
    const expected = computeWebhookSignature(secret, "1710000000", input.rawBody)
    expect(headers["x-gateway-signature"]).toBe(expected)
  })

  it("reports delivery failure when the vendor endpoint is not 2xx", async () => {
    global.fetch = vi.fn(async () => {
      return { ok: false, status: 500 } as unknown as Response
    }) as unknown as typeof fetch

    const result = await forwardVendorWebhook({
      vendorId: "vendor-1",
      webhookUrl: "https://acme.example.com/hooks/payment/x",
      rawBody: "{}",
    })

    expect(result.delivered).toBe(false)
  })
})
