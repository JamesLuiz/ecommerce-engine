import { z } from "zod"

/**
 * Shared storefront settings schema for Flowcheq tenants.
 *
 * The Medusa admin stores these values in the store's `metadata.storefront`
 * object so every tenant can shape their own storefront (brand, theme, layout,
 * homepage, navigation, features, footer, SEO) without touching the code.
 */

export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/

export const storefrontFontFamilySchema = z.enum(["sans", "serif", "mono"])
export const storefrontCornerRadiusSchema = z.enum(["none", "sm", "md", "lg"])
export const storefrontThemeModeSchema = z.enum(["light", "dark", "system"])
export const storefrontThemePresetSchema = z.enum([
  "minimal",
  "editorial",
  "bold",
  "classic",
])
export const storefrontHeaderStyleSchema = z.enum([
  "centered",
  "split",
  "minimal",
])
export const storefrontFooterStyleSchema = z.enum(["compact", "extended"])
export const storefrontSocialPlatformSchema = z.enum([
  "instagram",
  "tiktok",
  "twitter",
  "facebook",
  "youtube",
  "linkedin",
  "github",
])

const colorSchema = z
  .string()
  .regex(HEX_COLOR_REGEX, "Expected a hex color like #111111")
  .default("#111111")

const storefrontHeroSchema = z.object({
  enabled: z.boolean().default(true),
  eyebrow: z.string().default(""),
  title: z.string().default(""),
  heading: z.string().default(""),
  description: z.string().default(""),
  primaryCta: z.string().default("Shop now"),
  secondaryCta: z.string().default("Learn more"),
  imageUrl: z.string().default(""),
})

const homepageSettingsSchema = z.object({
  hero: storefrontHeroSchema,
  featuredEnabled: z.boolean().default(true),
  stats: z
    .array(
      z.object({
        value: z.string().default(""),
        label: z.string().default(""),
      }),
    )
    .default([]),
})

const storefrontFeatureFlagsSchema = z.object({
  announcementBarEnabled: z.boolean().default(true),
  announcementBarText: z.string().default(""),
  announcementBarCtaLabel: z.string().default(""),
  announcementBarCtaHref: z.string().default("/"),
  showSearch: z.boolean().default(true),
  showAccount: z.boolean().default(true),
  showLocaleSelector: z.boolean().default(true),
  showCountrySelector: z.boolean().default(true),
  whatsappEnabled: z.boolean().default(false),
  whatsappNumber: z.string().default(""),
  newsletterEnabled: z.boolean().default(false),
})

const storefrontFooterContactSchema = z.object({
  email: z.string().default(""),
  phone: z.string().default(""),
  address: z.string().default(""),
  hours: z.string().default(""),
})

const storefrontFooterSocialSchema = z.object({
  platform: storefrontSocialPlatformSchema,
  url: z.string().default(""),
})

const storefrontFooterLegalSchema = z.object({
  label: z.string().min(1).max(120),
  href: z.string().min(1).max(500),
})

const storefrontFooterSchema = z.object({
  contact: storefrontFooterContactSchema.default({
    email: "",
    phone: "",
    address: "",
    hours: "",
  }),
  socials: z.array(storefrontFooterSocialSchema).default([]),
  legal: z.array(storefrontFooterLegalSchema).default([]),
  copyright: z.string().default(""),
  poweredBy: z.boolean().default(true),
})

const storefrontSeoSchema = z.object({
  defaultTitle: z.string().default(""),
  titleTemplate: z.string().default("%s | {store}"),
  description: z.string().default(""),
  keywords: z.array(z.string()).default([]),
  ogImageUrl: z.string().default(""),
})

export const storefrontSettingsSchema = z.object({
  version: z.number().int().default(1),
  brand: z.object({
    name: z.string().trim().min(1).max(120).default("Flowcheq Commerce"),
    tagline: z.string().default(""),
    description: z.string().default(""),
    vendorName: z.string().default(""),
    logoUrl: z.string().default(""),
    faviconUrl: z.string().default(""),
    primaryColor: colorSchema,
    accentColor: colorSchema,
    fontFamily: storefrontFontFamilySchema,
    cornerRadius: storefrontCornerRadiusSchema,
  }).default({
    name: "Flowcheq Commerce",
    tagline: "",
    description: "",
    vendorName: "",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#5B4FF9",
    accentColor: "#111111",
    fontFamily: "sans",
    cornerRadius: "md",
  }),
  theme: z.object({
    mode: storefrontThemeModeSchema.default("light"),
    preset: storefrontThemePresetSchema.default("minimal"),
  }).default({
    mode: "light",
    preset: "minimal",
  }),
  layout: z.object({
    headerStyle: storefrontHeaderStyleSchema.default("centered"),
    footerStyle: storefrontFooterStyleSchema.default("compact"),
    homepageHeroEnabled: z.boolean().default(true),
    homepageFeaturedEnabled: z.boolean().default(true),
  }).default({
    headerStyle: "centered",
    footerStyle: "compact",
    homepageHeroEnabled: true,
    homepageFeaturedEnabled: true,
  }),
  homepage: homepageSettingsSchema.default({
    hero: {
      enabled: true,
      eyebrow: "",
      title: "",
      heading: "",
      description: "",
      primaryCta: "Shop now",
      secondaryCta: "Learn more",
      imageUrl: "",
    },
    featuredEnabled: true,
    stats: [],
  }),
  navigation: z.object({
    links: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(60),
          href: z.string().trim().min(1).max(500),
        }),
      )
      .default([]),
  }).default({ links: [] }),
  features: storefrontFeatureFlagsSchema.default({
    announcementBarEnabled: true,
    announcementBarText: "",
    announcementBarCtaLabel: "",
    announcementBarCtaHref: "/",
    showSearch: true,
    showAccount: true,
    showLocaleSelector: true,
    showCountrySelector: true,
    whatsappEnabled: false,
    whatsappNumber: "",
    newsletterEnabled: false,
  }),
  footer: storefrontFooterSchema.default({
    contact: {
      email: "",
      phone: "",
      address: "",
      hours: "",
    },
    socials: [],
    legal: [],
    copyright: "",
    poweredBy: true,
  }),
  seo: storefrontSeoSchema.default({
    defaultTitle: "",
    titleTemplate: "%s | {store}",
    description: "",
    keywords: [],
    ogImageUrl: "",
  }),
})

