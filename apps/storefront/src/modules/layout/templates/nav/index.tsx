import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getRuntimeConfig } from "@lib/runtime-config"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import Search from "@modules/layout/components/search"
import SideMenu from "@modules/layout/components/side-menu"

export default async function Nav() {
  const { storeName, logoUrl, primaryColor } = getRuntimeConfig()
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative mx-auto h-20 border-b border-black/5 bg-white/80 backdrop-blur-xl">
        <nav className="content-container flex h-full w-full items-center justify-between text-small-regular text-ui-fg-subtle">
          <div className="flex flex-1 basis-0 items-center">
            <div className="h-full">
              <SideMenu regions={regions} locales={locales} currentLocale={currentLocale} />
            </div>
          </div>

          <div className="flex items-center justify-center">
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
                  style={{ backgroundColor: primaryColor }}
                >
                  {storeName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="txt-compact-xlarge-plus uppercase tracking-[-0.06em] text-ui-fg-base">
                {storeName}
              </span>
            </LocalizedClientLink>
          </div>

          <div className="flex flex-1 basis-0 items-center justify-end gap-x-6">
            <Search />
            <div className="hidden small:flex items-center gap-x-6">
              <LocalizedClientLink
                className="text-ui-fg-subtle hover:text-ui-fg-base"
                href="/account"
                data-testid="nav-account-link"
              >
                Account
              </LocalizedClientLink>
            </div>
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
        </nav>
      </header>
    </div>
  )
}
