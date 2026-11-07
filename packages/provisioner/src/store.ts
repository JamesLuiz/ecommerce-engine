import { and, eq } from "drizzle-orm"

import { provision_steps } from "@flowcheq/db"
import type { AppDb } from "./types"
import type { ProvisionStepKey, ProvisionStepRecord, ProvisionStepStatus } from "./types"

export interface ProvisionStepStore {
  get(tenantId: string, step: ProvisionStepKey): Promise<ProvisionStepRecord | null>
  set(tenantId: string, step: ProvisionStepKey, status: ProvisionStepStatus, log?: string | null): Promise<void>
}

export function createProvisionStore(deps: { db?: AppDb }): ProvisionStepStore {
  const database = deps.db

  if (database) {
    return {
      get: async (tenantId: string, step: ProvisionStepKey) => {
        const rows = await database
          .select()
          .from(provision_steps)
          .where(
            and(
              eq(provision_steps.tenant_id, tenantId),
              eq(provision_steps.step, step)
            )
          )

        const row = rows[0]

        if (!row) {
          return null
        }

        return {
          tenantId,
          step,
          status: row.status as ProvisionStepStatus,
          attempts: row.attempts,
          log: row.log ?? null,
        }
      },
      set: async (tenantId: string, step: ProvisionStepKey, status: ProvisionStepStatus, log?: string | null) => {
        await database
          .insert(provision_steps)
          .values({
            tenant_id: tenantId,
            step,
            status,
            log: log ?? null,
            attempts: 0,
          })
          .onConflictDoUpdate({
            target: [provision_steps.tenant_id, provision_steps.step],
            set: { status, log: log ?? null, updated_at: new Date() },
          })
      },
    }
  }

  const records = new Map<string, ProvisionStepRecord>()

  return {
    get: async (tenantId: string, step: ProvisionStepKey) => {
      const key = `${tenantId}:${step}`
      return records.get(key) ?? null
    },
    set: async (tenantId: string, step: ProvisionStepKey, status: ProvisionStepStatus, log?: string | null) => {
      records.set(`${tenantId}:${step}`, {
        tenantId,
        step,
        status,
        attempts: 0,
        log: log ?? null,
      })
    },
  }
}
