import type { StoreConfig } from "@lib/config-provider"

export type HeroContent = {
  eyebrow: string
  title: string
  heading: string
  description: string
  primaryCta: string
  secondaryCta: string
  imageUrl: string
}

export type ShowcaseContent = {
  label: string
  badge: string
  eyebrow: string
  title: string
  price: string
  imageUrl: string
  href: string
}

export type StatItem = {
  value: string
  label: string
}

export type AnnouncementContent = {
  text: string
  ctaLabel: string
  ctaHref: string
} | null

export type HomeContent = {
  storeName: string
  primaryColor: string
  logoUrl?: string
  hero: HeroContent
  showcase: ShowcaseContent
  stats: StatItem[]
  showHero: boolean
  showShowcase: boolean
  showFeatured: boolean
  announcement: AnnouncementContent
}

const fallbackHero: HeroContent = {
  eyebrow: "",
  title: "Modern essentials",
  heading: "Designed to feel as good as it looks.",
  description:
    "Discover elevated products for everyday rituals, curated with premium quality, practical design, and next-level comfort.",
  primaryCta: "Shop now",
  secondaryCta: "Learn more",
  imageUrl: "",
}

const fallbackShowcase: ShowcaseContent = {
  label: "Featured",
  badge: "New drop",
  eyebrow: "Signature edition",
  title: "Everyday carry",
  price: "$129",
  imageUrl: "",
  href: "/store",
}

/**
 * Normalises live storefront settings into the content every layout consumes.
 * Same words, sections and toggles for all nine layouts — each layout just
 * arranges them differently. Defaults mirror the original homepage so a store
 * with empty settings still looks complete.
 */
export function resolveHomeContent(config: StoreConfig): HomeContent {
  const settings = config.settings
  const hero = { ...fallbackHero, ...settings?.homepage?.hero }
  const showcase = { ...fallbackShowcase, ...settings?.homepage?.showcase }
  const stats = settings?.homepage?.stats ?? []

  const heroEnabled = settings?.homepage?.hero?.enabled ?? true
  const layoutHeroEnabled = settings?.layout?.homepageHeroEnabled ?? true
  const showcaseEnabled = settings?.homepage?.showcase?.enabled ?? true
  const featuredEnabled = settings?.homepage?.featuredEnabled ?? true
  const layoutFeaturedEnabled =
    settings?.layout?.homepageFeaturedEnabled ?? true

  const features = settings?.features
  const announcementText = features?.announcementBarText?.trim() ?? ""

  return {
    storeName: config.storeName,
    primaryColor: config.primaryColor,
    logoUrl: config.logoUrl,
    hero,
    showcase,
    stats,
    showHero: heroEnabled && layoutHeroEnabled,
    showShowcase: heroEnabled && layoutHeroEnabled && showcaseEnabled,
    showFeatured: featuredEnabled && layoutFeaturedEnabled,
    announcement:
      features?.announcementBarEnabled && announcementText
        ? {
            text: announcementText,
            ctaLabel: features?.announcementBarCtaLabel?.trim() ?? "",
            ctaHref: features?.announcementBarCtaHref?.trim() || "/store",
          }
        : null,
  }
}
