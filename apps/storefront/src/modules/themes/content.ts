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

export type AnnouncementStyle = "standard" | "sale" | "countdown"

export type AnnouncementContent = {
  text: string
  ctaLabel: string
  ctaHref: string
  style: AnnouncementStyle
  countdownEndsAt: string
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
  eyebrow: "New season",
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

const fallbackStats: StatItem[] = [
  { value: "4.9", label: "Avg rating" },
  { value: "2k+", label: "Happy customers" },
  { value: "48h", label: "Fast delivery" },
]

/**
 * Normalises live storefront settings into the content every layout consumes.
 * Same words, sections and toggles for all layouts — each layout just
 * arranges them differently. Defaults mirror the settings schema so a store
 * with empty settings still looks complete and shows owners exactly which
 * field to edit in Settings → Storefront.
 */
export function resolveHomeContent(config: StoreConfig): HomeContent {
  const settings = config.settings
  const hero = { ...fallbackHero, ...settings?.homepage?.hero }
  const showcase = { ...fallbackShowcase, ...settings?.homepage?.showcase }
  const stats =
    settings?.homepage?.stats && settings.homepage.stats.length > 0
      ? settings.homepage.stats
      : fallbackStats

  const heroEnabled = settings?.homepage?.hero?.enabled ?? true
  const layoutHeroEnabled = settings?.layout?.homepageHeroEnabled ?? true
  const showcaseEnabled = settings?.homepage?.showcase?.enabled ?? true
  const featuredEnabled = settings?.homepage?.featuredEnabled ?? true
  const layoutFeaturedEnabled =
    settings?.layout?.homepageFeaturedEnabled ?? true

  const features = settings?.features
  const announcementText =
    features?.announcementBarText?.trim() ||
    "Welcome to our store - new drops every week"
  const announcementStyle =
    features?.announcementBarStyle === "sale" ||
    features?.announcementBarStyle === "countdown"
      ? features.announcementBarStyle
      : "standard"

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
      features?.announcementBarEnabled ?? true
        ? {
            text: announcementText,
            ctaLabel: features?.announcementBarCtaLabel?.trim() || "Shop now",
            ctaHref: features?.announcementBarCtaHref?.trim() || "/store",
            style: announcementStyle,
            countdownEndsAt:
              features?.announcementBarCountdownEndsAt?.trim() ?? "",
          }
        : null,
  }
}
