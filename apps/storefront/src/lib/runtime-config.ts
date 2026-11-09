/**
 * Storefront configuration read from the process environment at runtime.
 *
 * These values are NOT `NEXT_PUBLIC_*` on purpose: one storefront image is
 * built once and started many times, once per tenant, with different env vars.
 * Any value baked in at build time would leak one tenant's settings into every
 * other tenant's store.
 */
import type { StorefrontSettings } from "@flowcheq/storefront-config"

export type RuntimeConfig = {
  backendUrl: string
  publishableKey: string
  storeName: string
  primaryColor: string
  logoUrl?: string
  defaultCountryCode: string
  storeBaseUrl?: string
  stripePublishableKey?: string
  medusaPaymentsPublishableKey?: string
  adyenClientKey?: string
  adyenEnvironment: "test" | "live"
  settings?: StorefrontSettings
}

const DEFAULT_BACKEND_URL = "http://localhost:9000"
const DEFAULT_STORE_NAME = "Store"
const DEFAULT_PRIMARY_COLOR = "#111111"
const DEFAULT_COUNTRY_CODE = "us"

/**
 * Lenient accessor. Returns safe fallbacks so module evaluation during
 * `next build` cannot fail. Use `requireRuntimeConfig()` where a missing value
 * must be a hard error (server startup / request handling).
 */
const getEnv = (runtimeKey: string, publicKey?: string) => {
  return process.env[runtimeKey] || (publicKey ? process.env[publicKey] : undefined)
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    backendUrl:
      getEnv("MEDUSA_BACKEND_URL", "NEXT_PUBLIC_MEDUSA_BACKEND_URL") ||
      DEFAULT_BACKEND_URL,
    publishableKey:
      getEnv("MEDUSA_PUBLISHABLE_KEY", "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY") ||
      "",
    storeName: process.env.STORE_NAME || DEFAULT_STORE_NAME,
    primaryColor: process.env.BRAND_PRIMARY_COLOR || DEFAULT_PRIMARY_COLOR,
    logoUrl: process.env.BRAND_LOGO_URL || undefined,
    defaultCountryCode: (
      process.env.STORE_DEFAULT_REGION || DEFAULT_COUNTRY_CODE
    ).toLowerCase(),
    storeBaseUrl: process.env.STORE_BASE_URL?.replace(/\/$/, "") || undefined,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || undefined,
    medusaPaymentsPublishableKey:
      process.env.MEDUSA_PAYMENTS_PUBLISHABLE_KEY || undefined,
    adyenClientKey: process.env.ADYEN_CLIENT_KEY || undefined,
    adyenEnvironment:
      process.env.ADYEN_ENVIRONMENT === "live" ? "live" : "test",
  }
}

export async function hydrateRuntimeBrandConfig(): Promise<RuntimeConfig> {
  const runtime = getRuntimeConfig()

  try {
    const backendUrl = runtime.backendUrl.replace(/\/$/, "")
    const response = await fetch(`${backendUrl}/store/store-brand`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(runtime.publishableKey
          ? { "x-publishable-api-key": runtime.publishableKey }
          : {}),
      },
    })

    if (!response.ok) {
      return runtime
    }

    const payload = (await response.json()) as {
      brand?: {
        name?: string
        primaryColor?: string
        logoUrl?: string
      }
      settings?: StorefrontSettings
      hasStorefrontSettings?: boolean
    }

    const brand = payload.brand ?? {}
    const settings = payload.settings
    const hasStorefrontSettings = Boolean(payload.hasStorefrontSettings)

    // When settings exist in metadata.storefront they are authoritative.
    // When they don't, fall back to legacy flat metadata keys first so the
    // schema defaults don't shadow a previously-saved legacy brand color.
    const settingsBrand = settings?.brand ?? {}
    const hydrated: RuntimeConfig = {
      ...runtime,
      storeName:
        hasStorefrontSettings && settingsBrand.name
          ? settingsBrand.name
          : brand.name || settingsBrand.name || runtime.storeName,
      primaryColor:
        hasStorefrontSettings && settingsBrand.primaryColor
          ? settingsBrand.primaryColor
          : brand.primaryColor || settingsBrand.primaryColor || runtime.primaryColor,
      logoUrl:
        hasStorefrontSettings && settingsBrand.logoUrl
          ? settingsBrand.logoUrl
          : brand.logoUrl || settingsBrand.logoUrl || runtime.logoUrl,
      settings,
    }

    process.env.STORE_NAME = hydrated.storeName
    process.env.BRAND_PRIMARY_COLOR = hydrated.primaryColor
    if (hydrated.logoUrl) {
      process.env.BRAND_LOGO_URL = hydrated.logoUrl
    } else {
      delete process.env.BRAND_LOGO_URL
    }

    return hydrated
  } catch {
    return runtime
  }
}

/**
 * Strict accessor for request-time and startup validation. Throws a message
 * naming every missing variable instead of failing later with a confusing
 * publishable-key error.
 */
export function requireRuntimeConfig(): RuntimeConfig {
  const missing: string[] = []

  if (!getEnv("MEDUSA_BACKEND_URL", "NEXT_PUBLIC_MEDUSA_BACKEND_URL")) {
    missing.push("MEDUSA_BACKEND_URL")
  }
  if (!getEnv("MEDUSA_PUBLISHABLE_KEY", "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY")) {
    missing.push("MEDUSA_PUBLISHABLE_KEY")
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required storefront environment variables: ${missing.join(", ")}`
    )
  }

  return getRuntimeConfig()
}
