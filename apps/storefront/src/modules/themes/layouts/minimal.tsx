import LocalizedClientLink from "@modules/common/components/localized-client-link"

import { getProductPrice } from "@lib/util/get-product-price"
import { Text } from "@modules/common/components/ui"
import InteractiveLink from "@modules/common/components/interactive-link"
import Thumbnail from "@modules/products/components/thumbnail"
import PreviewPrice from "@modules/products/components/product-preview/price"

import type { HomeContent } from "../content"
import type { CollectionBlock, ThemedProduct } from "../registry"
import Reveal from "../reveal"

/**
 * MINIMAL — the original default storefront look, preserved pixel-for-pixel
 * behind the layout interface so existing stores keep their design.
 *
 * Soft neutral hero with the floating glass showcase card, rounded product
 * cards, and the classic rail sections. Reveal animations added.
 *
 * The announcement bar renders globally from the navbar, not here.
 */

export function MinimalCard({ product, index }: { product: ThemedProduct; index: number }) {
  let cheapest = null
  try {
    cheapest = getProductPrice({ product }).cheapestPrice
  } catch {
    cheapest = null
  }

  return (
    <Reveal delay={Math.min(index, 7) * 60}>
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
              isFeatured
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
              {cheapest && <PreviewPrice price={cheapest} />}
            </div>
          </div>
        </div>
      </LocalizedClientLink>
    </Reveal>
  )
}

function MinimalRail({ title, eyebrow, products }: {
  title: string
  eyebrow: string
  products: ThemedProduct[]
}) {
  return (
    <section className="content-container py-16 sm:py-20">
      <Reveal>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
              {eyebrow}
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.06em] text-neutral-900">
              {title}
            </h2>
          </div>
        </div>
      </Reveal>

      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {products.slice(0, 4).map((product, i) => (
          <li key={product.id}>
            <MinimalCard product={product} index={i} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function MinimalLayout({
  content,
  featured,
  arrivals,
  blocks,
}: {
  content: HomeContent
  featured: ThemedProduct[]
  arrivals: ThemedProduct[]
  blocks: CollectionBlock[]
}) {
  const { hero, showcase, stats, storeName, primaryColor } = content

  return (
    <div>
      {/* Original hero — soft neutral gradient + floating glass showcase */}
      {content.showHero && (
        <section className="relative overflow-hidden border-b border-black/5 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(245,243,239,0.96)_26%,_rgba(236,231,225,1)_100%)]">
          <div className="content-container grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
            <Reveal className="relative z-10 max-w-xl">
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-black/5 bg-white/75 px-4 py-2 shadow-sm backdrop-blur-sm">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-semibold text-white"
                  style={{ backgroundColor: content.primaryColor }}
                >
                  {storeName.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-600">
                  {hero.eyebrow}
                </span>
              </div>

              <h1 className="max-w-lg text-5xl font-semibold leading-[0.95] tracking-[-0.06em] text-neutral-900 md:text-6xl">
                {hero.title}
              </h1>

              <h2 className="mt-4 max-w-lg text-3xl font-medium leading-tight tracking-[-0.05em] text-neutral-700 md:text-4xl">
                {hero.heading}
              </h2>

              <p className="mt-6 max-w-lg text-lg leading-8 text-neutral-600">
                {hero.description}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <LocalizedClientLink
                  href="/store"
                  className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ backgroundColor: primaryColor }}
                >
                  {hero.primaryCta}
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/store"
                  className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/70 px-6 py-3 text-sm font-medium text-neutral-900 transition-colors duration-200 hover:bg-white"
                >
                  {hero.secondaryCta}
                </LocalizedClientLink>
              </div>

              {stats.length > 0 && (
                <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-black/5 bg-white/60 px-3 py-4 backdrop-blur-sm"
                    >
                      <div className="text-xl font-semibold tracking-[-0.04em] text-neutral-900">
                        {stat.value}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>

            {content.showShowcase && (
              <Reveal delay={150} className="relative flex justify-center lg:justify-end">
                <div className="relative w-full max-w-[520px]">
                  <div
                    className="absolute -left-5 top-10 h-48 w-48 rounded-full blur-3xl"
                    style={{ backgroundColor: `${primaryColor}22` }}
                  />
                  <div className="absolute -right-6 bottom-8 h-52 w-52 rounded-full bg-neutral-200/80 blur-3xl" />

                  <LocalizedClientLink
                    href={showcase.href || "/store"}
                    className="glass-panel group relative block overflow-hidden rounded-[32px] p-4 transition-transform duration-300 hover:-translate-y-1"
                  >
                    <div className="rounded-[28px] bg-neutral-100 p-4">
                      <div className="rounded-[24px] bg-gradient-to-br from-neutral-200 via-white to-neutral-100 p-3">
                        <div className="flex items-center justify-between pb-3 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                          <span>{showcase.label}</span>
                          <span>{showcase.badge}</span>
                        </div>

                        <div className="relative h-[440px] overflow-hidden rounded-[22px] bg-gradient-to-br from-white to-stone-200">
                          {showcase.imageUrl ? (
                            <img
                              src={showcase.imageUrl}
                              alt={showcase.title}
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(0,0,0,0.08),_transparent_45%)]" />
                              <div
                                className="absolute left-8 top-8 h-28 w-28 rounded-[32px] shadow-[0_30px_60px_rgba(17,17,17,0.1)]"
                                style={{ backgroundColor: primaryColor }}
                              />
                            </>
                          )}
                          <div className="absolute bottom-7 left-7 right-7 rounded-[28px] border border-black/5 bg-white/85 p-5 shadow-[0_30px_80px_rgba(17,17,17,0.10)] backdrop-blur-md">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                                  {showcase.eyebrow}
                                </div>
                                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-neutral-900">
                                  {showcase.title}
                                </h2>
                              </div>
                              {showcase.price ? (
                                <div className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900">
                                  {showcase.price}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </LocalizedClientLink>
                </div>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* Featured + arrivals — original rails */}
      {content.showFeatured && featured.length > 0 && (
        <MinimalRail
          eyebrow="Shop the edit"
          title="Featured products"
          products={featured}
        />
      )}

      {arrivals.length > 0 && (
        <section className="content-container pb-16 sm:pb-20">
          <Reveal>
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
                  Fresh arrivals
                </p>
                <h2 className="text-3xl font-semibold tracking-[-0.06em] text-neutral-900">
                  New arrivals
                </h2>
              </div>
            </div>
          </Reveal>

          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {arrivals.slice(0, 4).map((product, i) => (
              <li key={product.id}>
                <MinimalCard product={product} index={i} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Collection rails — original style */}
      {blocks.length > 0 && (
        <div className="py-12">
          <ul className="flex flex-col gap-x-6">
            {blocks.map((block) => (
              <li key={block.collection.id}>
                <div className="content-container py-16 sm:py-20">
                  <Reveal>
                    <div className="mb-8 flex items-end justify-between gap-4">
                      <div>
                        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
                          Curated collection
                        </p>
                        <h2 className="text-3xl font-semibold tracking-[-0.06em] text-neutral-900">
                          {block.collection.title}
                        </h2>
                      </div>
                      <InteractiveLink
                        href={`/collections/${block.collection.handle}`}
                      >
                        View all
                      </InteractiveLink>
                    </div>
                  </Reveal>
                  <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    {block.products.slice(0, 4).map((product, i) => (
                      <li key={product.id}>
                        <MinimalCard product={product} index={i} />
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
