"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import type { TenantAction } from "./actions-types"

interface TenantActionsProps {
  tenantId: string
  slug: string
  status: string
}

interface ActionResponse {
  error?: string
  jobId?: string
  status?: string
}

const ACTION_LABELS: Record<TenantAction, string> = {
  retry: "Retry failed steps",
  redeploy: "Redeploy",
  suspend: "Suspend",
  resume: "Resume",
  deprovision: "Deprovision",
}

export function TenantActions({ tenantId, slug, status }: TenantActionsProps) {
  const router = useRouter()
  const [pending, setPending] = useState<TenantAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const run = async (action: TenantAction, confirmation?: string) => {
    setPending(action)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(confirmation ? { action, confirmation } : { action }),
      })
      const data = (await response.json().catch(() => ({}))) as ActionResponse

      if (!response.ok) {
        setError(data.error ?? "Action failed")
        return
      }

      setMessage(
        data.jobId
          ? `${ACTION_LABELS[action]} queued (job ${data.jobId}).`
          : `${ACTION_LABELS[action]} applied.`
      )
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed")
    } finally {
      setPending(null)
    }
  }

  const onDeprovision = () => {
    const confirmation = window.prompt(
      `This deletes the tenant database and Coolify apps. Type "${slug}" to continue.`
    )

    if (confirmation === null) {
      return
    }

    void run("deprovision", confirmation)
  }

  const disabled = pending !== null || status === "deleted" || status === "deprovisioning"
  const canDeprovision = ["active", "suspended", "failed"].includes(status)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void run("retry")}
          disabled={disabled}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {pending === "retry" ? "Queueing..." : ACTION_LABELS.retry}
        </button>
        <button
          type="button"
          onClick={() => void run("redeploy")}
          disabled={disabled}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {pending === "redeploy" ? "Queueing..." : ACTION_LABELS.redeploy}
        </button>
        {status === "suspended" ? (
          <button
            type="button"
            onClick={() => void run("resume")}
            disabled={disabled}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {pending === "resume" ? "Applying..." : ACTION_LABELS.resume}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void run("suspend")}
            disabled={disabled}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {pending === "suspend" ? "Applying..." : ACTION_LABELS.suspend}
          </button>
        )}
        <button
          type="button"
          onClick={onDeprovision}
          disabled={disabled || !canDeprovision}
          className="rounded border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {pending === "deprovision" ? "Queueing..." : ACTION_LABELS.deprovision}
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
    </div>
  )
}
