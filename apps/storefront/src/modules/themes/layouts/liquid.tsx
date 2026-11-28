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
 * LIQUID GLASS — frosted glass color flow.
 *
 * Apple Liquid Glass language: translucent blurred surfaces over flowing
 * color blobs, specular edge highlights, squircle cards, floating CTA pills.
 * Reduced-transparency users get solid surfaces via the media query in
 * globals.css.
 */

export function LiquidCard({ product, index }: { product: ThemedProduct; index: number }) {
  return (
    <Reveal delay={Math.min(index, 7) * 70}>
      <ProductLink
        product={product}
        className="group block overflow-hidden rounded-[30px] border border-white/40 bg-white/50 p-3 shadow-[0_8px_32px_rgba(31,38,135,0.12)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_24px_60px_rgba(100,210,255,0.35)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[22px]">
          <ProductImage product={product} sizes="(max-width: 640px) 70vw, 320px" />
          <div className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-inset ring-white/60" />
          <span className="absolute left-3 top-3 rounded-full border border-white/60 bg-white/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1d1d1f] backdrop-blur-xl">
            Liquid
          </span>
        </div>
        <div className="flex items-start justify-between gap-2 px-1.5 pb-1.5 pt-4">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
              {product.title}
            </p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-[#1d1d1f]/50">
              Glass pick
            </p>
          </div>
          <PriceChip
            product={product}
            className="shrink-0 border border-white/60 bg-white/60 text-[#0071e3] backdrop-blur-xl"
          />
        </div>
      </ProductLink>
    </Reveal>
  )
}

export default function LiquidLayout({
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
    <div className="relative bg-[#eef2ff] text-[#1d1d1f]">
      {/* Flowing color field */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] overflow-hidden">
        <div className="absolute -left-32 top-0 h-[480px] w-[480px] rounded-full bg-[#a5b4fc]/50 blur-[120px] animate-theme-drift" />
        <div className="absolute right-[-120px] top-24 h-[440px] w-[440px] rounded-full bg-[#67e8f9]/45 blur-[120px] animate-theme-drift" />
        <div className="absolute left-1/3 top-64 h-[320px] w-[320px] rounded-full bg-[#f0abfc]/40 blur-[110px]" />
      </div>

      {/* Hero — floating glass panel */}
      {content.showHero && (
        <section className="relative">
          <div className="content-container relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <Reveal>
              <div className="rounded-[32px] border border-white/50 bg-white/40 p-8 shadow-[0_8px_32px_rgba(31,38,135,0.12)] backdrop-blur-2xl md:p-10">
                <p className="theme-eyebrow text-[#0071e3]">
                  {hero.eyebrow || content.storeName}
                </p>
                <h1 className="mt-3 max-w-lg text-5xl font-semibold leading-[1.02] tracking-[-0.03em] md:text-6xl">
                  {hero.title}
                </h1>
                <p className="mt-3 max-w-lg text-xl font-medium leading-snug text-[#1d1d1f]/70">
                  {hero.heading}
                </p>
                <p className="mt-4 max-w-lg text-[15px] leading-7 text-[#1d1d1f]/60">
                  {hero.description}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <LocalizedClientLink
                    href="/store"
                    className="rounded-full bg-[#1d1d1f]/90 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    {hero.primaryCta}
                  </LocalizedClientLink>
                  <LocalizedClientLink
                    href="/store"
                    className="rounded-full border border-white/60 bg-white/50 px-7 py-3 text-sm font-semibold backdrop-blur-xl transition-colors hover:bg-white/70"
                  >
                    {hero.secondaryCta}
                  </LocalizedClientLink>
                </div>

                {stats.length > 0 && (
                  <div className="mt-7 flex gap-6 border-t border-white/50 pt-5">
                    {stats.slice(0, 3).map((stat) => (
                      <div key={stat.label}>
                        <div className="text-lg font-semibold tracking-tight">
                          {stat.value}
                        </div>
                        <div className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-[#1d1d1f]/50">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>

            {content.showShowcase && (
              <Reveal delay={150} className="flex justify-center lg:justify-end">
                <LocalizedClientLink
                  href={showcase.href || "/store"}
                  className="group relative block w-full max-w-[420px]"
                >
                  <div className="absolute -inset-3 rounded-[40px] bg-gradient-to-br from-[#a5b4fc]/50 via-[#67e8f9]/40 to-[#f0abfc]/40 blur-2xl" />
                  <div className="relative overflow-hidden rounded-[36px] border border-white/50 bg-white/40 p-4 shadow-[0_8px_32px_rgba(31,38,135,0.15)] backdrop-blur-2xl transition-transform duration-300 group-hover:-translate-y-1">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[28px]">
                      {showcase.imageUrl ? (
                        <img
                          src={showcase.imageUrl}
                          alt={showcase.title}
                          className="theme-card-img absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#a5b4fc] via-[#67e8f9] to-[#f0abfc]" />
                      )}
                      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/60" />
                      <div className="absolute inset-x-5 bottom-5 rounded-[24px] border border-white/50 bg-white/55 p-5 shadow-[0_8px_32px_rgba(31,38,135,0.18)] backdrop-blur-2xl">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0071e3]">
                          {showcase.eyebrow}
                        </p>
                        <h3 className="mt-1 text-2xl font-semibold tracking-tight">
                          {showcase.title}
                        </h3>
                        {showcase.price ? (
                          <span className="mt-2 inline-block rounded-full bg-[#1d1d1f] px-3.5 py-1.5 text-sm font-semibold text-white">
                            {showcase.price}
                          </span>
                        ) : null}
                      </div>
                      <span className="absolute right-4 top-4 rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur-xl">
                        {showcase.badge || showcase.label}
                      </span>
                    </div>
                  </div>
                </LocalizedClientLink>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* Featured */}
      {content.showFeatured && featured.length > 0 && (
        <section className="content-container relative py-16 lg:py-20">
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="Shop the edit"
              title="Featured in glass"
              actionHref="/store"
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {featured.slice(0, 4).map((product, i) => (
              <LiquidCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Collection glass pills */}
      {blocks.slice(0, 2).map((block) => (
        <section key={block.collection.id} className="content-container relative pb-8">
          <Reveal>
            <LocalizedClientLink
              href={`/collections/${block.collection.handle}`}
              className="group relative block overflow-hidden rounded-[32px] border border-white/50 bg-white/40 p-8 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 md:p-10"
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#67e8f9]/40 blur-[80px]" />
              <p className="theme-eyebrow text-[#0071e3]">Curated collection</p>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                {block.collection.title}
              </h3>
              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1d1d1f] px-5 py-2.5 text-sm font-semibold text-white">
                Shop now
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </span>
            </LocalizedClientLink>
          </Reveal>
        </section>
      ))}

      {arrivals.length > 0 && (
        <section className="content-container relative py-14 lg:py-16">
          <Reveal>
            <SectionHeading eyebrow="Fresh arrivals" title="New in" />
          </Reveal>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {arrivals.slice(0, 4).map((product, i) => (
              <LiquidCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {blocks.slice(2).map((block) => (
        <section key={block.collection.id} className="content-container relative pb-16">
          <Reveal>
            <SectionHeading
              eyebrow="Curated collection"
              title={block.collection.title}
              actionHref={`/collections/${block.collection.handle}`}
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {block.products.slice(0, 4).map((product, i) => (
              <LiquidCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
