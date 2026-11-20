"use client"

import { useState } from "react"

export function CopyLinkButton({
  value,
  className = "",
  label = "Copy link",
}: {
  value: string
  className?: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button type="button" onClick={copy} className={className}>
      {copied ? "Copied" : label}
    </button>
  )
}
