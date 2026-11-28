"use client"

import type { Hit } from "instantsearch.js"

import { useStoreConfig } from "@lib/config-provider"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"
import Thumbnail from "@modules/products/components/thumbnail"
import HitPrice, {
  type HitPricing,
} from "@modules/store/components/store-hits/price"

import { resolveLayoutId, type LayoutId, type ThemedProduct } from "./registry"
import { AirCard } from "./layouts/air"
import { AuroraCard } from "./layouts/aurora"
import { BreezeCard } from "./layouts/breeze"
import { BrutalCard } from "./layouts/brutal"
import { ChromeCard } from "./layouts/chrome"
import { EmberCard } from "./layouts/ember"
import { LiquidCard } from "./layouts/liquid"
import { LuxeCard } from "./layouts/luxe"
import { MinimalCard } from "./layouts/minimal"
import { PopCard } from "./layouts/pop"
import { StreetCard } from "./layouts/street"
import { TerraCard } from "./layouts/terra"
import { TitaniumCard } from "./layouts/titanium"

/**
 * Renders a single product with the active layout's card design.
 *
 * Used outside the homepage (related products, and anywhere else a product
 * grid appears) so cards match the theme the merchant picked in
 * Settings → Storefront instead of always looking like the default.
 */
export function ThemedProductCard({
  product,
  index = 0,
}: {
  product: ThemedProduct
  index?: number
}) {
  const { settings } = useStoreConfig()
  const layoutId: LayoutId = resolveLayoutId(settings?.theme?.preset)

  switch (layoutId) {
    case "aurora":
      return <AuroraCard product={product} index={index} />
    case "luxe":
      return <LuxeCard product={product} index={index} />
    case "street":
      return <StreetCard product={product} index={index} />
    case "brutal":
      return <BrutalCard product={product} index={index} />
    case "breeze":
      return <BreezeCard product={product} index={index} />
    case "ember":
      return <EmberCard product={product} index={index} />
    case "terra":
      return <TerraCard product={product} index={index} />
    case "chrome":
      return <ChromeCard product={product} index={index} />
    case "pop":
      return <PopCard product={product} index={index} />
    case "air":
      return <AirCard product={product} index={index} />
    case "titanium":
      return <TitaniumCard product={product} index={index} />
    case "liquid":
      return <LiquidCard product={product} index={index} />
    case "minimal":
    default:
      return <MinimalCard product={product} index={index} />
  }
}

/**
 * Product grid that adapts its columns to the active layout: tight 4-up for
 * dense cards (brutal, chrome), airy 4-up for the rest, 2-up on mobile.
 */
export function ThemedProductGrid({ products }: { products: ThemedProduct[] }) {
  const { settings } = useStoreConfig()
  const layoutId: LayoutId = resolveLayoutId(settings?.theme?.preset)

  const gridClass =
    layoutId === "brutal" || layoutId === "street"
      ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      : "grid grid-cols-2 gap-5 lg:grid-cols-4"

  return (
    <ul className={gridClass}>
      {products.map((product, i) => (
        <li key={product.id}>
          <ThemedProductCard product={product} index={i} />
        </li>
      ))}
    </ul>
  )
}

export type StoreHit = Hit<
  {
    title: string | null
    handle: string | null
    thumbnail: string | null
  } & HitPricing
>

/**
 * Per-layout frame for instantsearch hits (store listing). Search documents
 * are not full products, so these frames reuse the storefront Thumbnail and
 * HitPrice inside theme-styled shells with matching badges and motion.
 */
const HIT_FRAMES: Record<
  LayoutId,
  { shell: string; imageWrap: string; badge?: string; title: string }
