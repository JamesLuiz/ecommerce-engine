import { describe, expect, it } from "vitest"

import { RESERVED_SLUGS, TenantConfig } from "../index"

const validConfig = {
  slug: "acme",
  businessName: "Acme Coffee",
  ownerEmail: "owner@acme.com",
  plan: "starter",
}

describe("TenantConfig", () => {
  it("accepts a valid slug", () => {
    const result = TenantConfig.safeParse({ ...validConfig, slug: "acme-store" })

    expect(result.success).toBe(true)
  })

  it("rejects uppercase slugs", () => {
    const result = TenantConfig.safeParse({ ...validConfig, slug: "Acme" })

    expect(result.success).toBe(false)
  })

  it("rejects slugs shorter than 3 characters", () => {
    const result = TenantConfig.safeParse({ ...validConfig, slug: "ab" })

    expect(result.success).toBe(false)
  })

  it("rejects slugs with leading or trailing hyphens", () => {
    const result = TenantConfig.safeParse({ ...validConfig, slug: "-acme" })

    expect(result.success).toBe(false)
  })

  it("rejects reserved slugs", () => {
    const reserved = RESERVED_SLUGS[0]

    const result = TenantConfig.safeParse({ ...validConfig, slug: reserved })

    expect(result.success).toBe(false)
  })

  it("rejects an invalid plan", () => {
    const result = TenantConfig.safeParse({ ...validConfig, plan: "premium" })

    expect(result.success).toBe(false)
  })

  it("applies defaults for optional fields", () => {
    const result = TenantConfig.safeParse(validConfig)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.currency).toBe("USD")
      expect(result.data.region).toBe("ng")
      expect(result.data.brand.primaryColor).toBe("#111111")
      expect(result.data.features.multiVendor).toBe(false)
      expect(result.data.features.paystack).toBe(true)
    }
  })

  it("allows a custom domain", () => {
    const result = TenantConfig.safeParse({ ...validConfig, customDomain: "shop.example.com" })

    expect(result.success).toBe(true)
  })
})
