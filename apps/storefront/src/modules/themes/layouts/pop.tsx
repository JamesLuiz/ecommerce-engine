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
 * POP CANDY — playful color clash.
 *
 * Cream hero with a wavy headline highlight, spinning star badge, and a
 * tilted polaroid-stack showcase; bubblegum product cards with chunky
 * borders and hard candy shadows; candy-stripe collection panels and a
 * marquee ticker. Maximum bounce, all rounded and sticker-like.
 */

const popCardColors = ["#ff3ea5", "#7c5cff", "#00b3a6", "#ff8a00"]

export function PopCard({ product, index }: { product: ThemedProduct; index: number }) {
  const accent = popCardColors[index % popCardColors.length]

  return (
    <Reveal delay={Math.min(index, 7) * 60}>
      <ProductLink
        product={product}
        className="group block rotate-[0.6deg] rounded-[26px] border-[3px] border-[#232323] bg-white p-2.5 shadow-[7px_7px_0_#232323] transition-all duration-200 hover:rotate-0 hover:-translate-y-1.5 even:-rotate-[0.6deg]"
      >
        <div className="relative aspect-square overflow-hidden rounded-[18px] border-[3px] border-[#232323]">
          <ProductImage product={product} sizes="(max-width: 640px) 70vw, 320px" />
          <span
            className="absolute left-2.5 top-2.5 rounded-full border-2 border-[#232323] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white"
            style={{ backgroundColor: accent }}
          >
            Yum
          </span>
        </div>
        <div className="px-2 pb-2 pt-3">
          <p className="truncate text-[15px] font-black text-[#232323]">
            {product.title}
          </p>
          <div className="mt-2">
            <PriceChip
              product={product}
              className="border-2 border-[#232323] text-white"
              style={{ backgroundColor: accent }}
            />
          </div>
        </div>
      </ProductLink>
    </Reveal>
  )
}

