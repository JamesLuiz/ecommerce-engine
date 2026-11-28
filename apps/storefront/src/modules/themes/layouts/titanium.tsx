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
 * TITANIUM — dark pro-grade premium.
 *
 * Apple Pro language: deep black hero, machined-metal stat HUD, glass pro
 * showcase card, monochrome product tiles with titanium rims and neon-blue
 * price chips. Motion stays tight and confident.
 */

export function TitaniumCard({ product, index }: { product: ThemedProduct; index: number }) {
  return (
    <Reveal delay={Math.min(index, 7) * 60}>
      <ProductLink
        product={product}
        className="group block overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-[#b9bec7]/50 hover:shadow-[0_24px_60px_rgba(185,190,199,0.18)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-[#161617]">
          <ProductImage product={product} sizes="(max-width: 640px) 70vw, 320px" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <span className="absolute left-3 top-3 rounded-md border border-white/20 bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#e8e8ed] backdrop-blur-md">
            Pro
          </span>
        </div>
        <div className="flex items-start justify-between gap-2 px-1.5 pb-1.5 pt-4">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[#f5f5f7]">
              {product.title}
            </p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-white/40">
              Titanium grade
            </p>
          </div>
          <PriceChip
            product={product}
            className="shrink-0 border border-[#2997ff]/40 bg-[#2997ff]/15 text-[#2997ff]"
          />
        </div>
      </ProductLink>
    </Reveal>
  )
}

export default function TitaniumLayout({
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
    <div className="bg-black text-[#f5f5f7]">
      {/* Hero — deep black with titanium sheen */}
      {content.showHero && (
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#3a3a3c]/60 to-transparent blur-[110px]" />
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "100% 56px",
            }}
          />
          <div className="content-container relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[13px] font-medium text-[#a1a1a6] backdrop-blur-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2997ff]" />
                {hero.eyebrow || content.storeName}
              </p>
              <h1 className="mt-5 max-w-xl bg-gradient-to-b from-white via-[#e8e8ed] to-[#86868b] bg-clip-text text-5xl font-semibold leading-[1.02] tracking-[-0.03em] text-transparent md:text-7xl">
                {hero.title}
              </h1>
              <p className="mt-4 max-w-lg text-xl font-medium leading-snug text-[#a1a1a6]">
                {hero.heading}
              </p>
              <p className="mt-4 max-w-lg text-[15px] leading-7 text-[#86868b]">
                {hero.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LocalizedClientLink
                  href="/store"
                  className="rounded-full bg-[#2997ff] px-7 py-3 text-[15px] font-medium text-white shadow-[0_16px_50px_rgba(41,151,255,0.4)] transition-all duration-200 hover:bg-[#0071e3]"
                >
                  {hero.primaryCta}
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/store"
                  className="rounded-full border border-white/20 bg-white/5 px-7 py-3 text-[15px] font-medium text-white backdrop-blur transition-colors hover:bg-white/10"
                >
                  {hero.secondaryCta}
                </LocalizedClientLink>
              </div>

              {stats.length > 0 && (
                <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
                  {stats.slice(0, 3).map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-xl"
                    >
                      <div className="bg-gradient-to-b from-white to-[#86868b] bg-clip-text text-lg font-semibold text-transparent">
                        {stat.value}
                      </div>
                      <div className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-[#86868b]">
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
                  className="group relative block w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/15 bg-gradient-to-b from-white/10 to-white/[0.03] p-4 shadow-[0_40px_100px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-[#161617]">
                    {showcase.imageUrl ? (
                      <img
                        src={showcase.imageUrl}
                        alt={showcase.title}
                        className="theme-card-img absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#3a3a3c] via-[#161617] to-black" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-white/5" />
                    <span className="absolute left-4 top-4 rounded-full border border-white/25 bg-black/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md">
                      {showcase.badge || showcase.label}
                    </span>
                    <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/15 bg-black/55 p-4 backdrop-blur-xl">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[#a1a1a6]">
                        {showcase.eyebrow}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">
                        {showcase.title}
                      </h3>
                      {showcase.price ? (
                        <p className="mt-1 text-[15px] font-semibold text-[#2997ff]">
                          {showcase.price}
                        </p>
                      ) : null}
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
        <section className="content-container border-t border-white/10 py-16 lg:py-20">
          <Reveal>
            <SectionHeading
              dark
              eyebrow="Pro lineup"
              title="Featured products"
              actionHref="/store"
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {featured.slice(0, 4).map((product, i) => (
              <TitaniumCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Collection bands */}
      {blocks.slice(0, 2).map((block) => (
        <section key={block.collection.id} className="content-container pb-8">
          <Reveal>
            <LocalizedClientLink
              href={`/collections/${block.collection.handle}`}
              className="group relative block overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-r from-white/[0.08] to-transparent p-8 backdrop-blur-xl transition-all duration-300 hover:border-[#2997ff]/40 md:p-10"
            >
              <p className="theme-eyebrow text-[#2997ff]">Pro collection</p>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                {block.collection.title}
              </h3>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#a1a1a6]">
                Explore the lineup
                <span className="text-[#2997ff] transition-transform duration-200 group-hover:translate-x-1">→</span>
              </span>
            </LocalizedClientLink>
          </Reveal>
        </section>
      ))}

      {arrivals.length > 0 && (
        <section className="content-container py-14 lg:py-16">
          <Reveal>
            <SectionHeading dark eyebrow="Fresh arrivals" title="New in" />
          </Reveal>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {arrivals.slice(0, 4).map((product, i) => (
              <TitaniumCard key={product.id} product={product} index={i} />
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
              <TitaniumCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
