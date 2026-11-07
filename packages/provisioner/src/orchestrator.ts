import { eq } from "drizzle-orm"

import { decrypt, tenant_secrets, tenants } from "@flowcheq/db"
import { createProvisionStore } from "./store"
import { DEFAULT_STEPS } from "./steps"
import type {
  AppDb,
  ProvisionDeps,
  ProvisionOutcome,
  ProvisionStepContext,
  ProvisionStepDefinition,
  ProvisionStepRecord,
} from "./types"
import type { ProvisionStepStore } from "./store"
import type { Tenant } from "@flowcheq/db"

export interface RunProvisioningParams {
  tenantId: string
  tenant: Tenant
  steps?: ProvisionStepDefinition[]
  store?: ProvisionStepStore
  deps?: ProvisionDeps
}

/**
 * Rebuilds the cross-step context from persisted state so a retried or resumed
 * job does not regenerate secrets or lose the resource ids created by earlier
 * steps.
 */
export async function hydrateProvisionContext(
  database: AppDb,
  ctx: ProvisionStepContext
): Promise<void> {
  const rows = await database.select().from(tenants).where(eq(tenants.id, ctx.tenant.id))
  const tenant = rows[0]

  if (tenant) {
    ctx.tenant = tenant
  }

  ctx.apps = {
    database: ctx.tenant.db_name ?? undefined,
    backend: ctx.tenant.coolify_backend_uuid ?? undefined,
    storefront: ctx.tenant.coolify_storefront_uuid ?? undefined,
  }

  const secretRows = await database
    .select()
    .from(tenant_secrets)
    .where(eq(tenant_secrets.tenant_id, ctx.tenant.id))

  const secrets = ctx.secrets ?? {}
  const bootstrap = ctx.bootstrap ?? {}

  for (const row of secretRows) {
    const value = decrypt(row.value_enc)

    switch (row.key) {
      case "jwt_secret":
        secrets.jwtSecret = value
        break
      case "cookie_secret":
        secrets.cookieSecret = value
        break
      case "db_password":
        secrets.dbPassword = value
        break
      case "publishable_key":
        bootstrap.publishableKey = value
        break
      case "invite_token":
        bootstrap.inviteToken = value
        break
      default:
        break
    }
  }

  ctx.secrets = secrets
  ctx.bootstrap = bootstrap
}

export async function runProvisioning(params: RunProvisioningParams): Promise<ProvisionOutcome> {
  const steps = params.steps ?? DEFAULT_STEPS
  const deps = params.deps
  const database = deps?.db as AppDb | undefined
  const store = params.store ?? createProvisionStore({ db: deps?.db })
  const now = deps?.now ?? (() => new Date())
  const finalSteps: ProvisionStepRecord[] = []

  const ctx: ProvisionStepContext = {
    tenant: params.tenant,
    coolify: deps?.coolify,
    db: database,
    now,
    apps: {},
    secrets: {},
    bootstrap: {},
  }

  if (database) {
    await hydrateProvisionContext(database, ctx)
  }

  for (const step of steps) {
    const previous = await store.get(params.tenantId, step.key)
    const record: ProvisionStepRecord = previous ?? {
      tenantId: params.tenantId,
      step: step.key,
      status: "pending",
      attempts: 0,
      log: null,
    }

    if (previous?.status === "done") {
      finalSteps.push(record)
      continue
    }

    record.status = "running"
    record.attempts = (previous?.attempts ?? 0) + 1
    await store.set(params.tenantId, step.key, "running", null)

    try {
      await step.run(ctx)

      record.status = "done"
      record.log = null
      await store.set(params.tenantId, step.key, "done", null)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      record.status = "failed"
      record.log = message
      await store.set(params.tenantId, step.key, "failed", message)
      finalSteps.push(record)
      throw error
    }

    finalSteps.push(record)
  }

  return {
    ok: true,
    tenantId: params.tenantId,
    steps: finalSteps,
  }
}
