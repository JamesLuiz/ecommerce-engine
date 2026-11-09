import "server-only"
import { headers } from "next/headers"

import { getRuntimeConfig } from "@lib/runtime-config"

export type LandingPageStat = {
  value: string
  label: string
}

export type LandingPageConfig = {
  eyebrow: string
  title: string
  heading: string
  description: string
  primaryCta: string
  secondaryCta: string
  stats: LandingPageStat[]
}

export const STORE_NAME = getRuntimeConfig().storeName

export const DEFAULT_COUNTRY_CODE = getRuntimeConfig().defaultCountryCode

const configuredUrl = () => getRuntimeConfig().storeBaseUrl

const originFromHeaders = (get: (name: string) => string | null) => {
  const host = (get("x-forwarded-host") ?? get("host"))?.split(",")[0].trim()
  if (!host) {
    return undefined
  }
  const proto = get("x-forwarded-proto")?.split(",")[0].trim() || "https"
  return `${proto}://${host}`
}

export const getRequestOrigin = (request: Request): string =>
  configuredUrl() ||
  originFromHeaders((name) => request.headers.get(name)) ||
  new URL(request.url).origin

/** Origin for absolute URLs in server components (canonical, JSON-LD, OpenGraph). */
export const getSiteOrigin = async (): Promise<string> => {
  const configured = configuredUrl()
  if (configured) {
    return configured
  }
  const requestHeaders = await headers()
  return originFromHeaders((name) => requestHeaders.get(name)) || "http://localhost:8000"
}

export const listCountryCodes = (
  regions: { countries?: { iso_2?: string | null }[] | null }[]
): string[] =>
  regions.flatMap((region) =>
    (region.countries ?? [])
      .map((country) => country.iso_2?.toLowerCase())
      .filter((code): code is string => Boolean(code))
  )

export const getDefaultCountryCode = (
  regions: { countries?: { iso_2?: string | null }[] | null }[]
) => {
  const codes = listCountryCodes(regions)
  return codes.includes(DEFAULT_COUNTRY_CODE) ? DEFAULT_COUNTRY_CODE : codes[0]
}

export async function getLandingPageConfig(): Promise<LandingPageConfig> {
  const runtime = getRuntimeConfig()
  const baseName = runtime.storeName || "Store"

  const fallback: LandingPageConfig = {
    eyebrow: "ST",
    title: "Modern essentials",
    heading: "Designed to feel as good as it looks.",
    description: `Discover elevated products for everyday rituals, curated by ${baseName} with premium quality, practical design, and next-level comfort.`,
    primaryCta: "Shop now",
    secondaryCta: "Browse collection",
    stats: [
      { value: "4.9/5", label: "customer love" },
      { value: "48h", label: "dispatch" },
      { value: "3k+", label: "happy shoppers" },
    ],
  }

  try {
    const response = await fetch(`${runtime.backendUrl}/store`, {
      cache: "no-store",
      headers: {
        ...(runtime.publishableKey
          ? { "x-publishable-api-key": runtime.publishableKey }
          : {}),
      },
    })

    if (!response.ok) {
      return fallback
    }

    const payload = (await response.json()) as {
      store?: {
        metadata?: Record<string, string | number | boolean | null | undefined>
      }
    }

    const metadata = payload.store?.metadata ?? {}
    const pick = (key: string, value: string) => {
      const candidate = metadata[key]
      return typeof candidate === "string" && candidate.trim() ? candidate : value
    }

    return {
      eyebrow: pick("storefront_landing_eyebrow", fallback.eyebrow),
      title: pick("storefront_landing_title", fallback.title),
      heading: pick("storefront_landing_heading", fallback.heading),
      description: pick(
        "storefront_landing_description",
        fallback.description.replace(baseName, "{storeName}")
      ).replace(/\{storeName\}/g, baseName),
      primaryCta: pick("storefront_landing_primary_cta", fallback.primaryCta),
      secondaryCta: pick("storefront_landing_secondary_cta", fallback.secondaryCta),
      stats: fallback.stats,
    }
  } catch {
    return fallback
  }
}
