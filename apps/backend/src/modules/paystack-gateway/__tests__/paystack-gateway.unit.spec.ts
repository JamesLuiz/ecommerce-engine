import crypto from "node:crypto"
import { PaystackGatewayPaymentProvider } from "../service"
import PaystackGatewayModule from "../index"
import { Modules } from "@medusajs/framework/utils"

describe("PaystackGatewayPaymentProvider", () => {
  const webhookSecret = "whsec_test_secret_abc123"
  let provider: PaystackGatewayPaymentProvider

  beforeEach(() => {
    provider = new PaystackGatewayPaymentProvider(
      {},
      {
        gatewayUrl: "https://gateway.example.com",
        gatewayToken: "vgw_test_token",
        webhookSecret,
      }
    )
  })

  it("exports valid Medusa ModuleProvider shape", () => {
    expect(PaystackGatewayModule.module).toBe(Modules.PAYMENT)
    expect(PaystackGatewayPaymentProvider.identifier).toBe("paystack-gateway")
  })

  it("converts major amount to minor integer kobo (5000.50 -> 500050) on initiatePayment", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (url, init) => {
      const body = JSON.parse(String(init?.body))
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            reference: "acme_ref_999",
            authorization_url: "https://checkout.paystack.com/auth_1",
            access_code: "code_1",
          }),
      } as any
    })

    const result = await provider.initiatePayment({
      amount: 5000.5,
      currency_code: "ngn",
      context: {
        customer: { email: "customer@example.com" },
        idempotency_key: "payses_001",
      },
      data: {
        callback_url: "https://acme.example.com/callback",
      },
    })

    expect(result.id).toBe("acme_ref_999")
    expect(result.data.reference).toBe("acme_ref_999")
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://gateway.example.com/v1/transactions/initialize",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          amount: 500050,
          currency: "NGN",
          email: "customer@example.com",
          external_ref: "payses_001",
          callback_url: "https://acme.example.com/callback",
        }),
      })
    )

    fetchSpy.mockRestore()
  })

  it("authorizes successfully and returns captured when gateway returns success", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async () => {
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            reference: "acme_ref_999",
            status: "success",
            amount: 500050,
            currency: "NGN",
            paid_at: "2026-03-30T10:00:00Z",
            channel: "card",
          }),
      } as any
    })

    const result = await provider.authorizePayment({
      id: "acme_ref_999",
      data: { reference: "acme_ref_999" },
    })

    expect(result.status).toBe("captured")
    expect(result.data.status).toBe("success")

    fetchSpy.mockRestore()
  })

  it("returns pending authorization when gateway returns pending", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async () => {
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            reference: "acme_ref_999",
            status: "pending",
            amount: 500050,
            currency: "NGN",
            paid_at: null,
          }),
      } as any
    })

    const result = await provider.authorizePayment({
      id: "acme_ref_999",
      data: { reference: "acme_ref_999" },
    })

    expect(result.status).toBe("pending")

    fetchSpy.mockRestore()
  })

  describe("getWebhookActionAndData", () => {
    it("validates signature, verifies timestamp, and maps charge.success to captured", async () => {
      const ts = String(Math.floor(Date.now() / 1000))
      const rawData = JSON.stringify({
        event: "charge.success",
        data: {
          reference: "acme_tx_1",
          amount: 250000,
          metadata: { external_ref: "payses_99" },
        },
      })
      const signature = crypto
        .createHmac("sha256", webhookSecret)
        .update(`${ts}.${rawData}`)
        .digest("hex")

      const result = await provider.getWebhookActionAndData({
        headers: {
          "x-gateway-timestamp": ts,
          "x-gateway-signature": signature,
        },
        rawData,
      })

      expect(result.action).toBe("captured")
      expect(result.data.session_id).toBe("payses_99")
      expect(result.data.amount).toBe(2500)
    })

    it("throws unauthorized error on bad signature", async () => {
      const ts = String(Math.floor(Date.now() / 1000))
      const rawData = JSON.stringify({ event: "charge.success" })

      await expect(
        provider.getWebhookActionAndData({
          headers: {
            "x-gateway-timestamp": ts,
            "x-gateway-signature": "bad_sig_hex",
          },
          rawData,
        })
      ).rejects.toThrow("bad signature")
    })

    it("throws unauthorized error on stale webhook (>300s)", async () => {
      const staleTs = String(Math.floor(Date.now() / 1000) - 400)
      const rawData = JSON.stringify({ event: "charge.success" })
      const signature = crypto
        .createHmac("sha256", webhookSecret)
        .update(`${staleTs}.${rawData}`)
        .digest("hex")

      await expect(
        provider.getWebhookActionAndData({
          headers: {
            "x-gateway-timestamp": staleTs,
            "x-gateway-signature": signature,
          },
          rawData,
        })
      ).rejects.toThrow("stale webhook")
    })
  })
})
