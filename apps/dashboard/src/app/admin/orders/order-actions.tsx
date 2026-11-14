"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export function OrderActions({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const markPaid = async () => {
    setPending(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_paid" }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        jobId?: string
        alreadyPaid?: boolean
      }

      if (!response.ok) {
        setError(data.error ?? "Action failed")
        return
      }

      setMessage(
        data.jobId
          ? `Provisioning queued (job ${data.jobId}).`
          : data.alreadyPaid
            ? "Order was already paid."
            : "Order marked paid."
      )
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void markPaid()}
        disabled={pending}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "Queuing..." : "Mark paid and deploy"}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      {message ? <span className="text-xs text-green-700">{message}</span> : null}
    </div>
  )
}
