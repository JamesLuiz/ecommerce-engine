import Link from "next/link"
import { desc } from "drizzle-orm"

import { audit_log } from "@flowcheq/db"
import { db } from "@lib/db"

export const dynamic = "force-dynamic"

export default async function AuditPage() {
  const rows = await db.select().from(audit_log).orderBy(desc(audit_log.at)).limit(200)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="mt-1 text-sm text-gray-600">
          Staff actions, release registrations and worker cleanup events.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Nothing recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Meta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((entry) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                    {entry.at.toISOString().slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-4 py-3">{entry.actor}</td>
                  <td className="px-4 py-3 font-medium">{entry.action}</td>
                  <td className="px-4 py-3">
                    {entry.tenant_id ? (
                      <Link
                        href={`/admin/tenants/${entry.tenant_id}`}
                        className="text-blue-700 hover:underline"
                      >
                        {entry.tenant_id.slice(0, 8)}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="max-w-md truncate px-4 py-3 font-mono text-xs text-gray-500">
                    {entry.meta ? JSON.stringify(entry.meta) : "-"}
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
