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
/**
 * Storefront layout designs selectable from Settings → Storefront.
 *
 * `minimal` is the original default look. The nine `aurora`…`pop` entries are
 * the switchable high-end layouts: each one rearranges the same homepage
 * sections (hero, showcase, featured, arrivals, collection rails) and renders
 * its own product-card shape, palette, and motion.
 *
 * `editorial`, `bold`, and `classic` are legacy values kept so tenants that
 * saved them still validate; the storefront resolves them to the closest
 * modern layout (see `resolveLayoutId` in the storefront theme registry).
 */
export const storefrontThemePresetSchema = z.enum([
  "minimal",
  "editorial",
  "bold",
  "classic",
  "aurora",
  "luxe",
  "street",
  "brutal",
  "breeze",
  "ember",
  "terra",
  "chrome",
  "pop",
])

/** Layouts shown in the admin layout picker (legacy values hidden). */
export const STOREFRONT_LAYOUT_IDS = [
  "minimal",
  "aurora",
  "luxe",
  "street",
  "brutal",
  "breeze",
  "ember",
  "terra",
  "chrome",
  "pop",
] as const

export type StorefrontLayoutId = (typeof STOREFRONT_LAYOUT_IDS)[number]

/** Legacy preset values and the modern layout each one resolves to. */
export const LEGACY_PRESET_FALLBACKS: Record<string, StorefrontLayoutId> = {
  editorial: "luxe",
  bold: "street",
  classic: "terra",
}

/**
 * Display metadata for the Settings → Storefront layout picker.
 *
 * Kept in the shared config package so the admin extension and the dashboard
 * render identical names/taglines without duplicating the list.
 */
export const STOREFRONT_LAYOUT_META: Array<{
  id: StorefrontLayoutId
  name: string
  tagline: string
}> = [
  { id: "minimal", name: "Minimal", tagline: "The clean default look" },
  { id: "aurora", name: "Aurora", tagline: "Dreamy gradients & glow" },
  { id: "luxe", name: "Luxe Noire", tagline: "Dark editorial luxury" },
  { id: "street", name: "Streetline", tagline: "Bold urban energy" },
  { id: "brutal", name: "Brutalist", tagline: "Raw poster-style edges" },
  { id: "breeze", name: "Breeze", tagline: "Airy coastal calm" },
  { id: "ember", name: "Ember", tagline: "Warm artisan craft" },
  { id: "terra", name: "Terra", tagline: "Earthy organic market" },
  { id: "chrome", name: "Chrome", tagline: "Futuristic glass tech" },
  { id: "pop", name: "Pop Candy", tagline: "Playful color clash" },
]
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

/**
 * The featured product card shown beside the homepage hero. Everything here
 * used to be hard-coded in the storefront, which meant staff could not change
 * the "Featured / New drop / Signature edition / Everyday carry" block without
 * a code deploy.
 */
const storefrontShowcaseSchema = z.object({
  enabled: z.boolean().default(true),
  label: z.string().default("Featured"),
  badge: z.string().default("New drop"),
  eyebrow: z.string().default("Signature edition"),
  title: z.string().default("Everyday carry"),
  price: z.string().default("$129"),
  imageUrl: z.string().default(""),
  href: z.string().default("/store"),
})

const homepageSettingsSchema = z.object({
  hero: storefrontHeroSchema,
  showcase: storefrontShowcaseSchema.default({
    enabled: true,
    label: "Featured",
    badge: "New drop",
    eyebrow: "Signature edition",
    title: "Everyday carry",
    price: "$129",
    imageUrl: "",
    href: "/store",
  }),
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

/**
 * Contact methods shown in the footer. `kind` is the selectable method
 * (WhatsApp, Facebook, X/Twitter, Instagram, TikTok, Email, or a custom
 * link); `label` is the display text and `url` the destination.
 *
 * `platform` is the legacy field (free-text social name). Old records that
 * only have `platform` keep working: the resolver below maps known platform
 * names onto kinds.
 */
export const storefrontContactKindSchema = z.enum([
  "whatsapp",
  "facebook",
  "twitter",
  "instagram",
  "tiktok",
  "email",
  "custom",
])

export type StorefrontContactKind =
  z.infer<typeof storefrontContactKindSchema>

const storefrontFooterSocialSchema = z.object({
  kind: storefrontContactKindSchema.default("custom"),
  label: z.string().default(""),
  url: z.string().default(""),
  platform: z.string().default(""),
})

export type StorefrontContactLink = {
  kind: StorefrontContactKind
  label: string
  href: string | undefined
}

const CONTACT_KIND_BY_PLATFORM: Record<string, StorefrontContactKind> = {
  whatsapp: "whatsapp",
  facebook: "facebook",
  twitter: "twitter",
  x: "twitter",
  instagram: "instagram",
  ig: "instagram",
  tiktok: "tiktok",
  email: "email",
  mail: "email",
}

/**
 * Resolves footer social records into renderable links. Handles legacy
 * records (only `platform` + `url`), builds `wa.me` links from bare
 * WhatsApp numbers and `mailto:` links for the email kind.
 */
export const resolveContactLinks = (
  socials: Array<{
    kind?: string | null
    label?: string | null
    url?: string | null
    platform?: string | null
  }> | null | undefined,
): StorefrontContactLink[] => {
  if (!Array.isArray(socials)) {
    return []
  }

  return socials.flatMap((social) => {
    const rawKind = (social.kind ?? "").toLowerCase()
    const rawPlatform = (social.platform ?? "").toLowerCase()
    const kind = (
      rawKind === "custom" || rawKind === "" ? null : rawKind
    ) as StorefrontContactKind | null
    const resolvedKind =
      kind ?? CONTACT_KIND_BY_PLATFORM[rawPlatform] ?? "custom"
    const url = (social.url ?? "").trim()
    const platformLabel = (social.platform ?? "").trim()
    const label =
      (social.label ?? "").trim() ||
      platformLabel ||
      resolvedKind.charAt(0).toUpperCase() + resolvedKind.slice(1)

    let href: string | undefined = url || undefined

    if (resolvedKind === "whatsapp" && url) {
      const digits = url.replace(/\D/g, "")
      if (digits) {
        href = `https://wa.me/${digits}`
      } else if (!/^https?:\/\//i.test(url)) {
        href = `https://${url}`
      }
    } else if (resolvedKind === "email" && url) {
      href = url.startsWith("mailto:") ? url : `mailto:${url}`
    } else if (
      url &&
      !/^https?:\/\//i.test(url) &&
      !url.startsWith("/") &&
      !url.startsWith("mailto:") &&
      !url.startsWith("tel:")
    ) {
      href = `https://${url}`
    }

    if (!href) {
      return []
    }

    return [{ kind: resolvedKind, label, href }]
  })
}

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
    showcase: {
      enabled: true,
      label: "Featured",
      badge: "New drop",
      eyebrow: "Signature edition",
      title: "Everyday carry",
      price: "$129",
      imageUrl: "",
      href: "/store",
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
