import Link from "next/link"
import { desc, eq } from "drizzle-orm"

import { customers, tenants } from "@flowcheq/db"
import { db } from "@lib/db"
import { StatusBadge } from "../status-badge"

export const dynamic = "force-dynamic"

export default async function TenantsPage() {
  const rows = await db
    .select({
      id: tenants.id,
      slug: tenants.slug,
      status: tenants.status,
      version: tenants.version,
      config: tenants.config,
      store_url: tenants.store_url,
      created_at: tenants.created_at,
      customer_email: customers.email,
    })
    .from(tenants)
    .innerJoin(customers, eq(tenants.customer_id, customers.id))
    .orderBy(desc(tenants.created_at))
    .limit(500)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <p className="mt-1 text-sm text-gray-600">
          Every customer store, its provisioning state and the version it runs.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No tenants yet. They appear here after a paid signup.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const config = (row.config ?? {}) as { businessName?: string; plan?: string }

                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/tenants/${row.id}`} className="font-medium text-blue-700">
                        {config.businessName ?? row.slug}
                      </Link>
                      <div className="font-mono text-xs text-gray-500">{row.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.customer_email}</td>
                    <td className="px-4 py-3 text-gray-700">{config.plan ?? "-"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {row.version ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {row.created_at.toISOString().slice(0, 10)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
