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
 * CHROME — futuristic glass tech.
 *
 * Deep-navy hero with a glowing grid floor and glass HUD stat chips, a
 * holographic showcase card with a shine sweep, scan-line product cards with
 * neon price chips, and full-bleed neon collection banners. Crisp digital
 * motion with glow hovers.
 */

export function ChromeCard({ product, index }: { product: ThemedProduct; index: number }) {
  return (
    <Reveal delay={Math.min(index, 7) * 70}>
      <ProductLink
        product={product}
        className="group block overflow-hidden rounded-2xl border border-[#94b8ff]/20 bg-[#94b8ff]/[0.05] p-2.5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-[#38e1ff]/60 hover:shadow-[0_20px_60px_rgba(56,225,255,0.25)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
          <ProductImage product={product} sizes="(max-width: 640px) 70vw, 320px" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05070d]/70 via-transparent to-transparent" />
          {/* scan line */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-10 -translate-y-10 bg-gradient-to-b from-transparent via-[#38e1ff]/30 to-transparent transition-transform duration-700 group-hover:translate-y-[420px]" />
          <span className="absolute right-2.5 top-2.5 rounded-md border border-[#38e1ff]/50 bg-[#05070d]/70 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#38e1ff] backdrop-blur-sm">
            ◆ New
          </span>
        </div>
        <div className="flex items-start justify-between gap-2 px-1.5 pb-1.5 pt-3.5">
          <div className="min-w-0">
            <p className="truncate font-mono text-[13px] font-semibold text-[#e8f1ff]">
              {product.title}
            </p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8f1ff]/45">
              {"// featured_unit"}
            </p>
          </div>
          <PriceChip
            product={product}
            className="shrink-0 border border-[#38e1ff]/40 bg-[#38e1ff]/10 font-mono text-[#38e1ff]"
          />
        </div>
      </ProductLink>
    </Reveal>
  )
}

export default function ChromeLayout({
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
    <div className="bg-[#05070d] font-mono text-[#e8f1ff]">
      {/* Hero — grid floor + glass HUD */}
      {content.showHero && (
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(56,225,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(56,225,255,0.07) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage:
                "radial-gradient(ellipse 90% 70% at 50% 30%, black 30%, transparent 75%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 90% 70% at 50% 30%, black 30%, transparent 75%)",
            }}
          />
          <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[720px] -translate-x-1/2 rounded-full bg-[#7c7cff]/25 blur-[130px]" />

          <div className="content-container relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <Reveal>
              <p className="theme-eyebrow text-[#38e1ff]">
                {"// " + (hero.eyebrow || content.storeName)}
              </p>
              <h1 className="mt-4 text-5xl font-bold leading-[0.98] tracking-tight md:text-7xl">
                {hero.title}{" "}
                <span className="bg-gradient-to-r from-[#38e1ff] to-[#7c7cff] bg-clip-text text-transparent">
                  {hero.heading}
                </span>
              </h1>
              <p className="mt-5 max-w-lg leading-7 text-[#e8f1ff]/60">
                {hero.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <LocalizedClientLink
                  href="/store"
                  className="theme-shine rounded-xl bg-gradient-to-r from-[#38e1ff] to-[#7c7cff] px-7 py-3.5 text-sm font-bold text-[#05070d] shadow-[0_16px_50px_rgba(56,225,255,0.4)] transition-transform duration-200 hover:-translate-y-0.5"
                >
                  {hero.primaryCta} →
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/store"
                  className="rounded-xl border border-[#94b8ff]/30 bg-white/5 px-7 py-3.5 text-sm font-bold backdrop-blur transition-colors hover:border-[#38e1ff]/60 hover:text-[#38e1ff]"
                >
                  {hero.secondaryCta}
                </LocalizedClientLink>
              </div>

              {stats.length > 0 && (
                <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
                  {stats.slice(0, 3).map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-[#94b8ff]/20 bg-white/[0.04] px-3 py-3 backdrop-blur-xl"
                    >
                      <div className="text-lg font-bold text-[#38e1ff]">
                        {stat.value}
                      </div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[#e8f1ff]/50">
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
                  className="group relative w-full max-w-[400px]"
                >
                  <div className="absolute -inset-2 rounded-[26px] bg-gradient-to-br from-[#38e1ff]/40 via-[#7c7cff]/25 to-transparent blur-xl transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="theme-shine relative overflow-hidden rounded-[22px] border border-[#94b8ff]/25 bg-white/[0.05] p-4 backdrop-blur-2xl">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
                      {showcase.imageUrl ? (
                        <img
                          src={showcase.imageUrl}
                          alt={showcase.title}
                          className="theme-card-img absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0a2540] via-[#1c1c5e] to-[#05070d]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#05070d]/80 via-transparent to-transparent" />
                      <span className="absolute left-4 top-4 rounded-md bg-[#38e1ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#05070d]">
                        {showcase.badge || showcase.label}
                      </span>
                      <div className="absolute inset-x-4 bottom-4 rounded-xl border border-white/10 bg-[#05070d]/70 p-4 backdrop-blur-xl">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#38e1ff]">
                          {showcase.eyebrow}
                        </p>
                        <h3 className="mt-1 text-xl font-bold">{showcase.title}</h3>
                        {showcase.price ? (
                          <p className="mt-1 font-bold text-[#38e1ff]">
                            {showcase.price}
                          </p>
                        ) : null}
                      </div>
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
        <section className="content-container py-16 lg:py-20">
          <Reveal>
            <SectionHeading
              dark
              eyebrow="// featured_units"
              title="Featured products"
              actionHref="/store"
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featured.slice(0, 4).map((product, i) => (
              <ChromeCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Collection banners — neon slabs */}
      {blocks.slice(0, 2).map((block, bi) => (
        <section key={block.collection.id} className="content-container pb-6">
          <Reveal>
            <LocalizedClientLink
              href={`/collections/${block.collection.handle}`}
              className={
                "group relative block overflow-hidden rounded-2xl border p-8 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 md:p-10 " +
                (bi % 2 === 0
                  ? "border-[#38e1ff]/30 bg-gradient-to-r from-[#38e1ff]/15 to-transparent"
                  : "border-[#7c7cff]/30 bg-gradient-to-r from-[#7c7cff]/15 to-transparent")
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="theme-eyebrow text-[#38e1ff]">
                    {"// collection_0" + (bi + 1)}
                  </p>
                  <h3 className="mt-2 text-3xl font-bold md:text-4xl">
                    {block.collection.title}
                  </h3>
                </div>
                <span className="rounded-xl border border-[#38e1ff]/40 px-6 py-3 text-sm font-bold text-[#38e1ff] transition-colors group-hover:bg-[#38e1ff] group-hover:text-[#05070d]">
                  Initialize →
                </span>
              </div>
            </LocalizedClientLink>
          </Reveal>
        </section>
      ))}

      {/* New arrivals */}
      {arrivals.length > 0 && (
        <section className="content-container py-14">
          <Reveal>
            <SectionHeading dark eyebrow="// just_indexed" title="New arrivals" />
          </Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {arrivals.slice(0, 4).map((product, i) => (
              <ChromeCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {blocks.slice(2).map((block) => (
        <section key={block.collection.id} className="content-container pb-16">
          <Reveal>
            <SectionHeading
              dark
              eyebrow="// curated_collection"
              title={block.collection.title}
              actionHref={`/collections/${block.collection.handle}`}
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {block.products.slice(0, 4).map((product, i) => (
              <ChromeCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
