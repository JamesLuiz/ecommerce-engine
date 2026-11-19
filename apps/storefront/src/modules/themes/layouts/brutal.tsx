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
 * BRUTALIST — raw poster-style edges.
 *
 * Oversized outline headline with an electric-blue highlight block,
 * a sticker-wall showcase collage, numbered index-style product list cards
 * with hard borders, and alternating color-block collection panels.
 * Sharp, loud, zero border-radius.
 */

export function BrutalCard({ product, index }: { product: ThemedProduct; index: number }) {
  return (
    <Reveal delay={Math.min(index, 7) * 60}>
      <ProductLink
        product={product}
        className="group grid grid-cols-[110px_1fr] border-2 border-[#101010] bg-white transition-all duration-150 hover:-translate-y-1 hover:shadow-[8px_8px_0_#2545ff] sm:block"
      >
        <div className="relative aspect-square overflow-hidden border-b-0 border-r-2 border-[#101010] sm:border-b-2 sm:border-r-0">
          <ProductImage product={product} sizes="(max-width: 640px) 40vw, 300px" />
          <span className="absolute left-2 top-2 bg-[#101010] px-2 py-0.5 font-mono text-[11px] font-bold text-white">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <div className="flex min-w-0 flex-col justify-center p-3 sm:p-4">
          <p className="truncate font-mono text-sm font-bold uppercase text-[#101010]">
            {product.title}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="hidden font-mono text-[10px] uppercase text-[#101010]/50 sm:inline">
              Index item
            </span>
            <PriceChip
              product={product}
              className="rounded-none border-2 border-[#101010] bg-[#ff5da2] p-0 px-2 py-1 font-mono text-xs text-white"
            />
          </div>
        </div>
      </ProductLink>
    </Reveal>
  )
}

export default function BrutalLayout({
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
    <div className="bg-[#fdfbf3] font-mono text-[#101010]">
      {/* Hero — poster headline with highlight block + sticker wall */}
      {content.showHero && (
        <section className="border-b-2 border-[#101010]">
          <div className="content-container grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
            <Reveal>
              <p className="inline-block border-2 border-[#101010] bg-[#ff5da2] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
                {hero.eyebrow || content.storeName}
              </p>
              <h1 className="mt-4 text-6xl font-black uppercase leading-[0.85] tracking-tight md:text-8xl">
                {hero.title}
                <br />
                <span className="bg-[#2545ff] px-2 text-white">{hero.heading}</span>
              </h1>
              <p className="mt-5 max-w-lg border-l-4 border-[#ff5da2] pl-4 text-base leading-7">
                {hero.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <LocalizedClientLink
                  href="/store"
                  className="border-2 border-[#101010] bg-[#101010] px-7 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[5px_5px_0_#2545ff] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_#2545ff]"
                >
                  {hero.primaryCta} →
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/store"
                  className="border-2 border-[#101010] bg-white px-7 py-3 text-sm font-bold uppercase tracking-[0.12em] shadow-[5px_5px_0_#101010] transition-all hover:-translate-y-0.5"
                >
                  {hero.secondaryCta}
                </LocalizedClientLink>
              </div>

              {stats.length > 0 && (
                <div className="mt-10 flex gap-0 border-2 border-[#101010]">
                  {stats.slice(0, 3).map((stat, i) => (
                    <div
                      key={stat.label}
                      className={
                        "flex-1 px-4 py-3 " +
                        (i > 0 ? "border-l-2 border-[#101010] " : "") +
                        (i === 0 ? "bg-[#101010] text-white" : "bg-white")
                      }
                    >
                      <div className="text-xl font-black">{stat.value}</div>
                      <div className="text-[10px] uppercase tracking-[0.16em] opacity-60">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>

            {content.showShowcase && (
              <Reveal delay={150}>
                <LocalizedClientLink
                  href={showcase.href || "/store"}
                  className="group relative block border-2 border-[#101010] bg-white p-4 shadow-[10px_10px_0_#101010]"
                >
                  <div className="border-2 border-[#101010]">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {showcase.imageUrl ? (
                        <img
                          src={showcase.imageUrl}
                          alt={showcase.title}
                          className="theme-card-img absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#2545ff_0_18px,#ff5da2_18px_36px)]" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-4">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">
                        {showcase.eyebrow} / {showcase.label}
                      </p>
                      <h3 className="truncate text-2xl font-black uppercase">
                        {showcase.title}
                      </h3>
                    </div>
                    {showcase.price ? (
                      <span className="shrink-0 -rotate-2 border-2 border-[#101010] bg-[#ffd400] px-3 py-1.5 text-sm font-black">
                        {showcase.price}
                      </span>
                    ) : null}
                  </div>
                  <span className="absolute -right-3 -top-3 rotate-6 border-2 border-[#101010] bg-[#2545ff] px-3 py-1 text-xs font-black uppercase text-white">
                    {showcase.badge}
                  </span>
                </LocalizedClientLink>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* Featured — index list cards */}
      {content.showFeatured && featured.length > 0 && (
        <section className="content-container py-16">
          <Reveal>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-[#101010] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2545ff]">
                  001 — Shop the edit
                </p>
                <h2 className="mt-1 text-4xl font-black uppercase tracking-tight md:text-5xl">
                  Featured index
                </h2>
              </div>
              <LocalizedClientLink
                href="/store"
                className="border-2 border-[#101010] bg-white px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] shadow-[4px_4px_0_#101010] transition-all hover:-translate-y-0.5"
              >
                View all →
              </LocalizedClientLink>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.slice(0, 4).map((product, i) => (
              <BrutalCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Collection panels — alternating color blocks */}
      {blocks.slice(0, 2).map((block, bi) => (
        <section
          key={block.collection.id}
          className={
            "border-y-2 border-[#101010] " +
            (bi % 2 === 0 ? "bg-[#2545ff] text-white" : "bg-[#ffd400]")
          }
        >
          <div className="content-container flex flex-wrap items-center justify-between gap-6 py-12">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">
                Collection / {String(bi + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 text-4xl font-black uppercase tracking-tight md:text-6xl">
                {block.collection.title}
              </h3>
            </Reveal>
            <Reveal delay={120}>
              <LocalizedClientLink
                href={`/collections/${block.collection.handle}`}
                className="border-2 border-[#101010] bg-white px-8 py-4 text-sm font-black uppercase tracking-[0.12em] text-[#101010] shadow-[6px_6px_0_#101010] transition-all hover:-translate-y-1"
              >
                Open →
              </LocalizedClientLink>
            </Reveal>
          </div>
        </section>
      ))}

      {/* New arrivals */}
      {arrivals.length > 0 && (
        <section className="content-container py-16">
          <Reveal>
            <SectionHeading eyebrow="002 — Fresh arrivals" title="New in stock" />
          </Reveal>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {arrivals.slice(0, 4).map((product, i) => (
              <BrutalCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {blocks.slice(2).map((block, bi) => (
        <section key={block.collection.id} className="content-container pb-16">
          <Reveal>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-[#101010] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2545ff]">
                  {String(bi + 3).padStart(3, "0")} — Collection
                </p>
                <h2 className="mt-1 text-4xl font-black uppercase tracking-tight">
                  {block.collection.title}
                </h2>
              </div>
              <LocalizedClientLink
                href={`/collections/${block.collection.handle}`}
                className="border-2 border-[#101010] bg-white px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] shadow-[4px_4px_0_#101010] transition-all hover:-translate-y-0.5"
              >
                View all →
              </LocalizedClientLink>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {block.products.slice(0, 4).map((product, i) => (
              <BrutalCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
