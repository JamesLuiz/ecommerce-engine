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
 * AURORA — dreamy gradient-glow storefront.
 *
 * Deep-space hero with drifting aurora blobs and a floating glass product
 * card, an overlapping marquee ribbon, glow-ring product cards, and wide
 * collection banners. Same merchant content, rearranged into night-sky drama.
 */

export function AuroraCard({ product, index }: { product: ThemedProduct; index: number }) {
  return (
    <Reveal delay={Math.min(index, 7) * 70}>
      <ProductLink
        product={product}
        className="group block overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.05] p-3 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-fuchsia-300/40 hover:shadow-[0_24px_70px_rgba(167,139,250,0.35)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[18px]">
          <ProductImage product={product} sizes="(max-width: 640px) 70vw, 320px" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d0a1f]/70 via-transparent to-transparent opacity-80" />
          <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
            New
          </span>
        </div>
        <div className="flex items-start justify-between gap-2 px-1.5 pb-1.5 pt-4">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-white">
              {product.title}
            </p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-white/50">
              Aurora pick
            </p>
          </div>
          <PriceChip
            product={product}
            className="shrink-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
          />
        </div>
      </ProductLink>
    </Reveal>
  )
}

const marqueeWords = (storeName: string) => [
  storeName,
  "New drop",
  "Free delivery",
  "Shop the edit",
  storeName,
  "Limited glow",
]

export default function AuroraLayout({
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
  const marquee = [...marqueeWords(content.storeName), ...marqueeWords(content.storeName)]

  return (
    <div className="bg-[#0d0a1f] text-white">
      {/* Hero — deep space with drifting aurora blobs + floating glass card */}
      {content.showHero && (
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-32 top-0 h-[480px] w-[480px] rounded-full bg-violet-600/40 blur-[130px] animate-theme-drift" />
          <div className="pointer-events-none absolute -right-24 top-40 h-[420px] w-[420px] rounded-full bg-fuchsia-500/30 blur-[130px] animate-theme-drift" />
          <div className="pointer-events-none absolute left-1/3 top-64 h-[300px] w-[300px] rounded-full bg-cyan-400/20 blur-[110px]" />

          <div className="content-container relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <Reveal>
              <p className="theme-eyebrow text-fuchsia-300">
                {hero.eyebrow || content.storeName}
              </p>
              <h1 className="mt-4 bg-gradient-to-br from-white via-violet-200 to-fuchsia-300 bg-clip-text text-5xl font-bold leading-[0.98] tracking-[-0.05em] text-transparent md:text-7xl">
                {hero.title}
              </h1>
              <p className="mt-5 max-w-lg text-xl font-medium leading-snug text-white/85">
                {hero.heading}
              </p>
              <p className="mt-4 max-w-lg leading-7 text-white/60">
                {hero.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <LocalizedClientLink
                  href="/store"
                  className="theme-shine rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_16px_50px_rgba(192,38,211,0.45)] transition-transform duration-200 hover:-translate-y-0.5"
                >
                  {hero.primaryCta}
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/store"
                  className="rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10"
                >
                  {hero.secondaryCta}
                </LocalizedClientLink>
              </div>

              {stats.length > 0 && (
                <div className="mt-10 flex gap-8">
                  {stats.slice(0, 3).map((stat) => (
                    <div key={stat.label}>
                      <div className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-2xl font-bold text-transparent">
                        {stat.value}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/50">
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
                  className="group relative w-full max-w-[420px]"
                >
                  <div className="absolute -inset-3 rounded-[36px] bg-gradient-to-br from-violet-500/50 via-fuchsia-500/30 to-cyan-400/40 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="animate-theme-float relative overflow-hidden rounded-[28px] border border-white/15 bg-white/10 p-4 backdrop-blur-2xl">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[20px]">
                      {showcase.imageUrl ? (
                        <img
                          src={showcase.imageUrl}
                          alt={showcase.title}
                          className="theme-card-img absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-800" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute inset-x-5 bottom-5">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-fuchsia-200">
                          {showcase.eyebrow}
                        </p>
                        <h3 className="mt-1 text-2xl font-bold text-white">
                          {showcase.title}
                        </h3>
                        {showcase.price ? (
                          <span className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white backdrop-blur-md">
                            {showcase.price}
                          </span>
                        ) : null}
                      </div>
                      <span className="absolute right-4 top-4 rounded-full bg-fuchsia-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                        {showcase.badge || showcase.label}
                      </span>
                    </div>
                  </div>
                </LocalizedClientLink>
              </Reveal>
            )}
          </div>

          {/* Marquee ribbon overlapping the hero bottom */}
          <div className="relative border-y border-white/10 bg-white/[0.03] py-3 backdrop-blur-sm">
            <div className="flex w-max animate-theme-marquee gap-10 whitespace-nowrap">
              {marquee.map((word, i) => (
                <span
                  key={`${word}-${i}`}
                  className="text-xs font-semibold uppercase tracking-[0.28em] text-white/50"
                >
                  {word} <span className="ml-10 text-fuchsia-400">✦</span>
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured — glow-ring cards */}
      {content.showFeatured && featured.length > 0 && (
        <section className="content-container py-16 lg:py-20">
          <Reveal>
            <SectionHeading
              dark
              eyebrow="Shop the edit"
              title="Featured products"
              actionHref="/store"
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {featured.slice(0, 4).map((product, i) => (
              <AuroraCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Collection banners — wide gradient strips */}
      {blocks.slice(0, 2).map((block) => (
        <section key={block.collection.id} className="content-container pb-6">
          <Reveal>
            <LocalizedClientLink
              href={`/collections/${block.collection.handle}`}
              className="group relative block overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-r from-violet-700/60 via-fuchsia-700/40 to-indigo-800/60 px-8 py-10 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 md:px-12"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-fuchsia-400/30 blur-[80px]" />
              <p className="theme-eyebrow text-fuchsia-200">Curated collection</p>
              <h3 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
                {block.collection.title}
              </h3>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
                Explore the collection
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </span>
            </LocalizedClientLink>
          </Reveal>
        </section>
      ))}

      {/* New arrivals */}
      {arrivals.length > 0 && (
        <section className="content-container py-14 lg:py-16">
          <Reveal>
            <SectionHeading dark eyebrow="Fresh arrivals" title="New in" />
          </Reveal>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {arrivals.slice(0, 4).map((product, i) => (
              <AuroraCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Remaining collection rails */}
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
              <AuroraCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
