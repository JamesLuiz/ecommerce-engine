"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export function LogoutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const onClick = async () => {
    setPending(true)

    try {
      await fetch("/api/staff/logout", { method: "GET" })
      router.push("/login")
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 disabled:opacity-60"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  )
}
