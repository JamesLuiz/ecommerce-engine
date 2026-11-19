import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import { HttpTypes } from "@medusajs/types"
import { hydrateRuntimeBrandConfig } from "@lib/runtime-config"
import { OptionValueIds } from "@lib/util/product-option-filters"
import { resolveLayoutId } from "@modules/themes/registry"
import { ThemedListingHeading } from "@modules/themes/server-cards"

export default async function CollectionTemplate({
  sortBy,
  collection,
  page,
  countryCode,
  optionValueIds,
}: {
  sortBy?: SortOptions
  collection: HttpTypes.StoreCollection
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  const { settings } = await hydrateRuntimeBrandConfig()
  const layoutId = resolveLayoutId(settings?.theme?.preset)

  return (
    <div
      className="theme-listing flex flex-col small:flex-row small:items-start py-6 content-container"
      data-layout={layoutId}
    >
      <RefinementList sortBy={sort} hideOptionsPicker />
      <div className="w-full">
        <ThemedListingHeading layoutId={layoutId} title={collection.title} />
        <Suspense
          fallback={
            <SkeletonProductGrid
              numberOfProducts={collection.products?.length}
            />
          }
        >
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            collectionId={collection.id}
            countryCode={countryCode}
            optionValueIds={optionValueIds}
          />
        </Suspense>
      </div>
    </div>
  )
}
