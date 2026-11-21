import { afterEach, describe, expect, it } from "vitest"
import { TenantConfig } from "@flowcheq/tenant-config"
import { originFrom, resolveStoreUrl, tenantAllowedOrigins } from "../steps"

const originalDomain = process.env.STORE_BASE_DOMAIN

afterEach(() => {
  if (originalDomain === undefined) {
    delete process.env.STORE_BASE_DOMAIN
  } else {
    process.env.STORE_BASE_DOMAIN = originalDomain
  }
})

const config = TenantConfig.parse({
  slug: "acme",
  businessName: "Acme Coffee",
  ownerEmail: "owner@acme.com",
  plan: "starter",
})

describe("tenant callback origins", () => {
  it("normalizes bare domains and wildcard patterns", () => {
    expect(originFrom("shop.example.com/checkout")).toBe("https://shop.example.com")
    expect(originFrom("https://*.example.com")).toBe("https://*.example.com")
    expect(originFrom("")).toBeNull()
  })

  it("uses a custom domain as the storefront URL when present", () => {
    process.env.STORE_BASE_DOMAIN = "example.com"

    expect(resolveStoreUrl("acme", config)).toBe("https://acme.example.com")
    expect(
      resolveStoreUrl("acme", { ...config, customDomain: "shop.acme.test" }),
    ).toBe("https://shop.acme.test")
  })

  it("includes generated, custom, and wildcard origins for gateway registration", () => {
    process.env.STORE_BASE_DOMAIN = "example.com"

    expect(
      tenantAllowedOrigins("acme", {
        ...config,
        customDomain: "https://shop.acme.test",
      }),
    ).toEqual([
      "https://shop.acme.test",
      "https://admin-acme.example.com",
      "https://*.example.com",
    ])
  })
})
