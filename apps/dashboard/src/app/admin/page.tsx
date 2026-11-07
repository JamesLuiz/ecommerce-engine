import Link from "next/link"
import { count, desc } from "drizzle-orm"

import { audit_log, releases, tenants } from "@flowcheq/db"
import { db } from "@lib/db"

export const dynamic = "force-dynamic"

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  )
}

export default async function AdminPage() {
  const statusRows = await db
    .select({ status: tenants.status, total: count() })
    .from(tenants)
    .groupBy(tenants.status)

  const statusCounts = Object.fromEntries(
    statusRows.map((row) => [row.status, Number(row.total)])
  ) as Record<string, number>
  const totalTenants = Object.values(statusCounts).reduce((sum, value) => sum + value, 0)
  const latestRelease = (
    await db.select().from(releases).orderBy(desc(releases.created_at)).limit(1)
  )[0]
  const recentAudit = await db.select().from(audit_log).orderBy(desc(audit_log.at)).limit(8)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Deployment overview</h1>
        <p className="mt-1 text-sm text-gray-600">
          Provision, redeploy and retire tenant stores from one place.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tenants" value={totalTenants} hint="All time" />
        <StatCard label="Active" value={statusCounts.active ?? 0} hint="Serving traffic" />
        <StatCard
          label="Provisioning"
          value={statusCounts.provisioning ?? 0}
          hint="Queued or running"
        />
        <StatCard
          label="Needs attention"
          value={(statusCounts.failed ?? 0) + (statusCounts.suspended ?? 0)}
          hint="Failed or suspended"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Latest release</h2>
            <Link href="/admin/releases" className="text-xs text-blue-600 hover:underline">
              Manage releases
            </Link>
          </div>
          {latestRelease ? (
            <div className="mt-3 flex items-baseline justify-between text-sm">
              <span className="font-mono">{latestRelease.version}</span>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs uppercase tracking-wide text-gray-600">
                {latestRelease.ring}
              </span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              No releases registered yet. Tag a build to trigger the workflow.
            </p>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent activity</h2>
            <Link href="/admin/audit" className="text-xs text-blue-600 hover:underline">
              Full audit log
            </Link>
          </div>
          {recentAudit.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No activity recorded yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {recentAudit.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-medium">{entry.action}</span>
                    <span className="ml-2 text-gray-500">{entry.actor}</span>
                  </div>
                  <span className="whitespace-nowrap text-xs text-gray-400">
                    {entry.at.toISOString().slice(0, 16).replace("T", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex gap-3 text-sm">
        <Link
          href="/admin/tenants"
          className="rounded border border-gray-300 bg-white px-4 py-2 font-medium hover:bg-gray-50"
        >
          View tenants
        </Link>
        <Link
          href="/admin/jobs"
          className="rounded border border-gray-300 bg-white px-4 py-2 font-medium hover:bg-gray-50"
        >
          View jobs
        </Link>
      </div>
    </div>
  )
}