export type StorefrontSettings = z.infer<typeof storefrontSettingsSchema>

export const STOREFRONT_SETTINGS_METADATA_KEY = "storefront"

export const STOREFRONT_BRAND_METADATA_KEYS = {
  name: "store_name",
  handle: "store_handle",
  description: "store_description",
  vendorName: "vendor_name",
  logoUrl: "brand_logo_url",
  primaryColor: "brand_primary_color",
} as const

export const DEFAULT_STOREFRONT_NAME = "Flowcheq Commerce"
const DEFAULT_BRAND_PRIMARY = "#5B4FF9"

const defaultStorefrontSettings = (): StorefrontSettings =>
  storefrontSettingsSchema.parse({})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const readString = (
  source: Record<string, unknown> | undefined,
  key: string,
  fallback = "",
): string => {
  if (!source) {
    return fallback
  }

  const value = source[key]
  return typeof value === "string" ? value : fallback
}

const deepMerge = (target: unknown, source: unknown): unknown => {
  if (isRecord(source) && isRecord(target)) {
    const result: Record<string, unknown> = { ...target }

    for (const [key, value] of Object.entries(source)) {
      result[key] = value === undefined ? result[key] : deepMerge(result[key], value)
    }

    return result
  }

  return source === undefined ? target : source
}

export const normalizeStorefrontSettings = (
  input: unknown,
  options?: { brandName?: string | null },
): StorefrontSettings => {
  const source = isRecord(input) ? input : {}
  const metadataSource = isRecord(source.metadata) ? source.metadata : source
  const metadata = isRecord(metadataSource) ? metadataSource : {}
  const nestedSource = isRecord(metadata[STOREFRONT_SETTINGS_METADATA_KEY])
    ? (metadata[STOREFRONT_SETTINGS_METADATA_KEY] as Record<string, unknown>)
    : {}

  const merged = storefrontSettingsSchema.parse(deepMerge(defaultStorefrontSettings(), nestedSource))
  const settings = merged as StorefrontSettings
  const legacySource = isRecord(metadata) ? metadata : {}
  const brandSource = isRecord(nestedSource) ? nestedSource : {}

  const next: StorefrontSettings = {
    ...settings,
    brand: {
      ...settings.brand,
      name:
        readString(brandSource, "name") ||
        readString(legacySource, STOREFRONT_BRAND_METADATA_KEYS.name) ||
        options?.brandName ||
        settings.brand.name,
      tagline:
        readString(brandSource, "tagline") ||
        readString(legacySource, "storefront_tagline") ||
        settings.brand.tagline,
      description:
        readString(brandSource, "description") ||
        readString(legacySource, STOREFRONT_BRAND_METADATA_KEYS.description) ||
        settings.brand.description,
      vendorName:
        readString(brandSource, "vendorName") ||
        readString(legacySource, STOREFRONT_BRAND_METADATA_KEYS.vendorName) ||
        settings.brand.vendorName,
      logoUrl:
        readString(brandSource, "logoUrl") ||
        readString(legacySource, STOREFRONT_BRAND_METADATA_KEYS.logoUrl) ||
        settings.brand.logoUrl,
      faviconUrl:
        readString(brandSource, "faviconUrl") ||
        readString(legacySource, "storefront_favicon_url") ||
        settings.brand.faviconUrl,
      primaryColor:
        readString(brandSource, "primaryColor") ||
        readString(legacySource, STOREFRONT_BRAND_METADATA_KEYS.primaryColor) ||
        settings.brand.primaryColor,
      accentColor: settings.brand.accentColor,
      fontFamily: settings.brand.fontFamily,
      cornerRadius: settings.brand.cornerRadius,
    },
  }

  return next
}

export const storefrontSettingsFromMetadata = (
  store: { metadata?: Record<string, unknown> | null } | null,
  options?: { brandName?: string | null },
): StorefrontSettings => normalizeStorefrontSettings(store?.metadata, options)

export const storefrontSettingsToMetadata = (
  settings: StorefrontSettings,
): Record<string, unknown> => ({
  storefront: {
    version: settings.version,
    brand: {
      name: settings.brand.name,
      tagline: settings.brand.tagline,
      description: settings.brand.description,
      vendorName: settings.brand.vendorName,
      logoUrl: settings.brand.logoUrl,
      faviconUrl: settings.brand.faviconUrl,
      primaryColor: settings.brand.primaryColor,
      accentColor: settings.brand.accentColor,
      fontFamily: settings.brand.fontFamily,
      cornerRadius: settings.brand.cornerRadius,
    },
    theme: settings.theme,
    layout: settings.layout,
    homepage: settings.homepage,
    navigation: settings.navigation,
    features: settings.features,
    footer: settings.footer,
    seo: settings.seo,
  },
})
