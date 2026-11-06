import { describe, expect, it } from "vitest"

import {
  RESERVED_SLUGS,
  TenantConfig,
  type TenantConfig as TenantConfigType,
} from "../src/index"

const base: TenantConfigType = {
  slug: "acme-store",
  businessName: "Acme Store",
  ownerEmail: "owner@acme.test",
  plan: "starter",
  currency: "USD",
  region: "ng",
  brand: { primaryColor: "#111111" },
  features: { multiVendor: false, paystack: true, stripe: false },
}

describe("TenantConfig slug validation", () => {
  it.each(["A", "admin", "x_y", "-bad", "ab", "bad-", "Bad-Slug", "x".repeat(33)])(
    "rejects %j",
    (slug) => {
      expect(TenantConfig.safeParse({ ...base, slug }).success).toBe(false)
    }
  )

  it.each(RESERVED_SLUGS)("rejects reserved slug %j", (slug) => {
    expect(TenantConfig.safeParse({ ...base, slug }).success).toBe(false)
  })

  it.each(["acme-store", "shop123", "a-b", "x1y"])("accepts %j", (slug) => {
    expect(TenantConfig.safeParse({ ...base, slug }).success).toBe(true)
  })
})

describe("TenantConfig", () => {
  it("applies defaults for omissions", () => {
    const parsed = TenantConfig.parse({
      slug: "acme-store",
      businessName: "Acme Store",
      ownerEmail: "owner@acme.test",
      plan: "growth",
    })

    expect(parsed.currency).toBe("USD")
    expect(parsed.region).toBe("ng")
    expect(parsed.brand).toEqual({ primaryColor: "#111111" })
    expect(parsed.features).toEqual({
      multiVendor: false,
      paystack: true,
      stripe: false,
    })
  })

  it("rejects invalid email, plan, currency and brand colour", () => {
    expect(
      TenantConfig.safeParse({ ...base, ownerEmail: "not-an-email" }).success
    ).toBe(false)
    expect(TenantConfig.safeParse({ ...base, plan: "free" }).success).toBe(
      false
    )
    expect(TenantConfig.safeParse({ ...base, currency: "US" }).success).toBe(
      false
    )
    expect(
      TenantConfig.safeParse({
        ...base,
        brand: { primaryColor: "red" },
      }).success
    ).toBe(false)
  })
})
