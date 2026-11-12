import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  computeWebhookSignature,
  sha256Hex,
  vendorSecret,
  webhookSecretFor,
} from "../src/services/crypto"

describe("crypto helpers", () => {
  it("hashes with sha256 hex", () => {
    expect(sha256Hex("abc")).toHaveLength(64)
  })

  it("derives a vendor secret from the signing root", () => {
    const secret = vendorSecret("vendor-1", "root-secret")

    expect(secret).toHaveLength(64)
  })

  it("signs gateway payloads with timestamp and raw body", () => {
    const signature = computeWebhookSignature("secret", "1710000000", '{"event":"charge"}')

    expect(signature).toHaveLength(64)
  })

  describe("webhookSecretFor", () => {
    const previousRoot = process.env.WEBHOOK_SIGNING_ROOT

    beforeAll(() => {
      process.env.WEBHOOK_SIGNING_ROOT = "root-secret"
    })

    afterAll(() => {
      if (previousRoot === undefined) {
        delete process.env.WEBHOOK_SIGNING_ROOT
      } else {
        process.env.WEBHOOK_SIGNING_ROOT = previousRoot
      }
    })

    it("matches the secret the forwarder signs with", () => {
      expect(webhookSecretFor("vendor-1")).toBe(vendorSecret("vendor-1", "root-secret"))
    })

    it("is stable per vendor and distinct across vendors", () => {
      expect(webhookSecretFor("vendor-1")).toBe(webhookSecretFor("vendor-1"))
      expect(webhookSecretFor("vendor-1")).not.toBe(webhookSecretFor("vendor-2"))
    })
  })
})
