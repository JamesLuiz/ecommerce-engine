"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

import { clx } from "@modules/common/components/ui"

/**
 * Scroll-reveal wrapper used by every switchable layout. Content fades and
 * rises into view the first time it enters the viewport; `delay` staggers
 * siblings for a cascading entrance. Respects `prefers-reduced-motion` via
 * the `.theme-reveal` CSS rules in `globals.css`.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current

    if (!el) {
      return
    }

    if (typeof IntersectionObserver === "undefined") {
      const timer = setTimeout(() => setVisible(true), 0)
      return () => clearTimeout(timer)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    )

    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={clx("theme-reveal", visible && "is-visible", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
