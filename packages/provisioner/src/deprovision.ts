import { eq } from "drizzle-orm"

import { audit_log, provision_steps, tenant_secrets, tenants } from "@flowcheq/db"
import { CoolifyError } from "./coolify"
import { dropTenantDatabase } from "./tenant-db"
import type { CoolifyClient } from "./coolify"
import type { AppDb } from "./types"

export interface DeprovisionTenantParams {
  tenantId: string
  db: AppDb
  coolify: CoolifyClient
}

async function deleteAppIfPresent(coolify: CoolifyClient, uuid: string | null): Promise<void> {
  if (!uuid) {
    return
  }

  try {
    await coolify.deleteApplication(uuid)
  } catch (error) {
    // A missing application means an earlier attempt already removed it.
    if (error instanceof CoolifyError && error.status === 404) {
      return
    }

    throw error
  }
}

/**
 * Removes everything a tenant owns: Coolify applications, the Postgres
 * database and role, and the stored secrets/provisioning history. The tenant
 * row is kept with status `deleted` so the audit trail stays intact.
 *
 * Every operation is idempotent so a retried job can resume from the failure.
 */
export async function deprovisionTenant(params: DeprovisionTenantParams): Promise<void> {
  const { tenantId, db, coolify } = params
  const rows = await db.select().from(tenants).where(eq(tenants.id, tenantId))
  const tenant = rows[0]

  if (!tenant) {
    return
  }

  await deleteAppIfPresent(coolify, tenant.coolify_storefront_uuid)
  await deleteAppIfPresent(coolify, tenant.coolify_backend_uuid)
  await dropTenantDatabase(tenant.slug)

  await db.delete(tenant_secrets).where(eq(tenant_secrets.tenant_id, tenantId))
  await db.delete(provision_steps).where(eq(provision_steps.tenant_id, tenantId))

  await db
    .update(tenants)
    .set({
      status: "deleted",
      db_name: null,
      coolify_backend_uuid: null,
      coolify_storefront_uuid: null,
      store_url: null,
      admin_url: null,
    })
    .where(eq(tenants.id, tenantId))

  await db.insert(audit_log).values({
    actor: "worker",
    action: "tenant.deprovision",
    tenant_id: tenantId,
    meta: { slug: tenant.slug },
  })
}
