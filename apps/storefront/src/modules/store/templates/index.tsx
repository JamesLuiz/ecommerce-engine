"use client"

import type { SearchClient } from "instantsearch.js"
import { Configure, InstantSearch } from "react-instantsearch"

import { useStoreConfig } from "@lib/config-provider"
import { useSearchClient } from "@lib/client-sdk"
import { PRODUCT_INDEX_NAME } from "@lib/search-client"
import StoreHits from "@modules/store/components/store-hits"
import StoreRefinements from "@modules/store/components/store-refinements"
import StoreSearchBox from "@modules/store/components/store-search-box"
import { resolveLayoutId } from "@modules/themes/registry"

const PRODUCT_LIMIT = 12

const LISTING_HEADINGS: Record<string, { eyebrow: string; title: string }> = {
  aurora: { eyebrow: "The catalog", title: "All products" },
  luxe: { eyebrow: "The catalog", title: "All pieces" },
  street: { eyebrow: "Full lineup", title: "Everything" },
  brutal: { eyebrow: "Index 000", title: "All stock" },
  breeze: { eyebrow: "The shelf", title: "Shop everything" },
  ember: { eyebrow: "The collection", title: "All goods" },
  terra: { eyebrow: "Market rows", title: "Everything" },
  chrome: { eyebrow: "// full_index", title: "All units" },
  pop: { eyebrow: "The whole jar", title: "All goodies" },
  minimal: { eyebrow: "", title: "All products" },
}

/**
 * Store listing. The heading follows the active theme; the product cards
 * render through `ThemedHitCard` so the grid matches the merchant's layout.
 */
const StoreTemplate = ({ currencyCode }: { currencyCode: string }) => {
  const searchClient = useSearchClient()
  const { settings } = useStoreConfig()
  const layoutId = resolveLayoutId(settings?.theme?.preset)
  const heading = LISTING_HEADINGS[layoutId] ?? {
    eyebrow: "",
    title: "All products",
  }

  return (
    <div
      className="theme-listing py-6 content-container"
      data-layout={layoutId}
      data-testid="category-container"
    >
      <div className="mb-8">
        {heading.eyebrow ? (
          <p className="theme-eyebrow theme-listing-eyebrow mb-2">
            {heading.eyebrow}
          </p>
        ) : null}
        <h1
          data-testid="store-page-title"
          className="theme-section-title theme-listing-title"
        >
          {heading.title}
        </h1>
      </div>

      <div className="flex flex-col small:flex-row small:items-start">
        <InstantSearch
          indexName={PRODUCT_INDEX_NAME}
          searchClient={searchClient as unknown as SearchClient}
          routing
          future={{ preserveSharedStateOnUnmount: true }}
        >
          <Configure hitsPerPage={PRODUCT_LIMIT} />
          <StoreRefinements currencyCode={currencyCode} />
          <div className="w-full min-w-0">
            <StoreSearchBox />
            <StoreHits
              hitsPerPage={PRODUCT_LIMIT}
              currencyCode={currencyCode}
            />
          </div>
        </InstantSearch>
      </div>
    </div>
  )
}

export default StoreTemplate
