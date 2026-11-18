"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export function OrderActions({
  orderId,
  status,
  fulfilled,
}: {
  orderId: string
  status: string
  fulfilled: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState<"paid" | "fulfilled" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const runAction = async (action: "mark_paid" | "mark_fulfilled") => {
    setPending(action === "mark_paid" ? "paid" : "fulfilled")
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        jobId?: string
        alreadyPaid?: boolean
        alreadyFulfilled?: boolean
      }

      if (!response.ok) {
        setError(data.error ?? "Action failed")
        return
      }

      if (action === "mark_paid") {
        setMessage(
          data.jobId
            ? `Provisioning queued (job ${data.jobId}).`
            : data.alreadyPaid
              ? "Order was already paid."
              : "Order marked paid."
        )
      } else {
        setMessage(data.alreadyFulfilled ? "Order was already fulfilled." : "Order marked fulfilled.")
      }

      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed")
    } finally {
      setPending(null)
    }
  }

  const canMarkPaid = status !== "paid"
  const canMarkFulfilled = status === "paid" && !fulfilled

  if (!canMarkPaid && !canMarkFulfilled) {
    return <span className="text-xs text-gray-500">-</span>
  }

  return (
    <div className="flex flex-col gap-1">
      {canMarkPaid ? (
        <button
          type="button"
          onClick={() => void runAction("mark_paid")}
          disabled={pending !== null}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {pending === "paid" ? "Queuing..." : "Mark paid and deploy"}
        </button>
      ) : null}
      {canMarkFulfilled ? (
        <button
          type="button"
          onClick={() => void runAction("mark_fulfilled")}
          disabled={pending !== null}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {pending === "fulfilled" ? "Saving..." : "Mark fulfilled"}
        </button>
      ) : null}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      {message ? <span className="text-xs text-green-700">{message}</span> : null}
    </div>
  )
}
