import { describe, expect, it } from "vitest"

import {
  DEFAULT_STOREFRONT_NAME,
  storefrontSettingsSchema,
  normalizeStorefrontSettings,
  storefrontSettingsFromMetadata,
  storefrontSettingsToMetadata,
  type StorefrontSettings,
} from "../index"

describe("storefront settings", () => {
  it("fills every section with defaults when nothing is provided", () => {
    const settings = normalizeStorefrontSettings(null)

    expect(settings.version).toBe(1)
    expect(settings.brand.name).toBe("Flowcheq Commerce")
    expect(settings.brand.primaryColor).toBe("#5B4FF9")
    expect(settings.theme.mode).toBe("light")
    expect(settings.layout.headerStyle).toBe("centered")
    expect(settings.features.showSearch).toBe(true)
    expect(settings.footer.poweredBy).toBe(true)
  })

  it("parses a full storefront settings payload", () => {
    const settings = storefrontSettingsSchema.parse({
      version: 1,
      brand: {
        name: "Acme Supply",
        tagline: "Everyday goods",
        description: "Curated goods for busy homes.",
        vendorName: "Acme Ltd.",
        logoUrl: "",
        faviconUrl: "",
        primaryColor: "#123456",
        accentColor: "#654321",
        fontFamily: "serif",
        cornerRadius: "lg",
      },
      theme: { mode: "dark", preset: "bold" },
      layout: { headerStyle: "split", footerStyle: "extended" },
      homepage: { hero: { enabled: false }, featuredEnabled: false },
      navigation: { links: [{ label: "About", href: "/about" }] },
      features: { whatsappEnabled: true, whatsappNumber: "2348000000000" },
      footer: { contact: { email: "hi@acme.shop" } },
      seo: { defaultTitle: "Acme Supply", titleTemplate: "%s - {store}" },
    })

    expect(settings.brand.name).toBe("Acme Supply")
    expect(settings.theme.preset).toBe("bold")
    expect(settings.homepage.hero.enabled).toBe(false)
    expect(settings.features.whatsappNumber).toBe("2348000000000")
  })

  it("merges nested storefront metadata over defaults", () => {
    const settings = normalizeStorefrontSettings({
      metadata: {
        storefront: {
          brand: { name: "Acme Supply", primaryColor: "#abcdef" },
          features: { showSearch: false },
        },
      },
    })

    expect(settings.brand.name).toBe("Acme Supply")
    expect(settings.brand.primaryColor).toBe("#abcdef")
    expect(settings.features.showSearch).toBe(false)
    expect(settings.theme.mode).toBe("light")
  })

  it("falls back to legacy metadata keys when nested storefront is absent", () => {
    const settings = normalizeStorefrontSettings({
      metadata: {
        store_name: "Legacy Store",
        brand_logo_url: "https://cdn.example.com/logo.png",
        brand_primary_color: "#111111",
      },
    })

    expect(settings.brand.name).toBe("Legacy Store")
    expect(settings.brand.logoUrl).toBe("https://cdn.example.com/logo.png")
    expect(settings.brand.primaryColor).toBe("#111111")
  })

  it("uses the brand name option as a final fallback", () => {
    const settings = normalizeStorefrontSettings({}, { brandName: "Flowcheq" })

    expect(settings.brand.name).toBe("Flowcheq")
    expect(DEFAULT_STOREFRONT_NAME).toBe("Flowcheq Commerce")
  })

  it("round trips settings into store metadata", () => {
    const settings: StorefrontSettings = normalizeStorefrontSettings({
      metadata: { storefront: { brand: { name: "Acme" } } },
    })

    const metadata = storefrontSettingsToMetadata(settings)
    const parsed = storefrontSettingsFromMetadata({
      metadata: metadata as Record<string, unknown>,
    })

    expect(parsed.brand.name).toBe("Acme")
  })
})
