"use client"

import { useEffect, useState } from "react"
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
 const style = announcement?.style ?? "standard"
 const countdown = useAnnouncementCountdown(
 style === "countdown" ? announcement?.countdownEndsAt ?? "" : ""
 )

 if (!announcement) {
 return null
 }
 return (
 <div
      className={clx(
        "theme-announcement relative px-4 py-2 text-center text-xs",
        className
      )}
      data-announcement-style={style}
 >
      <span className="opacity-90">{announcement.text}</span>
      {announcement.ctaLabel ? (
        <LocalizedClientLink
          href={announcement.ctaHref}
          className={clx(
            "ml-3 font-semibold underline underline-offset-4",
            linkClassName
          )}
 data-announcement-cta
        >
          {announcement.ctaLabel}
        </LocalizedClientLink>
      ) : null}
      {style === "countdown" && countdown ? (
        <span
          aria-live="polite"
 className="theme-announcement-countdown ml-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold tabular-nums"
 data-countdown-chip
        >
          <span aria-hidden>⏳</span>
          <span>{countdown}</span>
        </span>
      ) : null}
    </div>
  )
}

function pad2(value: number) {
  return String(Math.max(0, value)).padStart(2, "0")
}

function parseCountdownTarget(raw: string): number | null {
  if (!raw) {
    return null
  }

  // Accept a full ISO datetime or a plain duration in hours ("48", "48h").
  const hours = raw.match(/^(\d+(?:\.\d+)?)\s*h?$/i)
  if (hours) {
    return Date.now() + Number(hours[1]) * 3_600_000
  }

  const parsed = Date.parse(raw)
  return Number.isNaN(parsed) ? null : parsed
}

function useAnnouncementCountdown(target: string): string | null {
  const [now, setNow] = useState(() => Date.now())
  const endsAt = parseCountdownTarget(target)

  useEffect(() => {
    if (endsAt === null) {
      return
    }

    if (endsAt - Date.now() <= 0) {
      return
    }

    const timer = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(timer)
 }, [target, endsAt])

  if (endsAt === null) {
    return null
  }

  const remaining = Math.max(0, endsAt - now)
  const days = Math.floor(remaining / 86_400_000)
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1_000)

  if (remaining <= 0) {
    return "Offer ended"
  }

  return days > 0
    ? `${days}d ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
    : `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
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
