import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { hydrateRuntimeBrandConfig } from "@lib/runtime-config"
import SearchForm from "@modules/search/components/search-form"
import { resolveLayoutId } from "@modules/themes/registry"
import { ThemedServerGrid } from "@modules/themes/server-cards"

const RESULT_LIMIT = 24

type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ q?: string | string[] }>
}

const getQuery = (q?: string | string[]) =>
  (Array.isArray(q) ? q[0] : q)?.trim().slice(0, 200) ?? ""

export async function generateMetadata(props: Props): Promise<Metadata> {
  const query = getQuery((await props.searchParams).q)
  return {
    title: query ? `Search results for "${query}"` : "Search",
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage(props: Props) {
  const { countryCode } = await props.params
  const query = getQuery((await props.searchParams).q)

  const region = await getRegion(countryCode)
  if (!region) {
    notFound()
  }

  const [{ response }, { settings }] = await Promise.all([
    query
      ? listProducts({
          countryCode,
          queryParams: { q: query, limit: RESULT_LIMIT },
        })
      : Promise.resolve({ response: { products: [], count: 0 } }),
    hydrateRuntimeBrandConfig(),
  ])
  const layoutId = resolveLayoutId(settings?.theme?.preset)

  return (
    <div
      className="theme-listing content-container py-6"
      data-layout={layoutId}
      data-testid="search-container"
    >
      <h1 className="theme-section-title theme-listing-title mb-6">
        {query ? `Search results for "${query}"` : "Search"}
      </h1>
      <SearchForm countryCode={countryCode} defaultValue={query} className="mb-8 max-w-xl" />
      {query && (
        <p className="text-small-regular text-ui-fg-subtle mb-6">
          {response.count} {response.count === 1 ? "product" : "products"} found
        </p>
      )}
      {query && response.products.length === 0 ? (
        <p className="text-ui-fg-subtle">
          No products match your search. Try a different keyword.
        </p>
      ) : (
        <div data-testid="search-results">
          <ThemedServerGrid layoutId={layoutId} products={response.products} />
        </div>
      )}
    </div>
  )
}
