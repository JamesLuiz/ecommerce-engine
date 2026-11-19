import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { hydrateRuntimeBrandConfig } from "@lib/runtime-config"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import Search from "@modules/layout/components/search"
import SideMenu from "@modules/layout/components/side-menu"
import StoreBrand from "@modules/layout/components/store-brand"
import { AnnouncementBar } from "@modules/themes/parts"
import { resolveHomeContent } from "@modules/themes/content"

/**
 * Storefront navbar. Reads live storefront settings server-side so the
 * merchant's choices apply on first paint and on every settings save:
 *
 * - `layout.headerStyle`: `centered` (menu left, brand middle, actions
 *   right), `split` (brand left, nav links center, actions right), or
 *   `minimal` (brand left, actions right — links live in the side menu).
 * - `navigation.links`: merchant-defined links rendered in the bar (split)
 *   and always inside the side menu.
 * - `features.showSearch` / `showAccount`: gate the search icon and the
 *   account link.
 * - The announcement bar renders here globally (every page) when enabled,
 *   instead of only on the homepage.
 */
export default async function Nav() {
  const [regions, locales, currentLocale, runtime] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
    hydrateRuntimeBrandConfig(),
  ])

  const settings = runtime.settings
  const headerStyle = settings?.layout?.headerStyle ?? "centered"
  const navLinks = settings?.navigation?.links ?? []
  const showSearch = settings?.features?.showSearch ?? true
  const showAccount = settings?.features?.showAccount ?? true
  const content = resolveHomeContent({
    backendUrl: runtime.backendUrl,
    publishableKey: runtime.publishableKey,
    storeName: runtime.storeName,
    primaryColor: runtime.primaryColor,
    logoUrl: runtime.logoUrl,
    defaultCountryCode: runtime.defaultCountryCode,
    stripePublishableKey: runtime.stripePublishableKey,
    medusaPaymentsPublishableKey: runtime.medusaPaymentsPublishableKey,
    adyenClientKey: runtime.adyenClientKey,
    adyenEnvironment: runtime.adyenEnvironment,
    settings: runtime.settings,
  })

  const actions = (
    <div className="flex flex-1 basis-0 items-center justify-end gap-x-6">
      {showSearch ? <Search /> : null}
      {showAccount ? (
        <div className="hidden small:flex items-center gap-x-6">
          <LocalizedClientLink
            className="text-ui-fg-subtle hover:text-ui-fg-base"
            href="/account"
            data-testid="nav-account-link"
          >
            Account
          </LocalizedClientLink>
        </div>
      ) : null}
      <Suspense
        fallback={
          <LocalizedClientLink
            className="flex items-center gap-2 text-ui-fg-subtle hover:text-ui-fg-base"
            href="/cart"
            data-testid="nav-cart-link"
          >
            Cart (0)
          </LocalizedClientLink>
        }
      >
        <CartButton />
      </Suspense>
    </div>
  )

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <AnnouncementBar
        announcement={content.announcement}
        className="border-b border-black/5 bg-neutral-900 text-white"
      />
      <header
        className="relative mx-auto h-20 border-b border-black/5 bg-white/80 backdrop-blur-xl"
        data-header-style={headerStyle}
      >
        {headerStyle === "split" ? (
          <nav className="content-container flex h-full w-full items-center justify-between gap-x-8 text-small-regular text-ui-fg-subtle">
            <div className="flex items-center gap-x-6">
              <SideMenu
                regions={regions}
                locales={locales}
                currentLocale={currentLocale}
              />
              <StoreBrand />
            </div>

            {navLinks.length > 0 ? (
              <div className="hidden items-center gap-x-8 small:flex">
                {navLinks.map((link) => (
                  <LocalizedClientLink
                    key={`${link.label}-${link.href}`}
                    className="text-ui-fg-subtle hover:text-ui-fg-base"
                    href={link.href}
                  >
                    {link.label}
                  </LocalizedClientLink>
                ))}
              </div>
            ) : null}

            {actions}
          </nav>
        ) : headerStyle === "minimal" ? (
          <nav className="content-container flex h-full w-full items-center justify-between text-small-regular text-ui-fg-subtle">
            <div className="flex items-center gap-x-6">
              <SideMenu
                regions={regions}
                locales={locales}
                currentLocale={currentLocale}
              />
              <StoreBrand />
            </div>

            {actions}
          </nav>
        ) : (
          <nav className="content-container flex h-full w-full items-center justify-between text-small-regular text-ui-fg-subtle">
            <div className="flex flex-1 basis-0 items-center">
              <div className="h-full">
                <SideMenu
                  regions={regions}
                  locales={locales}
                  currentLocale={currentLocale}
                />
              </div>
            </div>

            <div className="flex items-center justify-center">
              <StoreBrand />
            </div>

            {actions}
          </nav>
        )}
      </header>
    </div>
  )
}
