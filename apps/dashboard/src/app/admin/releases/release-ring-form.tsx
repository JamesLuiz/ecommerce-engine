"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export const RELEASE_RINGS = ["none", "internal", "canary", "all"] as const

export type ReleaseRing = (typeof RELEASE_RINGS)[number]

export function ReleaseRingForm({ version, ring }: { version: string; ring: string }) {
  const router = useRouter()
  const [value, setValue] = useState<ReleaseRing>(
    (RELEASE_RINGS as readonly string[]).includes(ring) ? (ring as ReleaseRing) : "none"
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version, ring: value }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? "Could not update the release")
        return
      }

      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update the release")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <select
        value={value}
        onChange={(event) => setValue(event.target.value as ReleaseRing)}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
        disabled={pending}
      >
        {RELEASE_RINGS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save"}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </form>
  )
}
