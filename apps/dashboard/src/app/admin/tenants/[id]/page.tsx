import Link from "next/link"
import { desc, eq } from "drizzle-orm"
import { notFound } from "next/navigation"

import { audit_log, customers, provision_steps, tenants } from "@flowcheq/db"
import { db } from "@lib/db"
import { StatusBadge } from "../../status-badge"
import { TenantActions } from "./actions"

export const dynamic = "force-dynamic"

const STEP_ORDER = [
  "validate",
  "secrets",
  "database",
  "backend_app",
  "storefront_app",
  "dns",
  "deploy_backend",
  "read_bootstrap",
  "deploy_storefront",
  "finalize",
] as const

interface TenantConfigShape {
  businessName?: string
  ownerEmail?: string
  plan?: string
  region?: string
  currency?: string
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-gray-900">{value ?? "-"}</dd>
    </div>
  )
}

export default async function TenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const rows = await db
    .select({ tenant: tenants, customer_email: customers.email })
    .from(tenants)
    .innerJoin(customers, eq(tenants.customer_id, customers.id))
    .where(eq(tenants.id, id))

  const row = rows[0]

  if (!row) {
    notFound()
  }

  const tenant = row.tenant
  const config = (tenant.config ?? {}) as TenantConfigShape
  const steps = await db
    .select()
    .from(provision_steps)
    .where(eq(provision_steps.tenant_id, id))
  const stepMap = new Map(steps.map((step) => [step.step, step]))
  const audit = await db
    .select()
    .from(audit_log)
    .where(eq(audit_log.tenant_id, id))
    .orderBy(desc(audit_log.at))
    .limit(30)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/tenants" className="text-xs text-blue-600 hover:underline">
            Back to tenants
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold">
            {config.businessName ?? tenant.slug}
            <StatusBadge status={tenant.status} />
          </h1>
          <p className="mt-1 font-mono text-xs text-gray-500">
            {tenant.slug} &middot; {tenant.id}
          </p>
        </div>
        <div className="flex gap-2">
          {tenant.store_url ? (
            <a
              href={tenant.store_url}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              Open store
            </a>
          ) : null}
          {tenant.admin_url ? (
            <a
              href={tenant.admin_url}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              Open admin
            </a>
          ) : null}
        </div>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Actions</h2>
        <p className="mt-1 mb-4 text-xs text-gray-500">
          Retry resumes the failed step. Redeploy re-pushes the current image tag and rolls the
          containers. Actions are queued and run by the provisioning worker.
        </p>
        <TenantActions tenantId={tenant.id} slug={tenant.slug} status={tenant.status} />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Tenant details</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Customer" value={row.customer_email} />
          <Field label="Plan" value={config.plan} />
          <Field label="Region" value={config.region} />
          <Field label="Currency" value={config.currency} />
          <Field label="Owner email" value={config.ownerEmail} />
          <Field label="Version" value={<span className="font-mono">{tenant.version ?? "-"}</span>} />
          <Field
            label="Pinned version"
            value={<span className="font-mono">{tenant.pinned_version ?? "-"}</span>}
          />
          <Field label="Database" value={<span className="font-mono">{tenant.db_name ?? "-"}</span>} />
          <Field
            label="Created"
            value={tenant.created_at.toISOString().slice(0, 19).replace("T", " ")}
          />
          <Field
            label="Backend app uuid"
            value={<span className="font-mono text-xs">{tenant.coolify_backend_uuid ?? "-"}</span>}
          />
          <Field
            label="Storefront app uuid"
            value={<span className="font-mono text-xs">{tenant.coolify_storefront_uuid ?? "-"}</span>}
          />
          <Field label="Store URL" value={tenant.store_url ?? "-"} />
        </dl>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Provisioning steps</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="py-2 pr-4">Step</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Attempts</th>
                <th className="py-2">Last log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {STEP_ORDER.map((key) => {
                const step = stepMap.get(key)

                return (
                  <tr key={key}>
                    <td className="py-2 pr-4 font-mono text-xs">{key}</td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={step?.status ?? "pending"} />
                    </td>
                    <td className="py-2 pr-4 text-gray-700">{step?.attempts ?? 0}</td>
                    <td className="max-w-lg truncate py-2 font-mono text-xs text-red-700">
                      {step?.log ?? ""}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Tenant audit trail</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-gray-500">No audit entries for this tenant yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {audit.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-medium">{entry.action}</span>
                  <span className="ml-2 text-gray-500">{entry.actor}</span>
                  {entry.meta ? (
                    <span className="ml-2 font-mono text-xs text-gray-400">
                      {JSON.stringify(entry.meta)}
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-gray-400">
                  {entry.at.toISOString().slice(0, 19).replace("T", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
