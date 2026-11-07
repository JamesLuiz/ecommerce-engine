import { audit_log } from "@flowcheq/db"
import { db } from "@lib/db"

export interface AuditEntry {
  actor: string
  action: string
  tenantId?: string | null
  meta?: Record<string, unknown> | null
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  await db.insert(audit_log).values({
    actor: entry.actor,
    action: entry.action,
    tenant_id: entry.tenantId ?? null,
    meta: entry.meta ?? null,
  })
}