> = {
  minimal: {
    shell: "group",
    imageWrap: "",
    title: "font-medium text-ui-fg-base",
  },
  aurora: {
    shell:
      "group block overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.05] p-2.5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5",
    imageWrap: "overflow-hidden rounded-[14px]",
    badge: "New",
    title: "text-white",
  },
  luxe: {
    shell: "group block",
    imageWrap:
      "overflow-hidden rounded-[4px] border border-[#d4af69]/25 transition-all duration-300 group-hover:-translate-y-1",
    badge: "Atelier",
    title: "font-serif text-[#f3ead9]",
  },
  street: {
    shell:
      "group block border-2 border-[#141414] bg-white shadow-[5px_5px_0_#141414] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#ff4d00]",
    imageWrap: "overflow-hidden border-b-2 border-[#141414]",
    badge: "Hot",
    title: "font-black uppercase text-[#141414]",
  },
  brutal: {
    shell:
      "group block border-2 border-[#101010] bg-white transition-all duration-150 hover:-translate-y-1 hover:shadow-[6px_6px_0_#2545ff]",
    imageWrap: "overflow-hidden border-b-2 border-[#101010]",
    title: "font-mono font-bold uppercase text-[#101010]",
  },
  breeze: {
    shell:
      "group block rounded-[24px] border border-[#123332]/10 bg-white p-2.5 shadow-[0_14px_36px_rgba(18,51,50,0.08)] transition-all duration-300 hover:-translate-y-1.5",
    imageWrap: "overflow-hidden rounded-[18px]",
    title: "text-[#123332]",
  },
  ember: {
    shell:
      "group block overflow-hidden rounded-[18px] border border-[#ffb464]/20 bg-white/[0.04] p-2.5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5",
    imageWrap: "overflow-hidden rounded-[12px]",
    title: "text-[#f7e8d5]",
  },
  terra: {
    shell:
      "group block rounded-[20px] border border-[#2e2a1f]/10 bg-[#fffdf6] p-2.5 shadow-[0_12px_32px_rgba(46,42,31,0.08)] transition-all duration-300 hover:-translate-y-1.5",
    imageWrap: "overflow-hidden rounded-[14px]",
    badge: "Natural",
    title: "text-[#2e2a1f]",
  },
  chrome: {
    shell:
      "group block overflow-hidden rounded-xl border border-[#94b8ff]/20 bg-[#94b8ff]/[0.05] p-2 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5",
    imageWrap: "overflow-hidden rounded-lg",
    badge: "New",
    title: "font-mono text-[#e8f1ff]",
  },
  pop: {
    shell:
      "group block rounded-[22px] border-[3px] border-[#232323] bg-white p-2 shadow-[5px_5px_0_#232323] transition-all duration-200 hover:-translate-y-1",
    imageWrap: "overflow-hidden rounded-[14px] border-2 border-[#232323]/10",
    badge: "Yum",
    title: "font-black text-[#232323]",
  },
  air: {
    shell:
      "group block overflow-hidden rounded-[20px] border border-black/[0.06] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)]",
    imageWrap: "overflow-hidden",
    badge: "New",
    title: "font-semibold tracking-tight text-[#1d1d1f]",
  },
  titanium: {
    shell:
      "group block overflow-hidden rounded-xl border border-white/20 bg-gradient-to-b from-[#3a3a3c] to-[#1c1c1e] p-2.5 transition-all duration-300 hover:-translate-y-1",
    imageWrap: "overflow-hidden rounded-lg",
    badge: "Pro",
    title: "font-semibold text-[#f5f5f7]",
  },
  liquid: {
    shell:
      "group block overflow-hidden rounded-[24px] border border-white/30 bg-white/20 p-2.5 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5",
    imageWrap: "overflow-hidden rounded-[18px]",
    badge: "New",
    title: "font-semibold text-[#1d1d1f]",
  },
}

export function ThemedHitCard({
  hit,
  currencyCode,
}: {
  hit: StoreHit
  currencyCode: string
}) {
  const { settings } = useStoreConfig()
  const layoutId: LayoutId = resolveLayoutId(settings?.theme?.preset)
  const frame = HIT_FRAMES[layoutId]

  if (!hit.handle) {
    return null
  }

  return (
    <LocalizedClientLink
      href={`/products/${hit.handle}`}
      className={frame.shell}
    >
      <div data-testid="product-wrapper">
        <div className={`relative ${frame.imageWrap}`}>
          <Thumbnail thumbnail={hit.thumbnail} size="full" />
          {frame.badge ? (
            <span className="theme-eyebrow absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[9px] text-white backdrop-blur-sm">
              {frame.badge}
            </span>
          ) : null}
        </div>
        <div className="flex txt-compact-medium mt-4 justify-between gap-2 px-1 pb-1">
          <Text
            className={`min-w-0 flex-1 truncate ${frame.title}`}
            data-testid="product-title"
          >
            {hit.title}
          </Text>
          <HitPrice hit={hit} currencyCode={currencyCode} />
        </div>
      </div>
    </LocalizedClientLink>
  )
}
