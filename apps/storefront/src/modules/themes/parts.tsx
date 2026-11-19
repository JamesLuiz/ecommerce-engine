"use client"

import Image from "next/image"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PlaceholderImage from "@modules/common/icons/placeholder-image"
import InteractiveLink from "@modules/common/components/interactive-link"
import { clx } from "@modules/common/components/ui"
import { getProductPrice } from "@lib/util/get-product-price"
import type { HttpTypes } from "@medusajs/types"

import type { AnnouncementContent } from "./content"

/**
 * Shared building blocks every switchable layout composes. These carry the
 * merchant's content (announcement, prices, images); layouts only decide
 * arrangement, palette, card shape, and motion.
 */

export function AnnouncementBar({
  announcement,
  className,
  linkClassName,
}: {
  announcement: AnnouncementContent
  className?: string
  linkClassName?: string
}) {
  if (!announcement) {
    return null
  }

  return (
    <div className={clx("theme-announcement px-4 py-2 text-center text-xs", className)}>
      <span className="opacity-90">{announcement.text}</span>
      {announcement.ctaLabel ? (
        <LocalizedClientLink
          href={announcement.ctaHref}
          className={clx("ml-3 font-semibold underline underline-offset-4", linkClassName)}
        >
          {announcement.ctaLabel}
        </LocalizedClientLink>
      ) : null}
    </div>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  actionHref,
  actionLabel = "View all",
  align = "left",
  dark = false,
}: {
  eyebrow: string
  title: string
  actionHref?: string
  actionLabel?: string
  align?: "left" | "center"
  dark?: boolean
}) {
  return (
    <div
      className={clx(
        "mb-8 flex gap-4",
        align === "center"
          ? "flex-col items-center text-center"
          : "items-end justify-between"
      )}
    >
      <div className={align === "center" ? "max-w-2xl" : ""}>
        <p
          className={clx(
            "theme-eyebrow mb-2",
            dark ? "text-white/60" : "text-neutral-500"
          )}
        >
          {eyebrow}
        </p>
        <h2
          className={clx(
            "theme-section-title",
            dark ? "text-white" : "text-neutral-900"
          )}
        >
          {title}
        </h2>
      </div>
      {actionHref ? (
        <InteractiveLink href={actionHref}>{actionLabel}</InteractiveLink>
      ) : null}
    </div>
  )
}

export function PriceChip({
  product,
  className,
  style,
}: {
  product: HttpTypes.StoreProduct
  className?: string
  style?: React.CSSProperties
}) {
  let cheapest: ReturnType<typeof getProductPrice>["cheapestPrice"] = null

  try {
    cheapest = getProductPrice({ product }).cheapestPrice
  } catch {
    cheapest = null
  }

  if (!cheapest) {
    return null
  }

  return (
    <span className={clx("theme-price-chip", className)} style={style}>
      {cheapest.price_type === "sale" && cheapest.original_price ? (
        <s className="font-normal opacity-60">{cheapest.original_price}</s>
      ) : null}
      <span>{cheapest.calculated_price}</span>
    </span>
  )
}

export function ProductImage({
  product,
  className,
  sizes,
}: {
  product: HttpTypes.StoreProduct
  className?: string
  sizes?: string
}) {
  const src = product.thumbnail || product.images?.[0]?.url

  if (!src) {
    return (
      <div className={clx("flex h-full w-full items-center justify-center", className)}>
        <PlaceholderImage size={28} />
      </div>
    )
  }

  return (
    <div className={clx("relative h-full w-full overflow-hidden", className)}>
      <Image
        src={src}
        alt={product.title ?? ""}
        fill
        sizes={sizes ?? "(max-width: 640px) 80vw, 400px"}
        className="theme-card-img object-cover"
        draggable={false}
      />
    </div>
  )
}

export function ProductLink({
  product,
  children,
  className,
  label,
}: {
  product: HttpTypes.StoreProduct
  children: React.ReactNode
  className?: string
  label?: string
}) {
  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className={className}
      aria-label={label ?? product.title}
      data-testid="product-wrapper"
    >
      {children}
    </LocalizedClientLink>
  )
}
