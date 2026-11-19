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
 * LUXE NOIRE — dark editorial luxury.
 *
 * Serif masthead hero with gold rules, an oversized issue number, a framed
 * portrait showcase card, hairline dividers, and tall portrait product cards
 * with gold price lines. Restrained motion: slow fades, hairline sweeps.
 */

export function LuxeCard({ product, index }: { product: ThemedProduct; index: number }) {
  return (
    <Reveal delay={Math.min(index, 7) * 80}>
      <ProductLink product={product} className="group block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[4px] border border-[#d4af69]/25 bg-[#171512]">
          <ProductImage product={product} sizes="(max-width: 640px) 70vw, 320px" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <span className="inline-block border border-[#d4af69]/60 bg-black/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f3ead9] backdrop-blur-sm">
              View piece
            </span>
          </div>
        </div>
        <div className="mt-4 border-t border-[#d4af69]/25 pt-3 text-center">
          <p className="font-serif text-[17px] tracking-wide text-[#f3ead9]">
            {product.title}
          </p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-[#d4af69]/50" />
            <PriceChip
              product={product}
              className="rounded-none bg-transparent p-0 text-[13px] font-medium tracking-[0.08em] text-[#d4af69]"
            />
            <span className="h-px w-8 bg-[#d4af69]/50" />
          </div>
        </div>
      </ProductLink>
    </Reveal>
  )
}

export default function LuxeLayout({
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
    <div className="bg-[#0e0d0b] font-serif text-[#f3ead9]">
      {/* Masthead hero */}
      {content.showHero && (
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute right-0 top-8 select-none font-serif text-[22vw] leading-none text-white/[0.03]">
            №1
          </div>
          <div className="content-container relative py-16 lg:py-24">
            <Reveal className="mx-auto max-w-3xl text-center">
              <p className="theme-eyebrow font-sans text-[#d4af69]">
                {hero.eyebrow || "Maison " + content.storeName}
              </p>
              <h1 className="mt-5 text-5xl font-medium leading-[1.02] tracking-[-0.01em] text-[#f3ead9] md:text-7xl">
                {hero.title}
              </h1>
              <div className="mx-auto mt-6 flex max-w-xs items-center gap-4">
                <span className="h-px flex-1 bg-[#d4af69]/40" />
                <span className="text-[#d4af69]">◆</span>
                <span className="h-px flex-1 bg-[#d4af69]/40" />
              </div>
              <p className="mx-auto mt-6 max-w-xl font-sans text-lg italic leading-8 text-[#f3ead9]/70">
                {hero.heading} — {hero.description}
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4 font-sans">
                <LocalizedClientLink
                  href="/store"
                  className="border border-[#d4af69] bg-[#d4af69] px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-black transition-colors duration-200 hover:bg-transparent hover:text-[#d4af69]"
                >
                  {hero.primaryCta}
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/store"
                  className="border border-[#d4af69]/40 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-[#f3ead9] transition-colors duration-200 hover:border-[#d4af69] hover:text-[#d4af69]"
                >
                  {hero.secondaryCta}
                </LocalizedClientLink>
              </div>

              {stats.length > 0 && (
                <div className="mx-auto mt-12 grid max-w-lg grid-cols-3 divide-x divide-[#d4af69]/25 font-sans">
                  {stats.slice(0, 3).map((stat) => (
                    <div key={stat.label} className="px-4">
                      <div className="text-2xl font-semibold text-[#f3ead9]">
                        {stat.value}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#f3ead9]/50">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>

            {/* Framed portrait showcase */}
            {content.showShowcase && (
              <Reveal delay={150} className="mx-auto mt-14 max-w-4xl">
                <LocalizedClientLink
                  href={showcase.href || "/store"}
                  className="group grid overflow-hidden border border-[#d4af69]/30 bg-[#171512] md:grid-cols-2"
                >
                  <div className="relative min-h-[320px] overflow-hidden md:min-h-[420px]">
                    {showcase.imageUrl ? (
                      <img
                        src={showcase.imageUrl}
                        alt={showcase.title}
                        className="theme-card-img absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#2a2118] via-[#171512] to-black" />
                    )}
                    <span className="absolute left-5 top-5 bg-[#d4af69] px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-black">
                      {showcase.badge || showcase.label}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center p-8 md:p-12">
                    <p className="theme-eyebrow font-sans text-[#d4af69]">
                      {showcase.eyebrow}
                    </p>
                    <h3 className="mt-3 text-3xl font-medium leading-tight md:text-4xl">
                      {showcase.title}
                    </h3>
                    {showcase.price ? (
                      <p className="mt-4 font-sans text-xl text-[#d4af69]">
                        {showcase.price}
                      </p>
                    ) : null}
                    <span className="mt-6 inline-flex items-center gap-3 font-sans text-xs font-semibold uppercase tracking-[0.24em] text-[#f3ead9]/80">
                      Discover
                      <span className="h-px w-10 bg-[#d4af69] transition-all duration-300 group-hover:w-14" />
                    </span>
                  </div>
                </LocalizedClientLink>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* Featured — editorial grid with hairline frames */}
      {content.showFeatured && featured.length > 0 && (
        <section className="content-container border-t border-[#d4af69]/20 py-16 lg:py-20">
          <Reveal>
            <div className="mb-10 text-center">
              <p className="theme-eyebrow font-sans text-[#d4af69]">Shop the edit</p>
              <h2 className="mt-3 text-4xl font-medium md:text-5xl">
                Featured pieces
              </h2>
              <div className="mx-auto mt-5 flex max-w-[200px] items-center gap-3">
                <span className="h-px flex-1 bg-[#d4af69]/40" />
                <span className="text-xs text-[#d4af69]">◆</span>
                <span className="h-px flex-1 bg-[#d4af69]/40" />
              </div>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
            {featured.slice(0, 4).map((product, i) => (
              <LuxeCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Collection chapters */}
      {blocks.slice(0, 2).map((block, bi) => (
        <section
          key={block.collection.id}
          className="border-t border-[#d4af69]/20 bg-[#121110]"
        >
          <div className="content-container grid items-center gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
            <Reveal className={bi % 2 === 1 ? "lg:order-2" : ""}>
              <p className="theme-eyebrow font-sans text-[#d4af69]">
                Chapter {String(bi + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 text-4xl font-medium leading-tight md:text-5xl">
                {block.collection.title}
              </h3>
              <LocalizedClientLink
                href={`/collections/${block.collection.handle}`}
                className="mt-6 inline-flex items-center gap-3 font-sans text-xs font-semibold uppercase tracking-[0.24em] text-[#f3ead9]/80 transition-colors hover:text-[#d4af69]"
              >
                Enter the collection
                <span aria-hidden>→</span>
              </LocalizedClientLink>
            </Reveal>
            <div className="grid grid-cols-2 gap-5">
              {block.products.slice(0, 2).map((product, i) => (
                <LuxeCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* New arrivals */}
      {arrivals.length > 0 && (
        <section className="content-container border-t border-[#d4af69]/20 py-16">
          <Reveal>
            <SectionHeading
              dark
              eyebrow="Fresh arrivals"
              title="New pieces"
              actionHref="/store"
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
            {arrivals.slice(0, 4).map((product, i) => (
              <LuxeCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {blocks.slice(2).map((block) => (
        <section
          key={block.collection.id}
          className="border-t border-[#d4af69]/20 bg-[#121110]"
        >
          <div className="content-container py-16">
            <Reveal>
              <SectionHeading
                dark
                eyebrow="Curated collection"
                title={block.collection.title}
                actionHref={`/collections/${block.collection.handle}`}
              />
            </Reveal>
            <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
              {block.products.slice(0, 4).map((product, i) => (
                <LuxeCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
