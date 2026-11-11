import { describe, it, expect, vi, beforeEach } from "vitest"
import { createHmac } from "node:crypto"

// Set environment before imports
process.env.PAYSTACK_SECRET_KEY = "sk_test_mocksecret12345"
process.env.WEBHOOK_SIGNING_ROOT = "whsec_root_secret_99999"
process.env.REFUNDS_ENABLED = "true"

const { mockDb, mockQueue, mockRedis } = vi.hoisted(() => ({
  mockDb: {
    unsafe: vi.fn(),
  },
  mockQueue: {
    add: vi.fn().mockResolvedValue({ id: "job_1" }),
  },
  mockRedis: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

vi.mock("../src/db.js", () => ({ db: mockDb }))
vi.mock("../src/jobs/queue.js", () => ({
  webhookForwardQueue: mockQueue,
  reconcileQueue: { add: vi.fn() },
}))
vi.mock("../src/redis.js", () => ({ redis: mockRedis }))

import { app } from "../src/app.js"
import { sha256Hex } from "../src/services/crypto.js"

describe("Gateway Payments API & Webhooks", () => {
  const vendorId = "11111111-1111-1111-1111-111111111111"
  const rawToken = "vgw_test_token_1234567890abcdef"
  const tokenHash = sha256Hex(rawToken)

  const activeVendor = {
    id: vendorId,
    slug: "acme",
    name: "Acme Store",
    status: "active",
    token_hash: tokenHash,
    webhook_url: "https://acme.example.com/hooks/payment/paystack-gateway_paystack-gateway",
    allowed_origins: ["https://acme.example.com"],
    currency: "NGN",
    created_at: new Date(),
    updated_at: new Date(),
  }

  const activeSettlement = {
    vendor_id: vendorId,
    bank_code: "058",
    bank_name: "Guaranty Trust Bank",
    account_number_last4: "6789",
    account_name: "ACME CORP",
    subaccount_code: "ACCT_test_subaccount_1",
    status: "active",
    verified_at: new Date(),
    updated_at: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Paystack Webhooks (/webhooks/paystack)", () => {
    it("rejects request missing x-paystack-signature with 401", async () => {
      const res = await app.request("/webhooks/paystack", {
        method: "POST",
        body: JSON.stringify({ event: "charge.success" }),
      })
      expect(res.status).toBe(401)
      const body = (await res.json()) as any
      expect(body.error.code).toBe("invalid_signature")
    })

    it("rejects request with invalid signature with 401", async () => {
      const rawBody = JSON.stringify({ event: "charge.success" })
      const res = await app.request("/webhooks/paystack", {
        method: "POST",
        headers: {
          "x-paystack-signature": "bad_signature_hex",
          "content-type": "application/json",
        },
        body: rawBody,
      })
      expect(res.status).toBe(401)
    })

    it("accepts valid signature, updates transaction, and enqueues forward job", async () => {
      const payload = {
        event: "charge.success",
        data: {
          id: 998877,
          reference: "acme_ref_123",
          amount: 500000,
          currency: "NGN",
          channel: "card",
          fees: 7500,
          paid_at: "2026-03-30T12:00:00Z",
          metadata: {
            vendor_id: vendorId,
          },
        },
      }
      const rawBody = JSON.stringify(payload)
      const validSig = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
        .update(rawBody)
        .digest("hex")

      mockDb.unsafe.mockImplementation(async (query: string) => {
        if (query.includes("select * from webhook_events where dedupe_key")) {
          return []
        }
        if (query.includes("select * from vendors where id = $1")) {
          return [activeVendor]
        }
        if (query.includes("select * from transactions where vendor_id = $1 and reference = $2")) {
          return [
            {
              reference: "acme_ref_123",
              vendor_id: vendorId,
              amount: 500000,
              currency: "NGN",
              status: "pending",
              fees: null,
              channel: null,
            },
          ]
        }
        if (query.includes("insert into webhook_events")) {
          return [{ id: "wh_event_1" }]
        }
        if (query.includes("update transactions set")) {
          return [{ reference: "acme_ref_123", status: "success" }]
        }
        return []
      })

      const res = await app.request("/webhooks/paystack", {
        method: "POST",
        headers: {
          "x-paystack-signature": validSig,
          "content-type": "application/json",
        },
        body: rawBody,
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as any
      expect(body.status).toBe("received")
      expect(body.event_id).toBe("wh_event_1")

      expect(mockQueue.add).toHaveBeenCalledWith(
        "forward",
        expect.objectContaining({
          vendorId,
          webhookUrl: activeVendor.webhook_url,
          rawBody,
        }),
      )
    })

    it("deduplicates identical raw body and returns 200 without second forward", async () => {
      const rawBody = JSON.stringify({ event: "charge.success", id: 1 })
      const validSig = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
        .update(rawBody)
        .digest("hex")

      mockDb.unsafe.mockImplementation(async (query: string) => {
        if (query.includes("select * from webhook_events where dedupe_key")) {
          return [{ id: "existing_evt", dedupe_key: "abc" }]
        }
        return []
      })

      const res = await app.request("/webhooks/paystack", {
        method: "POST",
        headers: {
          "x-paystack-signature": validSig,
        },
        body: rawBody,
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as any
      expect(body.status).toBe("ignored")
      expect(body.reason).toBe("duplicate")
      expect(mockQueue.add).not.toHaveBeenCalled()
    })

    it("marks as ignored when vendor cannot be resolved and returns 200", async () => {
      const payload = {
        event: "charge.success",
        data: { reference: "unknown_ref_999" },
      }
      const rawBody = JSON.stringify(payload)
      const validSig = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
        .update(rawBody)
        .digest("hex")

      mockDb.unsafe.mockImplementation(async (query: string) => {
        if (query.includes("select * from webhook_events where dedupe_key")) {
          return []
        }
        if (query.includes("select vendor_id from transactions")) {
          return []
        }
        if (query.includes("insert into webhook_events")) {
          return [{ id: "wh_ignored_1" }]
        }
        return []
      })

      const res = await app.request("/webhooks/paystack", {
        method: "POST",
        headers: {
          "x-paystack-signature": validSig,
        },
        body: rawBody,
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as any
      expect(body.status).toBe("ignored")
      expect(body.reason).toBe("unknown_vendor")
      expect(mockQueue.add).not.toHaveBeenCalled()
    })
  })

  describe("Transaction Initialize (/v1/transactions/initialize)", () => {
    it("rejects suspended vendor with 403", async () => {
      mockDb.unsafe.mockImplementation(async (query: string) => {
        if (query.includes("select * from vendors where token_hash")) {
          return [{ ...activeVendor, status: "suspended" }]
        }
        return []
      })

      const res = await app.request("/v1/transactions/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          amount: 500000,
          currency: "NGN",
          email: "buyer@example.com",
          external_ref: "payses_123",
          callback_url: "https://acme.example.com/checkout/callback",
        }),
      })

      expect(res.status).toBe(403)
      const body = (await res.json()) as any
      expect(body.error.code).toBe("vendor_suspended")
    })

    it("rejects missing settlement with 409 settlement_not_configured", async () => {
      mockDb.unsafe.mockImplementation(async (query: string) => {
        if (query.includes("select * from vendors where token_hash")) {
          return [activeVendor]
        }
        if (query.includes("select * from settlements where vendor_id = $1")) {
          return []
        }
        return []
      })

      const res = await app.request("/v1/transactions/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          amount: 500000,
          currency: "NGN",
          email: "buyer@example.com",
          external_ref: "payses_123",
          callback_url: "https://acme.example.com/checkout/callback",
        }),
      })

      expect(res.status).toBe(409)
      const body = (await res.json()) as any
      expect(body.error.code).toBe("settlement_not_configured")
    })

    it("rejects callback_url with unpermitted origin with 400", async () => {
      mockDb.unsafe.mockImplementation(async (query: string) => {
        if (query.includes("select * from vendors where token_hash")) {
          return [activeVendor]
        }
        if (query.includes("select * from settlements where vendor_id = $1")) {
          return [activeSettlement]
        }
        return []
      })

      const res = await app.request("/v1/transactions/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          amount: 500000,
          currency: "NGN",
          email: "buyer@example.com",
          external_ref: "payses_123",
          callback_url: "https://attacker.evil.com/callback",
        }),
      })

      expect(res.status).toBe(400)
      const body = (await res.json()) as any
      expect(body.error.code).toBe("invalid_callback_origin")
    })
  })

  describe("Transaction Verify (/v1/transactions/verify/:reference)", () => {
    it("returns 404 for cross-vendor transaction query", async () => {
      mockDb.unsafe.mockImplementation(async (query: string) => {
        if (query.includes("select * from vendors where token_hash")) {
          return [activeVendor]
        }
        if (query.includes("select * from transactions where vendor_id = $1 and reference = $2")) {
          return [] // Not found for this vendor
        }
        return []
      })

      const res = await app.request("/v1/transactions/verify/other_vendor_ref", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${rawToken}`,
        },
      })

      expect(res.status).toBe(404)
    })
  })

  describe("Accounts Resolve (/v1/accounts/resolve)", () => {
    it("validates 10-digit account number", async () => {
      mockDb.unsafe.mockImplementation(async (query: string) => {
        if (query.includes("select * from vendors where token_hash")) {
          return [activeVendor]
        }
        return []
      })

      const res = await app.request("/v1/accounts/resolve", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bank_code: "058",
          account_number: "12345",
        }),
      })

      expect(res.status).toBe(400)
      const body = (await res.json()) as any
      expect(body.error.code).toBe("validation_error")
    })
  })
})
