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
 * TERRA — earthy organic market.
 *
 * Sun-washed hero with an arched farm image, leaf badges, and a market-board
 * showcase card; rounded product cards with organic green price pills;
 * alternating field-tone collection rows. Calm, grounded, honest motion.
 */

export function TerraCard({ product, index }: { product: ThemedProduct; index: number }) {
  return (
    <Reveal delay={Math.min(index, 7) * 70}>
      <ProductLink
        product={product}
        className="group block rounded-[24px] border border-[#2e2a1f]/10 bg-[#fffdf6] p-3 shadow-[0_14px_38px_rgba(46,42,31,0.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_26px_56px_rgba(91,125,60,0.22)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[18px] bg-[#ede7d3]">
          <ProductImage product={product} sizes="(max-width: 640px) 70vw, 320px" />
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-[#5b7d3c] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
            ❋ Natural
          </span>
        </div>
        <div className="px-1.5 pb-1.5 pt-4">
          <p className="truncate text-[15px] font-semibold text-[#2e2a1f]">
            {product.title}
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-[#2e2a1f]/50">
            Market staple
          </p>
          <div className="mt-3">
            <PriceChip
              product={product}
              className="border border-[#5b7d3c]/30 bg-[#5b7d3c]/10 text-[#3f5a29]"
            />
          </div>
        </div>
      </ProductLink>
    </Reveal>
  )
}

export default function TerraLayout({
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
    <div className="bg-[#f6f3ea] text-[#2e2a1f]">
      {/* Hero — sun-washed field + market board */}
      {content.showHero && (
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-[#c98f2e]/20 blur-[100px] animate-theme-drift" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-[#5b7d3c]/15 blur-[100px]" />

          <div className="content-container relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#5b7d3c]/30 bg-[#5b7d3c]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#3f5a29]">
                ❋ {hero.eyebrow || "From good soil"}
              </span>
              <h1 className="mt-5 max-w-lg text-5xl font-semibold leading-[1.02] tracking-[-0.03em] md:text-6xl">
                {hero.title}
              </h1>
              <p className="mt-4 max-w-lg font-serif text-xl italic leading-snug text-[#2e2a1f]/80">
                {hero.heading}
              </p>
              <p className="mt-3 max-w-lg leading-7 text-[#2e2a1f]/65">
                {hero.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LocalizedClientLink
                  href="/store"
                  className="rounded-full bg-[#2e2a1f] px-7 py-3.5 text-sm font-semibold text-[#f6f3ea] transition-transform duration-200 hover:-translate-y-0.5"
                >
                  {hero.primaryCta}
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/store"
                  className="rounded-full border border-[#2e2a1f]/20 bg-transparent px-7 py-3.5 text-sm font-semibold transition-colors hover:border-[#5b7d3c] hover:text-[#3f5a29]"
                >
                  {hero.secondaryCta}
                </LocalizedClientLink>
              </div>

              {stats.length > 0 && (
                <div className="mt-9 flex gap-8">
                  {stats.slice(0, 3).map((stat) => (
                    <div key={stat.label}>
                      <div className="font-serif text-3xl text-[#3f5a29]">
                        {stat.value}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#2e2a1f]/55">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>

            {content.showShowcase && (
              <Reveal delay={150} className="relative">
                <LocalizedClientLink
                  href={showcase.href || "/store"}
                  className="group block overflow-hidden rounded-[28px] border border-[#2e2a1f]/15 bg-[#fffdf6] shadow-[0_30px_70px_rgba(46,42,31,0.16)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {showcase.imageUrl ? (
                      <img
                        src={showcase.imageUrl}
                        alt={showcase.title}
                        className="theme-card-img absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#5b7d3c] via-[#8aa653] to-[#ede7d3]" />
                    )}
                    <span className="absolute left-5 top-5 rounded-full bg-[#fffdf6]/95 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#3f5a29]">
                      {showcase.badge || showcase.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 p-6">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c98f2e]">
                        {showcase.eyebrow}
                      </p>
                      <h3 className="mt-1 truncate font-serif text-2xl">
                        {showcase.title}
                      </h3>
                    </div>
                    {showcase.price ? (
                      <span className="shrink-0 rounded-full bg-[#2e2a1f] px-4 py-2 text-sm font-semibold text-[#f6f3ea]">
                        {showcase.price}
                      </span>
                    ) : null}
                  </div>
                </LocalizedClientLink>
                <span className="absolute -bottom-4 right-8 rounded-2xl bg-[#c98f2e] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-lg">
                  Harvest pick ❋
                </span>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* Featured */}
      {content.showFeatured && featured.length > 0 && (
        <section className="border-y border-[#2e2a1f]/10 bg-[#ede7d3]/60">
          <div className="content-container py-16 lg:py-20">
            <Reveal>
              <SectionHeading
                eyebrow="Shop the edit"
                title="Market favorites"
                actionHref="/store"
              />
            </Reveal>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {featured.slice(0, 4).map((product, i) => (
                <TerraCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Collection rows — alternating field tones */}
      {blocks.slice(0, 2).map((block, bi) => (
        <section key={block.collection.id} className={bi % 2 === 1 ? "bg-[#ede7d3]/60" : ""}>
          <div className="content-container grid items-center gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <p className="theme-eyebrow text-[#3f5a29]">❋ Curated collection</p>
              <h3 className="theme-section-title mt-2">{block.collection.title}</h3>
              <p className="mt-3 max-w-md leading-7 text-[#2e2a1f]/65">
                Gathered in small batches from {content.storeName} — honest goods,
                honestly priced.
              </p>
              <LocalizedClientLink
                href={`/collections/${block.collection.handle}`}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#5b7d3c] px-6 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
              >
                Shop the row →
              </LocalizedClientLink>
            </Reveal>
            <div className="grid grid-cols-2 gap-5">
              {block.products.slice(0, 2).map((product, i) => (
                <TerraCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* New arrivals */}
      {arrivals.length > 0 && (
        <section className="border-t border-[#2e2a1f]/10 bg-[#ede7d3]/60">
          <div className="content-container py-16">
            <Reveal>
              <SectionHeading eyebrow="Fresh arrivals" title="New harvest" />
            </Reveal>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {arrivals.slice(0, 4).map((product, i) => (
                <TerraCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {blocks.slice(2).map((block) => (
        <section key={block.collection.id}>
          <div className="content-container py-16">
            <Reveal>
              <SectionHeading
                eyebrow="Curated collection"
                title={block.collection.title}
                actionHref={`/collections/${block.collection.handle}`}
              />
            </Reveal>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {block.products.slice(0, 4).map((product, i) => (
                <TerraCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
