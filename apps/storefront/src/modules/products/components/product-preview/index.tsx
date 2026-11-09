import { Text } from "@modules/common/components/ui"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

export default async function ProductPreview({
  product,
  isFeatured,
  region: _region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({
    product,
  })

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group">
      <div
        className="soft-card group relative overflow-hidden rounded-[28px] p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(17,17,17,0.09)]"
        data-testid="product-wrapper"
      >
        <div className="overflow-hidden rounded-[22px] bg-neutral-100">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            alt={product.title}
            size="full"
            isFeatured={isFeatured}
            className="!rounded-[22px] !bg-neutral-100 !shadow-none"
          />
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Text
              className="truncate text-base font-medium tracking-[-0.03em] text-neutral-900"
              data-testid="product-title"
            >
              {product.title}
            </Text>
            <Text className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
              Everyday essential
            </Text>
          </div>

          <div className="flex shrink-0 items-center gap-x-2 rounded-full border border-black/5 bg-white px-2.5 py-1.5 text-sm font-medium text-neutral-900">
            {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
          </div>
        </div>
      </div>
    </LocalizedClientLink>
  )
}
