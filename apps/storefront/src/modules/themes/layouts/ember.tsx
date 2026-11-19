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
 * EMBER — warm artisan craft.
 *
 * Fireside hero with ember glow orbs and grain, a kiln-card showcase with a
 * stamped badge, hand-thrown product cards with warm rims and glowing price tags,
 * and horizontal story-strip collection panels. Everything glows softly.
 */

export function EmberCard({ product, index }: { product: ThemedProduct; index: number }) {
  return (
    <Reveal delay={Math.min(index, 7) * 70}>
      <ProductLink
        product={product}
        className="group block overflow-hidden rounded-[22px] border border-[#ffb464]/20 bg-white/[0.04] p-3 backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#ff8a3d]/50 hover:shadow-[0_24px_60px_rgba(255,138,61,0.28)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[16px]">
          <ProductImage product={product} sizes="(max-width: 640px) 70vw, 320px" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1c1009]/60 via-transparent to-transparent" />
        </div>
        <div className="px-1.5 pb-1.5 pt-4">
          <p className="truncate text-[15px] font-semibold text-[#f7e8d5]">
            {product.title}
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-[#f7e8d5]/50">
            Hand-finished
          </p>
          <div className="mt-3">
            <PriceChip
              product={product}
              className="bg-gradient-to-r from-[#ff8a3d] to-[#ffc53d] text-[#1c1009]"
            />
          </div>
        </div>
      </ProductLink>
    </Reveal>
  )
}

export default function EmberLayout({
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
    <div className="bg-[#1c1009] text-[#f7e8d5]">
      {/* Hero — fireside glow + kiln card */}
      {content.showHero && (
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-28 bottom-0 h-[420px] w-[420px] rounded-full bg-[#ff8a3d]/25 blur-[130px] animate-theme-drift" />
          <div className="pointer-events-none absolute -right-24 top-0 h-[380px] w-[380px] rounded-full bg-[#ffc53d]/15 blur-[130px] animate-theme-drift" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,180,100,0.12) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />

          <div className="content-container relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <Reveal>
              <p className="theme-eyebrow text-[#ffb464]">
                ◆ {hero.eyebrow || "Fired & finished"}
              </p>
              <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-[1.0] tracking-[-0.04em] md:text-7xl">
                {hero.title}{" "}
                <span className="bg-gradient-to-r from-[#ff8a3d] to-[#ffc53d] bg-clip-text text-transparent">
                  {hero.heading}
                </span>
              </h1>
              <p className="mt-5 max-w-lg leading-7 text-[#f7e8d5]/65">
                {hero.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <LocalizedClientLink
                  href="/store"
                  className="theme-shine rounded-full bg-gradient-to-r from-[#ff8a3d] to-[#ffc53d] px-7 py-3.5 text-sm font-bold text-[#1c1009] shadow-[0_16px_50px_rgba(255,138,61,0.45)] transition-transform duration-200 hover:-translate-y-0.5"
                >
                  {hero.primaryCta}
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/store"
                  className="rounded-full border border-[#ffb464]/30 bg-white/5 px-7 py-3.5 text-sm font-semibold text-[#f7e8d5] backdrop-blur transition-colors hover:bg-white/10"
                >
                  {hero.secondaryCta}
                </LocalizedClientLink>
              </div>

              {stats.length > 0 && (
                <div className="mt-10 flex gap-8">
                  {stats.slice(0, 3).map((stat) => (
                    <div key={stat.label}>
                      <div className="text-2xl font-bold text-[#ffc53d]">
                        {stat.value}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#f7e8d5]/50">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>

            {content.showShowcase && (
              <Reveal delay={150} className="flex justify-center lg:justify-end">
                <LocalizedClientLink
                  href={showcase.href || "/store"}
                  className="group relative w-full max-w-[400px] overflow-hidden rounded-[26px] border border-[#ffb464]/25 bg-[#2a170c] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#ff8a3d]/30 blur-[60px]" />
                  <div className="relative aspect-square overflow-hidden rounded-[18px]">
                    {showcase.imageUrl ? (
                      <img
                        src={showcase.imageUrl}
                        alt={showcase.title}
                        className="theme-card-img absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#ff8a3d] via-[#a34a12] to-[#1c1009]" />
                    )}
                    <span className="absolute left-1/2 top-5 -translate-x-1/2 -rotate-3 rounded-full border-2 border-dashed border-[#ffc53d]/70 bg-black/50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffc53d] backdrop-blur-sm">
                      {showcase.badge || showcase.label}
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-3 px-1 pb-1 pt-5">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-[#ffb464]">
                        {showcase.eyebrow}
                      </p>
                      <h3 className="mt-1 truncate text-2xl font-semibold">
                        {showcase.title}
                      </h3>
                    </div>
                    {showcase.price ? (
                      <span className="shrink-0 rounded-2xl bg-gradient-to-r from-[#ff8a3d] to-[#ffc53d] px-4 py-2 text-sm font-bold text-[#1c1009]">
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
              dark
              eyebrow="Shop the edit"
              title="Fresh from the kiln"
              actionHref="/store"
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {featured.slice(0, 4).map((product, i) => (
              <EmberCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Story strips — horizontal collection panels */}
      {blocks.slice(0, 2).map((block) => (
        <section key={block.collection.id} className="content-container pb-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[26px] border border-[#ffb464]/25 bg-gradient-to-r from-[#2a170c] to-[#1c1009] p-8 md:p-10">
              <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#ff8a3d]/20 blur-[70px]" />
              <div className="relative flex flex-wrap items-center justify-between gap-5">
                <div>
                  <p className="theme-eyebrow text-[#ffb464]">Maker story</p>
                  <h3 className="mt-2 text-3xl font-semibold md:text-4xl">
                    {block.collection.title}
                  </h3>
                </div>
                <LocalizedClientLink
                  href={`/collections/${block.collection.handle}`}
                  className="rounded-full bg-gradient-to-r from-[#ff8a3d] to-[#ffc53d] px-7 py-3 text-sm font-bold text-[#1c1009] transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Explore →
                </LocalizedClientLink>
              </div>
            </div>
          </Reveal>
        </section>
      ))}

      {/* New arrivals */}
      {arrivals.length > 0 && (
        <section className="content-container py-14">
          <Reveal>
            <SectionHeading dark eyebrow="Fresh arrivals" title="Still warm" />
          </Reveal>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {arrivals.slice(0, 4).map((product, i) => (
              <EmberCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {blocks.slice(2).map((block) => (
        <section key={block.collection.id} className="content-container pb-16">
          <Reveal>
            <SectionHeading
              dark
              eyebrow="Curated collection"
              title={block.collection.title}
              actionHref={`/collections/${block.collection.handle}`}
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {block.products.slice(0, 4).map((product, i) => (
              <EmberCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
