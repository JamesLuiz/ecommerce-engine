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
 * STREETLINE — bold urban energy.
 *
 * Oversized condensed headline hero on cream with an orange sticker badge,
 * a rotated ticket-style showcase card, a black marquee ticker, chunky
 * bordered product cards with hard offset shadows, and high-contrast
 * black collection panels. Snappy hover motion throughout.
 */

export function StreetCard({ product, index }: { product: ThemedProduct; index: number }) {
  return (
    <Reveal delay={Math.min(index, 7) * 60}>
      <ProductLink
        product={product}
        className="group block border-2 border-[#141414] bg-white shadow-[6px_6px_0_#141414] transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[10px_10px_0_#ff4d00]"
      >
        <div className="relative aspect-square overflow-hidden border-b-2 border-[#141414]">
          <ProductImage product={product} sizes="(max-width: 640px) 70vw, 320px" />
          <span className="absolute left-3 top-3 -rotate-3 border-2 border-[#141414] bg-[#ffd400] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#141414]">
            Hot
          </span>
        </div>
        <div className="p-4">
          <p className="truncate text-base font-black uppercase tracking-tight text-[#141414]">
            {product.title}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#141414]/50">
              Street pick
            </span>
            <PriceChip
              product={product}
              className="border-2 border-[#141414] bg-[#ff4d00] text-white"
            />
          </div>
        </div>
      </ProductLink>
    </Reveal>
  )
}

function Ticker({ items, dark = false }: { items: string[]; dark?: boolean }) {
  const row = [...items, ...items]

  return (
    <div
      className={
        dark
          ? "overflow-hidden border-y-2 border-[#141414] bg-[#141414] py-3 text-white"
          : "overflow-hidden border-y-2 border-[#141414] bg-[#ffd400] py-3 text-[#141414]"
      }
    >
      <div className="flex w-max animate-theme-marquee gap-8 whitespace-nowrap">
        {row.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="text-sm font-black uppercase tracking-[0.2em]"
          >
            {word} <span className="ml-8">★</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function StreetLayout({
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
    <div className="bg-[#f4f1ea] text-[#141414]">
      {/* Hero — giant condensed type + sticker badge + ticket card */}
      {content.showHero && (
        <section className="relative overflow-hidden border-b-2 border-[#141414]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                "radial-gradient(rgba(20,20,20,0.14) 1.5px, transparent 1.5px)",
              backgroundSize: "26px 26px",
            }}
          />
          <div className="content-container relative grid items-center gap-12 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
            <Reveal>
              <div className="inline-flex -rotate-2 items-center gap-2 border-2 border-[#141414] bg-[#ff4d00] px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[4px_4px_0_#141414]">
                ★ {hero.eyebrow || content.storeName}
              </div>
              <h1 className="mt-5 text-6xl font-black uppercase leading-[0.88] tracking-tight md:text-8xl">
                {hero.title}
              </h1>
              <p className="mt-4 inline-block -rotate-1 bg-[#141414] px-4 py-2 text-lg font-bold uppercase tracking-tight text-[#ffd400] md:text-xl">
                {hero.heading}
              </p>
              <p className="mt-5 max-w-lg font-medium leading-7 text-[#141414]/70">
                {hero.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <LocalizedClientLink
                  href="/store"
                  className="border-2 border-[#141414] bg-[#141414] px-8 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[5px_5px_0_#ff4d00] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_#ff4d00]"
                >
                  {hero.primaryCta}
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/store"
                  className="border-2 border-[#141414] bg-white px-8 py-3.5 text-sm font-black uppercase tracking-[0.14em] shadow-[5px_5px_0_#141414] transition-all duration-200 hover:-translate-y-0.5"
                >
                  {hero.secondaryCta}
                </LocalizedClientLink>
              </div>

              {stats.length > 0 && (
                <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
                  {stats.slice(0, 3).map((stat) => (
                    <div
                      key={stat.label}
                      className="border-2 border-[#141414] bg-white px-3 py-3 text-center shadow-[4px_4px_0_#141414]"
                    >
                      <div className="text-xl font-black">{stat.value}</div>
                      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#141414]/60">
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
                  className="group relative w-full max-w-[400px] rotate-2 border-2 border-[#141414] bg-white shadow-[10px_10px_0_#141414] transition-transform duration-200 hover:rotate-0"
                >
                  <div className="border-b-2 border-dashed border-[#141414]/30 p-4">
                    <div className="flex items-center justify-between">
                      <span className="bg-[#141414] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                        {showcase.label}
                      </span>
                      <span className="bg-[#ff4d00] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                        {showcase.badge}
                      </span>
                    </div>
                  </div>
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {showcase.imageUrl ? (
                      <img
                        src={showcase.imageUrl}
                        alt={showcase.title}
                        className="theme-card-img absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#ff4d00] via-[#ff9d00] to-[#ffd400]" />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t-2 border-dashed border-[#141414]/30 p-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#141414]/50">
                        {showcase.eyebrow}
                      </p>
                      <h3 className="truncate text-xl font-black uppercase tracking-tight">
                        {showcase.title}
                      </h3>
                    </div>
                    {showcase.price ? (
                      <span className="shrink-0 -rotate-3 border-2 border-[#141414] bg-[#ffd400] px-3 py-1.5 text-sm font-black">
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

      <Ticker
        items={[content.storeName, "New drop", hero.primaryCta, "Shop the edit"]}
      />

      {/* Featured — chunky bordered cards */}
      {content.showFeatured && featured.length > 0 && (
        <section className="content-container py-16">
          <Reveal>
            <SectionHeading
              eyebrow="Shop the edit"
              title="Featured heat"
              actionHref="/store"
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {featured.slice(0, 4).map((product, i) => (
              <StreetCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Collection panels — black slabs */}
      {blocks.slice(0, 2).map((block) => (
        <section key={block.collection.id} className="content-container pb-8">
          <Reveal>
            <div className="border-2 border-[#141414] bg-[#141414] p-8 text-white shadow-[8px_8px_0_#ff4d00] md:p-10">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="theme-eyebrow text-[#ffd400]">Curated collection</p>
                  <h3 className="mt-2 text-3xl font-black uppercase tracking-tight md:text-4xl">
                    {block.collection.title}
                  </h3>
                </div>
                <LocalizedClientLink
                  href={`/collections/${block.collection.handle}`}
                  className="border-2 border-white px-6 py-3 text-xs font-black uppercase tracking-[0.18em] transition-colors hover:bg-white hover:text-[#141414]"
                >
                  Shop now →
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
            <SectionHeading eyebrow="Fresh arrivals" title="New drops" />
          </Reveal>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {arrivals.slice(0, 4).map((product, i) => (
              <StreetCard key={product.id} product={product} index={i} />
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
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {block.products.slice(0, 4).map((product, i) => (
              <StreetCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      ))}

      <Ticker
        dark
        items={[content.storeName, "Limited heat", "Don't sleep", hero.secondaryCta]}
      />
    </div>
  )
}
