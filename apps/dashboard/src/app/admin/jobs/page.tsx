import Link from "next/link"

import { getQueueSnapshot } from "@lib/queue"
import type { QueueSnapshot } from "@lib/queue"

export const dynamic = "force-dynamic"

const COUNTERS: Array<{ key: keyof QueueSnapshot["counts"]; label: string }> = [
  { key: "waiting", label: "Waiting" },
  { key: "active", label: "Active" },
  { key: "delayed", label: "Delayed" },
  { key: "failed", label: "Failed" },
  { key: "completed", label: "Completed" },
  { key: "paused", label: "Paused" },
]

export default async function JobsPage() {
  let snapshot: QueueSnapshot | null = null
  let error: string | null = null

  try {
    snapshot = await getQueueSnapshot()
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Provisioning jobs</h1>
        <p className="mt-1 text-sm text-gray-600">
          Live BullMQ queue state. Failed jobs are kept so they can be inspected and retried from
          the tenant page.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Queue unavailable</p>
          <p className="mt-1 font-mono text-xs">{error}</p>
          <p className="mt-2">
            Set <code>REDIS_URL</code> and make sure Redis is reachable to manage jobs from here.
          </p>
        </div>
      ) : null}

      {snapshot ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {COUNTERS.map((counter) => (
              <div
                key={counter.key}
                className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm"
              >
                <p className="text-xs uppercase tracking-wide text-gray-500">{counter.label}</p>
                <p className="mt-1 text-xl font-semibold">{snapshot.counts[counter.key] ?? 0}</p>
              </div>
            ))}
          </div>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">Failed jobs</h2>
            {snapshot.failed.length === 0 ? (
              <p className="text-sm text-gray-500">No failed jobs.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="py-2 pr-4">Job</th>
                      <th className="py-2 pr-4">Tenant</th>
                      <th className="py-2 pr-4">Attempts</th>
                      <th className="py-2 pr-4">Reason</th>
                      <th className="py-2">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {snapshot.failed.map((job) => (
                      <tr key={job.id ?? `${job.name}-${job.timestamp}`}>
                        <td className="py-2 pr-4 font-mono text-xs">
                          {job.name} / {job.id}
                        </td>
                        <td className="py-2 pr-4">
                          {job.tenantId ? (
                            <Link
                              href={`/admin/tenants/${job.tenantId}`}
                              className="text-blue-700 hover:underline"
                            >
                              {job.tenantId}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-2 pr-4">{job.attemptsMade}</td>
                        <td className="max-w-md truncate py-2 pr-4 font-mono text-xs text-red-700">
                          {job.failedReason}
                        </td>
                        <td className="py-2 text-xs text-gray-500">
                          {new Date(job.timestamp).toISOString().slice(0, 19).replace("T", " ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
