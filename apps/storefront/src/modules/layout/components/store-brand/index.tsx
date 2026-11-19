"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useStoreConfig } from "@lib/config-provider"
import { LAYOUT_ACCENTS, resolveLayoutId } from "@modules/themes/registry"

/**
 * Renders the tenant's store mark: the uploaded logo when present, otherwise
 * a monogram followed by the store name.
 *
 * The monogram uses the active layout's signature accent so it feels owned by
 * the theme; the default (minimal) layout keeps the brand primary color.
 *
 * Reads from the live runtime config context so it re-renders when staff save
 * storefront settings and the backend pushes them over SSE.
 */
export default function StoreBrand() {
  const { storeName, logoUrl, primaryColor, settings } = useStoreConfig()
  const monogramColor =
    LAYOUT_ACCENTS[resolveLayoutId(settings?.theme?.preset)] ?? primaryColor

  return (
    <LocalizedClientLink
      href="/"
      className="flex items-center gap-3 text-brand transition-transform duration-200 hover:scale-[1.01]"
      data-testid="nav-store-link"
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${storeName} logo`}
          className="h-9 w-9 rounded-xl border border-black/5 object-cover shadow-sm"
        />
      ) : (
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-semibold text-white"
          style={{ backgroundColor: monogramColor }}
        >
          {storeName.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="txt-compact-xlarge-plus uppercase tracking-[-0.06em] text-ui-fg-base">
        {storeName}
      </span>
    </LocalizedClientLink>
  )
}
