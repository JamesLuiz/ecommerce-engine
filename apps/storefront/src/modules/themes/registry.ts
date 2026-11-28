import type { HttpTypes } from "@medusajs/types"
import {
  LEGACY_PRESET_FALLBACKS,
  STOREFRONT_LAYOUT_IDS,
  STOREFRONT_LAYOUT_META,
  type StorefrontLayoutId,
} from "@flowcheq/storefront-config"

export type LayoutId = StorefrontLayoutId

export { STOREFRONT_LAYOUT_IDS, STOREFRONT_LAYOUT_META }

/**
 * Resolves a saved `theme.preset` value to a renderable layout id.
 *
 * Current layout ids pass through, legacy presets (`editorial`, `bold`,
 * `classic`) map to their closest modern layout, and anything unknown falls
 * back to `minimal` so the storefront never breaks on bad data.
 */
export function resolveLayoutId(preset?: string | null): LayoutId {
  if (
    preset &&
    (STOREFRONT_LAYOUT_IDS as readonly string[]).includes(preset)
  ) {
    return preset as LayoutId
  }

  if (preset && preset in LEGACY_PRESET_FALLBACKS) {
    return LEGACY_PRESET_FALLBACKS[preset]
  }

  return "minimal"
}

/**
 * Signature accent per layout, used for chrome that lives outside the themed
 * homepage (nav monogram, badges) so it still feels owned by the theme.
 * `minimal` has no entry — it keeps the merchant's brand primary color.
 */
export const LAYOUT_ACCENTS: Partial<Record<LayoutId, string>> = {
  aurora: "#8b5cf6",
  luxe: "#d4af69",
  street: "#ff4d00",
  brutal: "#2545ff",
  breeze: "#0e9384",
  ember: "#ff8a3d",
  terra: "#5b7d3c",
  chrome: "#38e1ff",
  pop: "#ff3ea5",
  air: "#0071e3",
  titanium: "#b9bec7",
  liquid: "#64d2ff",
}

export type ThemedProduct = HttpTypes.StoreProduct

export type CollectionBlock = {
  collection: HttpTypes.StoreCollection
  products: HttpTypes.StoreProduct[]
}

export type HomeData = {
  featured: HttpTypes.StoreProduct[]
  arrivals: HttpTypes.StoreProduct[]
  blocks: CollectionBlock[]
  region: HttpTypes.StoreRegion
}
