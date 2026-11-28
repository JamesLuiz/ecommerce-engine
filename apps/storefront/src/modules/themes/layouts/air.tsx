import LocalizedClientLink from "@modules/common/components/localized-client-link"

import type { HomeContent } from "../content"
import type { CollectionBlock, ThemedProduct } from "../registry"
import Reveal from "../reveal"
import {
  PriceChip,
  ProductImage,
  ProductLink,
  SectionHeading,
} from "../parts"

/**
 * AIR — crisp Apple-style minimal.
 *
 * Frosted white hero with hairline dividers, SF-style tight tracking, a huge
 * light hero, rounded-3xl glass product cards, and alternating feature rows.
 * Calm motion: opacity + translate only, critically damped, no overshoot.
 */

export function AirCard({ product, index }: { product: ThemedProduct; index: number }) {
  return (
    <Reveal delay={Math.min(index, 7) * 60}>
      <ProductLink
        product={product}
        className="group block overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.10)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-[#f5f5f7]">
          <ProductImage product={product} sizes="(max-width: 640px) 70vw, 320px" />
        </div>
        <div className="px-5 pb-5 pt-4">
          <p className="truncate text-[17px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
            {product.title}
          </p>
          <p className="mt-0.5 text-[13px] text-[#6e6e73]">
            Air essential
          </p>
          <div className="mt-3">
            <PriceChip
              product={product}
              className="bg-[#0071e3] px-4 py-1.5 text-white"
            />
          </div>
        </div>
      </ProductLink>
    </Reveal>
  )
}

export default function AirLayout({
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
  const { hero, showcase, stats } = content

  return (
    <div className="bg-[#fbfbfd] text-[#1d1d1f]">
      {/* Hero — frosted glass, huge light type */}
      {content.showHero && (
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-[#f5f5f7] to-[#fbfbfd]" />
          <div className="content-container relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/70 px-4 py-1.5 text-[13px] font-medium text-[#6e6e73] backdrop-blur-xl">
                {hero.eyebrow || content.storeName}
              </p>
              <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-[1.05] tracking-[-0.03em] md:text-7xl">
                {hero.title}{" "}
                <span className="text-[#6e6e73]">{hero.heading}</span>
              </h1>
              <p className="mt-5 max-w-lg text-[17px] leading-7 text-[#6e6e73]">
                {hero.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LocalizedClientLink
                  href="/store"
                  className="rounded-full bg-[#0071e3] px-7 py-3 text-[15px] font-medium text-white transition-all duration-200 hover:bg-[#0077ed]"
                >
                  {hero.primaryCta}
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/store"
                  className="rounded-full px-7 py-3 text-[15px] font-medium text-[#0066cc] transition-colors hover:underline"
                >
                  {hero.secondaryCta} →
                </LocalizedClientLink>
              </div>

              {stats.length > 0 && (
                <div className="mt-10 flex gap-8 border-t border-black/[0.06] pt-6">
                  {stats.slice(0, 3).map((stat) => (
                    <div key={stat.label}>
                      <div className="text-xl font-semibold tracking-tight">
                        {stat.value}
                      </div>
                      <div className="mt-0.5 text-[13px] text-[#6e6e73]">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>

            {content.showShowcase && (
              <Reveal delay={150} className="relative flex justify-center lg:justify-end">
                <LocalizedClientLink
                  href={showcase.href || "/store"}
                  className="group relative block w-full max-w-[440px] overflow-hidden rounded-[32px] border border-black/[0.06] bg-white/70 shadow-[0_30px_80px_rgba(0,0,0,0.10)] backdrop-blur-2xl transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#f5f5f7]">
                    {showcase.imageUrl ? (
                      <img
                        src={showcase.imageUrl}
                        alt={showcase.title}
                        className="theme-card-img absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#e8e8ed] via-white to-[#f5f5f7]" />
                    )}
                    <span className="absolute left-5 top-5 rounded-full bg-[#0071e3] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                      {showcase.badge || showcase.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 p-6">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#6e6e73]">
                        {showcase.eyebrow}
                      </p>
                      <h3 className="mt-1 truncate text-[21px] font-semibold tracking-tight">
                        {showcase.title}
                      </h3>
                    </div>
                    {showcase.price ? (
                      <span className="shrink-0 text-[17px] font-semibold text-[#0071e3]">
                        {showcase.price}
                      </span>
                    ) : null}
                  </div>
                </LocalizedClientLink>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* Featured */}
      {content.showFeatured && featured.length > 0 && (
        <section className="content-container py-16 lg:py-20">
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="Shop the edit"
              title="Featured products"
              actionHref="/store"
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {featured.slice(0, 4).map((product, i) => (
              <AirCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Collection feature rows */}
      {blocks.slice(0, 2).map((block, bi) => (
        <section
          key={block.collection.id}
          className={bi % 2 === 1 ? "bg-[#f5f5f7]" : "bg-white"}
        >
          <div className="content-container grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-20">
            <Reveal className={bi % 2 === 1 ? "lg:order-2" : ""}>
              <p className="theme-eyebrow text-[#0071e3]">Curated collection</p>
              <h3 className="mt-2 text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
                {block.collection.title}
              </h3>
              <p className="mt-4 max-w-md text-[17px] leading-7 text-[#6e6e73]">
                Handpicked from {content.storeName} — designed to fit your everyday.
              </p>
              <LocalizedClientLink
                href={`/collections/${block.collection.handle}`}
                className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-[#0066cc] hover:underline"
              >
                Shop the collection <span aria-hidden>→</span>
              </LocalizedClientLink>
            </Reveal>
            <div className="grid grid-cols-2 gap-5">
              {block.products.slice(0, 2).map((product, i) => (
                <AirCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* New arrivals */}
      {arrivals.length > 0 && (
        <section className="content-container py-16 lg:py-20">
          <Reveal>
            <SectionHeading eyebrow="Fresh arrivals" title="New in" />
          </Reveal>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {arrivals.slice(0, 4).map((product, i) => (
              <AirCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {blocks.slice(2).map((block) => (
        <section key={block.collection.id} className="content-container pb-16">
          <Reveal>
            <SectionHeading
              eyebrow="Curated collection"
              title={block.collection.title}
              actionHref={`/collections/${block.collection.handle}`}
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {block.products.slice(0, 4).map((product, i) => (
              <AirCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
