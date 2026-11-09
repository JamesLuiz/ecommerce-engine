import {
  storefrontSettingsFromMetadata,
  storefrontSettingsToMetadata,
  type StorefrontSettings,
} from "@flowcheq/storefront-config"

type StoreLike = {
  name?: string | null
  metadata?: Record<string, unknown> | null
}

export const getStorefrontSettings = (
  store?: StoreLike | null,
  options?: { brandName?: string | null },
): StorefrontSettings => storefrontSettingsFromMetadata(store?.metadata ?? null, options)

export const getStorefrontSettingsMetadata = (
  settings: StorefrontSettings,
): Record<string, unknown> => storefrontSettingsToMetadata(settings)
