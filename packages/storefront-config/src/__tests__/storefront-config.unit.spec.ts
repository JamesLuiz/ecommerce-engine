import { describe, expect, it } from "vitest"

import {
  DEFAULT_STOREFRONT_NAME,
  LEGACY_PRESET_FALLBACKS,
  STOREFRONT_LAYOUT_IDS,
  storefrontSettingsSchema,
  normalizeStorefrontSettings,
  storefrontSettingsFromMetadata,
  storefrontSettingsToMetadata,
  resolveContactLinks,
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
 expect(settings.features.announcementBarStyle).toBe("standard")
 expect(settings.features.announcementBarText).toBe("Welcome to our store - new drops every week")
 expect(settings.homepage.hero.title).toBe("Modern essentials")
 expect(settings.homepage.stats.length).toBeGreaterThan(0)
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

  it("accepts every modern layout preset and exposes the layout picker ids", () => {
    for (const preset of STOREFRONT_LAYOUT_IDS) {
      const settings = storefrontSettingsSchema.parse({ theme: { preset } })
      expect(settings.theme.preset).toBe(preset)
    }

    expect(STOREFRONT_LAYOUT_IDS).toHaveLength(13)
    expect(STOREFRONT_LAYOUT_IDS).toContain("minimal")
    expect(STOREFRONT_LAYOUT_IDS).toContain("aurora")
    expect(STOREFRONT_LAYOUT_IDS).toContain("pop")
 expect(STOREFRONT_LAYOUT_IDS).toContain("air")
 expect(STOREFRONT_LAYOUT_IDS).toContain("titanium")
 expect(STOREFRONT_LAYOUT_IDS).toContain("liquid")
    expect(LEGACY_PRESET_FALLBACKS).toMatchObject({
      editorial: "luxe",
      bold: "street",
      classic: "terra",
    })
  })

 it("accepts announcement style and countdown end values", () => {
 for (const style of ["standard", "sale", "countdown"] as const) {
 const settings = storefrontSettingsSchema.parse({
 features: { announcementBarStyle: style, announcementBarCountdownEndsAt: "2030-01-01T00:00:00Z" },
 })
 expect(settings.features.announcementBarStyle).toBe(style)
 }
 const settings = storefrontSettingsSchema.parse({
 features: { announcementBarCountdownEndsAt: "48" },
 })
 expect(settings.features.announcementBarCountdownEndsAt).toBe("48")
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

  it("resolves footer contact methods with per-kind links", () => {
    const links = resolveContactLinks([
      { kind: "whatsapp", label: "Chat", url: "+234 800 000 0000" },
      { kind: "email", label: "", url: "hi@acme.shop" },
      { kind: "instagram", label: "", url: "instagram.com/acme" },
      { kind: "custom", label: "Blog", url: "/blog" },
    ])

    expect(links).toHaveLength(4)
    expect(links[0]).toMatchObject({
      kind: "whatsapp",
      href: "https://wa.me/2348000000000",
    })
    expect(links[1]).toMatchObject({
      kind: "email",
      href: "mailto:hi@acme.shop",
    })
    expect(links[2]?.href).toBe("https://instagram.com/acme")
    expect(links[3]).toMatchObject({ kind: "custom", href: "/blog" })
  })

  it("maps legacy platform records onto contact kinds", () => {
    const links = resolveContactLinks([
      { platform: "instagram", url: "https://instagram.com/acme" },
      { platform: "ig", url: "acme" },
      { platform: "", url: "" },
    ])

    expect(links).toHaveLength(2)
    expect(links[0]).toMatchObject({
      kind: "instagram",
      label: "instagram",
    })
    expect(links[1]).toMatchObject({ kind: "instagram" })
  })

  it("accepts the new contact method shape in the settings schema", () => {
    const settings = storefrontSettingsSchema.parse({
      footer: {
        socials: [{ kind: "whatsapp", label: "Chat", url: "2348000000000" }],
      },
    })

    expect(settings.footer.socials[0]).toMatchObject({ kind: "whatsapp" })
  })
})
