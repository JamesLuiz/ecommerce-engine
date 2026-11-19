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
 * BREEZE — airy coastal calm.
 *
 * Soft teal-on-white hero with a pill-shaped image arch, floating stat chips,
 * a rounded showcase card with a wave divider, pill product cards with
 * floating price bubbles, and alternating collection split panels.
 * Gentle float/drift motion everywhere.
 */

export function BreezeCard({ product, index }: { product: ThemedProduct; index: number }) {
  return (
    <Reveal delay={Math.min(index, 7) * 70}>
      <ProductLink
        product={product}
        className="group block rounded-[28px] border border-[#123332]/10 bg-white p-3 shadow-[0_16px_44px_rgba(18,51,50,0.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_28px_60px_rgba(14,147,132,0.22)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-[#e8f3f0]">
          <ProductImage product={product} sizes="(max-width: 640px) 70vw, 320px" />
          <PriceChip
            product={product}
            className="absolute bottom-3 right-3 bg-[#0e9384] text-white shadow-[0_10px_24px_rgba(14,147,132,0.4)]"
          />
        </div>
        <div className="px-2 pb-2 pt-4">
          <p className="truncate text-[15px] font-semibold text-[#123332]">
            {product.title}
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-[#123332]/50">
            Coastal essential
          </p>
        </div>
      </ProductLink>
    </Reveal>
  )
}

export default function BreezeLayout({
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
    <div className="bg-[#f2f7f5] text-[#123332]">
      {/* Hero — pill arch image + floating chips */}
      {content.showHero && (
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#7dd3c6]/30 blur-[90px] animate-theme-drift" />
          <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-[#0e9384]/15 blur-[90px] animate-theme-drift" />

          <div className="content-container relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0e9384]/25 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0e9384] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#0e9384]" />
                {hero.eyebrow || content.storeName}
              </span>
              <h1 className="mt-5 max-w-lg text-5xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-6xl">
                {hero.title}
              </h1>
              <p className="mt-4 max-w-lg text-xl leading-snug text-[#123332]/75">
                {hero.heading}
              </p>
              <p className="mt-3 max-w-lg leading-7 text-[#123332]/60">
                {hero.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LocalizedClientLink
                  href="/store"
                  className="rounded-full bg-[#123332] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(18,51,50,0.3)] transition-transform duration-200 hover:-translate-y-0.5"
                >
                  {hero.primaryCta}
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/store"
                  className="rounded-full border border-[#123332]/15 bg-white px-7 py-3.5 text-sm font-semibold transition-colors hover:border-[#0e9384] hover:text-[#0e9384]"
                >
                  {hero.secondaryCta}
                </LocalizedClientLink>
              </div>

              {stats.length > 0 && (
                <div className="mt-9 flex flex-wrap gap-3">
                  {stats.slice(0, 3).map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-[#123332]/10 bg-white px-5 py-3 shadow-sm"
                    >
                      <span className="text-lg font-bold">{stat.value}</span>
                      <span className="ml-2 text-[11px] uppercase tracking-[0.14em] text-[#123332]/55">
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>

            {content.showShowcase && (
              <Reveal delay={150} className="relative flex justify-center">
                <div className="relative w-full max-w-[440px]">
                  <div className="animate-theme-float overflow-hidden rounded-t-[220px] rounded-b-[32px] border-[6px] border-white bg-[#e8f3f0] shadow-[0_36px_80px_rgba(18,51,50,0.18)]">
                    <div className="relative aspect-[3/4]">
                      {showcase.imageUrl ? (
                        <img
                          src={showcase.imageUrl}
                          alt={showcase.title}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-b from-[#7dd3c6] via-[#e8f3f0] to-white" />
                      )}
                    </div>
                  </div>
                  <LocalizedClientLink
                    href={showcase.href || "/store"}
                    className="absolute -bottom-6 left-1/2 w-[86%] -translate-x-1/2 rounded-3xl border border-[#123332]/10 bg-white/95 p-5 shadow-[0_24px_60px_rgba(18,51,50,0.2)] backdrop-blur transition-transform duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0e9384]">
                          {showcase.badge || showcase.label} · {showcase.eyebrow}
                        </p>
                        <h3 className="mt-1 truncate text-xl font-semibold">
                          {showcase.title}
                        </h3>
                      </div>
                      {showcase.price ? (
                        <span className="shrink-0 rounded-full bg-[#123332] px-4 py-2 text-sm font-semibold text-white">
                          {showcase.price}
                        </span>
                      ) : null}
                    </div>
                  </LocalizedClientLink>
                  <span className="absolute -right-3 top-10 rotate-12 rounded-2xl bg-[#0e9384] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-lg">
                    {showcase.label}
                  </span>
                </div>
              </Reveal>
            )}
          </div>

          {/* Wave divider */}
          <svg
            viewBox="0 0 1440 70"
            preserveAspectRatio="none"
            className="block h-[46px] w-full text-white"
            aria-hidden
          >
            <path
              d="M0,40 C240,80 480,0 720,30 C960,60 1200,10 1440,40 L1440,70 L0,70 Z"
              fill="currentColor"
            />
          </svg>
        </section>
      )}

      {/* Featured */}
      {content.showFeatured && featured.length > 0 && (
        <section className="bg-white">
          <div className="content-container py-16 lg:py-20">
            <Reveal>
              <SectionHeading
                align="center"
                eyebrow="Shop the edit"
                title="Loved by the coast"
                actionHref="/store"
              />
            </Reveal>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {featured.slice(0, 4).map((product, i) => (
                <BreezeCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Collection split panels */}
      {blocks.slice(0, 2).map((block, bi) => (
        <section key={block.collection.id} className={bi % 2 === 0 ? "" : "bg-white"}>
          <div className="content-container grid items-center gap-10 py-16 lg:grid-cols-2">
            <Reveal className={bi % 2 === 1 ? "lg:order-2" : ""}>
              <div className="max-w-md">
                <p className="theme-eyebrow text-[#0e9384]">Curated collection</p>
                <h3 className="theme-section-title mt-2">{block.collection.title}</h3>
                <p className="mt-3 leading-7 text-[#123332]/60">
                  Handpicked pieces from {content.storeName}, gathered for slow
                  mornings and salty air.
                </p>
                <LocalizedClientLink
                  href={`/collections/${block.collection.handle}`}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#123332] px-6 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Browse the collection →
                </LocalizedClientLink>
              </div>
            </Reveal>
            <div className="grid grid-cols-2 gap-5">
              {block.products.slice(0, 2).map((product, i) => (
                <BreezeCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* New arrivals */}
      {arrivals.length > 0 && (
        <section className="bg-white">
          <div className="content-container py-16">
            <Reveal>
              <SectionHeading
                align="center"
                eyebrow="Fresh arrivals"
                title="Just washed ashore"
              />
            </Reveal>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {arrivals.slice(0, 4).map((product, i) => (
                <BreezeCard key={product.id} product={product} index={i} />
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
                align="center"
                eyebrow="Curated collection"
                title={block.collection.title}
                actionHref={`/collections/${block.collection.handle}`}
              />
            </Reveal>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {block.products.slice(0, 4).map((product, i) => (
                <BreezeCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
