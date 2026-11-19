import type { LayoutId, ThemedProduct } from "./registry"
import { AuroraCard } from "./layouts/aurora"
import { BreezeCard } from "./layouts/breeze"
import { BrutalCard } from "./layouts/brutal"
import { ChromeCard } from "./layouts/chrome"
import { EmberCard } from "./layouts/ember"
import { LuxeCard } from "./layouts/luxe"
import { MinimalCard } from "./layouts/minimal"
import { PopCard } from "./layouts/pop"
import { StreetCard } from "./layouts/street"
import { TerraCard } from "./layouts/terra"

/**
 * Server-side twin of `ThemedProductCard` for pages that render on the
 * server (store search, category, collection, paginated lists). The caller
 * resolves the layout id server-side via `hydrateRuntimeBrandConfig()` and
 * passes it in — no client context needed.
 *
 * The card components compose client pieces (Reveal, links) but carry no
 * `"use client"` directive themselves, so they render fine here.
 */
export function ThemedServerCard({
  layoutId,
  product,
  index = 0,
}: {
  layoutId: LayoutId
  product: ThemedProduct
  index?: number
}) {
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
    case "minimal":
    default:
      return <MinimalCard product={product} index={index} />
  }
}

const LISTING_EYEBROWS: Record<LayoutId, string> = {
  minimal: "",
  aurora: "The catalog",
  luxe: "The catalog",
  street: "Full lineup",
  brutal: "Index",
  breeze: "The shelf",
  ember: "The collection",
  terra: "Market rows",
  chrome: "// index",
  pop: "Browse it all",
}

/**
 * Themed heading for server-rendered listing pages (category, collection).
 * Same title the merchant configured — set in the layout's voice.
 */
export function ThemedListingHeading({
  layoutId,
  title,
  testId,
}: {
  layoutId: LayoutId
  title: string
  testId?: string
}) {
  const eyebrow = LISTING_EYEBROWS[layoutId]

  return (
    <div className="mb-8">
      {eyebrow ? (
        <p className="theme-eyebrow theme-listing-eyebrow mb-2">{eyebrow}</p>
      ) : null}
      <h1
        data-testid={testId}
        className="theme-section-title theme-listing-title"
      >
        {title}
      </h1>
    </div>
  )
}

/**
 * Grid shell for server-rendered themed lists. Brutal/street use their
 * denser single-column mobile rhythm; the rest use the airy 2-up mobile grid.
 */
export function ThemedServerGrid({
  layoutId,
  products,
}: {
  layoutId: LayoutId
  products: ThemedProduct[]
}) {
  const gridClass =
    layoutId === "brutal" || layoutId === "street"
      ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 w-full"
      : "grid grid-cols-2 gap-5 lg:grid-cols-4 w-full"

  return (
    <ul className={gridClass} data-testid="products-list">
      {products.map((product, i) => (
        <li key={product.id}>
          <ThemedServerCard layoutId={layoutId} product={product} index={i} />
        </li>
      ))}
    </ul>
  )
}
