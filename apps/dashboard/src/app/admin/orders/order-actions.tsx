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
  const [pending, setPending] = useState<"paid" | "fulfilled" | "deploy" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const runAction = async (action: "mark_paid" | "mark_fulfilled" | "deploy") => {
    setPending(action === "mark_paid" ? "paid" : action === "deploy" ? "deploy" : "fulfilled")
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        jobId?: string
        alreadyPaid?: boolean
        alreadyFulfilled?: boolean
      }

      if (!response.ok || data.ok === false) {
        setError(data.error ?? "Action failed")
        return
      }

      if (action === "mark_paid") {
        if (data.alreadyPaid) {
          setMessage("Order is already paid.")
        } else {
          setMessage("Order marked paid. Use Deploy to start provisioning.")
        }
      } else if (action === "deploy") {
        if (data.jobId) {
          setMessage(`Deploy queued (job ${data.jobId}).`)
        } else {
          setMessage("Deploy requested.")
        }
      } else if (data.alreadyFulfilled) {
        setMessage("Order is already fulfilled.")
      } else {
        setMessage("Order marked fulfilled.")
      }

      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed")
    } finally {
      setPending(null)
    }
  }

  const isPaid = status === "paid"

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runAction("mark_paid")}
          disabled={isPaid || pending !== null}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending === "paid" ? "Marking..." : "Mark paid"}
        </button>
        <button
          type="button"
          onClick={() => void runAction("mark_fulfilled")}
          disabled={fulfilled || pending !== null}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending === "fulfilled" ? "Saving..." : "Order fulfilled"}
        </button>
        <button
          type="button"
          onClick={() => void runAction("deploy")}
          disabled={!isPaid || pending !== null}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending === "deploy" ? "Queueing..." : "Deploy"}
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {message ? <p className="text-xs text-green-700">{message}</p> : null}
    </div>
  )
}
