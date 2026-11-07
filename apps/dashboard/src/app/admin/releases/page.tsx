import { desc } from "drizzle-orm"

import { releases } from "@flowcheq/db"
import { db } from "@lib/db"
import { ReleaseRingForm } from "./release-ring-form"

export const dynamic = "force-dynamic"

export default async function ReleasesPage() {
  const rows = await db.select().from(releases).orderBy(desc(releases.created_at)).limit(100)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Releases</h1>
        <p className="mt-1 text-sm text-gray-600">
          Versions registered by the release workflow. Changing a ring records the rollout intent
          and is written to the audit log.
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Automated ring rollout (snapshot, batch deploy, health check, rollback) is not enabled yet.
        Redeploying individual tenants is available from each tenant page.
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No releases yet. Push a <code>v*</code> tag to build images and register a release.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Ring</th>
                <th className="px-4 py-3">Set ring</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((release) => (
                <tr key={release.version}>
                  <td className="px-4 py-3 font-mono text-xs">{release.version}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {release.created_at.toISOString().slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs uppercase tracking-wide text-gray-700">
                      {release.ring}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ReleaseRingForm version={release.version} ring={release.ring} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