function PopTicker({ items }: { items: string[] }) {
  const row = [...items, ...items]

  return (
    <div className="overflow-hidden border-y-[3px] border-[#232323] bg-[#7c5cff] py-2.5 text-white">
      <div className="flex w-max animate-theme-marquee gap-8 whitespace-nowrap">
        {row.map((word, i) => (
          <span key={`${word}-${i}`} className="text-sm font-black uppercase tracking-[0.18em]">
            {word} <span className="ml-8">●</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function PopLayout({
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
    <div className="bg-[#fff6ec] text-[#232323]">
      {/* Hero — wavy highlight + spinning star + polaroid stack */}
      {content.showHero && (
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-16 top-10 h-64 w-64 rounded-full bg-[#ffd400]/50 blur-[70px]" />
          <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-[#ff3ea5]/25 blur-[70px]" />

          <div className="content-container relative grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
            <Reveal>
              <span className="inline-block -rotate-2 rounded-full border-[3px] border-[#232323] bg-[#ffd400] px-4 py-1.5 text-xs font-black uppercase tracking-[0.16em] shadow-[4px_4px_0_#232323]">
                ✿ {hero.eyebrow || content.storeName}
              </span>
              <h1 className="mt-5 text-6xl font-black leading-[0.9] tracking-tight md:text-8xl">
                {hero.title}{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">{hero.heading}</span>
                  <svg
                    viewBox="0 0 300 24"
                    preserveAspectRatio="none"
                    className="absolute -bottom-1 left-0 z-0 h-5 w-full"
                    aria-hidden
                  >
                    <path
                      d="M4 16 Q 40 4, 80 12 T 160 12 T 240 12 T 296 10"
                      fill="none"
                      stroke="#ff3ea5"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>
              <p className="mt-6 max-w-lg text-lg font-medium leading-8 text-[#232323]/70">
                {hero.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <LocalizedClientLink
                  href="/store"
                  className="rounded-full border-[3px] border-[#232323] bg-[#ff3ea5] px-8 py-3.5 text-sm font-black uppercase tracking-[0.1em] text-white shadow-[5px_5px_0_#232323] transition-all duration-200 hover:-translate-y-1 hover:shadow-[7px_7px_0_#232323]"
                >
                  {hero.primaryCta} →
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/store"
                  className="rounded-full border-[3px] border-[#232323] bg-white px-8 py-3.5 text-sm font-black uppercase tracking-[0.1em] shadow-[5px_5px_0_#232323] transition-all duration-200 hover:-translate-y-1"
                >
                  {hero.secondaryCta}
                </LocalizedClientLink>
              </div>

              {stats.length > 0 && (
                <div className="mt-10 flex flex-wrap gap-4">
                  {stats.slice(0, 3).map((stat, i) => (
                    <div
                      key={stat.label}
                      className={
                        "rotate-[-1deg] rounded-2xl border-[3px] border-[#232323] px-5 py-3 shadow-[4px_4px_0_#232323] " +
                        (i === 0
                          ? "bg-[#ff3ea5] text-white"
                          : i === 1
                            ? "bg-[#7c5cff] text-white"
                            : "bg-[#00b3a6] text-white")
                      }
                    >
                      <span className="text-xl font-black">{stat.value}</span>
                      <span className="ml-2 text-[10px] font-black uppercase tracking-[0.14em] opacity-90">
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>

            {content.showShowcase && (
              <Reveal delay={150} className="relative flex justify-center">
                <div className="relative w-full max-w-[400px]">
                  {/* back polaroid */}
                  <div className="absolute inset-0 -rotate-6 rounded-2xl border-[3px] border-[#232323] bg-[#7c5cff]" />
                  {/* front polaroid */}
                  <LocalizedClientLink
                    href={showcase.href || "/store"}
                    className="group relative block rotate-3 rounded-2xl border-[3px] border-[#232323] bg-white p-3 pb-5 shadow-[10px_10px_0_#232323] transition-transform duration-300 hover:rotate-0"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-[#232323]/10">
                      {showcase.imageUrl ? (
                        <img
                          src={showcase.imageUrl}
                          alt={showcase.title}
                          className="theme-card-img absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#ff3ea5] via-[#7c5cff] to-[#00b3a6]" />
                      )}
                      <span className="absolute left-3 top-3 -rotate-3 rounded-full border-2 border-[#232323] bg-[#ffd400] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                        {showcase.badge || showcase.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-1 pt-4">
                      <div className="min-w-0 text-left">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff3ea5]">
                          {showcase.eyebrow}
                        </p>
                        <h3 className="truncate text-xl font-black">{showcase.title}</h3>
                      </div>
                      {showcase.price ? (
                        <span className="shrink-0 rounded-full border-2 border-[#232323] bg-[#232323] px-3 py-1.5 text-sm font-black text-[#ffd400]">
                          {showcase.price}
                        </span>
                      ) : null}
                    </div>
                  </LocalizedClientLink>
                  {/* spinning star */}
                  <div className="absolute -right-5 -top-5 flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-[#232323] bg-[#00b3a6] text-white shadow-[4px_4px_0_#232323] animate-theme-float">
                    <span className="text-2xl font-black">★</span>
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </section>
      )}

      <PopTicker
        items={[content.storeName, "Fresh & fun", hero.primaryCta, "Tasty picks"]}
      />

      {/* Featured — bubblegum cards */}
      {content.showFeatured && featured.length > 0 && (
        <section className="content-container py-16">
          <Reveal>
            <div className="mb-8 text-center">
              <span className="inline-block rotate-1 rounded-full border-[3px] border-[#232323] bg-white px-5 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] shadow-[4px_4px_0_#232323]">
                ✿ Shop the edit ✿
              </span>
              <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                Tasty <span className="text-[#ff3ea5]">picks</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {featured.slice(0, 4).map((product, i) => (
              <PopCard key={product.id} product={product} index={i} />
            ))}
          </div>
          <Reveal className="mt-10 text-center">
            <LocalizedClientLink
              href="/store"
              className="inline-block rounded-full border-[3px] border-[#232323] bg-[#232323] px-8 py-3.5 text-sm font-black uppercase tracking-[0.1em] text-white shadow-[5px_5px_0_#ff3ea5] transition-all duration-200 hover:-translate-y-1"
            >
              View all goodies →
            </LocalizedClientLink>
          </Reveal>
        </section>
      )}

      {/* Collection panels — candy stripes */}
      {blocks.slice(0, 2).map((block, bi) => (
        <section key={block.collection.id} className="content-container pb-8">
          <Reveal>
            <LocalizedClientLink
              href={`/collections/${block.collection.handle}`}
              className={
                "group block overflow-hidden rounded-[28px] border-[3px] border-[#232323] p-8 shadow-[8px_8px_0_#232323] transition-transform duration-200 hover:-translate-y-1 md:p-10 " +
                (bi % 2 === 0 ? "bg-[#7c5cff] text-white" : "bg-[#00b3a6] text-white")
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] opacity-80">
                    ✿ Curated collection ✿
                  </p>
                  <h3 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
                    {block.collection.title}
                  </h3>
                </div>
                <span className="rounded-full border-[3px] border-[#232323] bg-white px-7 py-3 text-sm font-black uppercase tracking-[0.1em] text-[#232323] transition-transform duration-200 group-hover:scale-105">
                  Dive in →
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
            <SectionHeading eyebrow="✿ Fresh arrivals ✿" title="Hot off the press" />
          </Reveal>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {arrivals.slice(0, 4).map((product, i) => (
              <PopCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {blocks.slice(2).map((block) => (
        <section key={block.collection.id} className="content-container pb-16">
          <Reveal>
            <SectionHeading
              eyebrow="✿ Curated collection ✿"
              title={block.collection.title}
              actionHref={`/collections/${block.collection.handle}`}
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {block.products.slice(0, 4).map((product, i) => (
              <PopCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
