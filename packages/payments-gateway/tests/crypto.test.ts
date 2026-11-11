import { describe, expect, it } from "vitest"
import { computeWebhookSignature, sha256Hex, vendorSecret } from "../src/services/crypto"

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
})
