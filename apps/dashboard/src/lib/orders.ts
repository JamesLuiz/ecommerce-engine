import "server-only"

import { and, eq, ne } from "drizzle-orm"

import { orders, tenants } from "@flowcheq/db"
import { db } from "@lib/db"
import { recordAudit } from "@lib/audit"
import { enqueueProvision } from "@lib/queue"

export interface MarkOrderPaidResult {
  ok: true
  orderId: string
  tenantId: string | null
  jobId?: string
  alreadyPaid?: boolean
}

export interface MarkOrderPaidOptions {
  actor?: string
}

/**
 * Marks an order paid and queues provisioning for the tenant described by its
 * signup payload. Safe to call repeatedly: a paid order returns early, the
 * tenant insert tolerates a concurrent create and the provisioning job id is
 * deterministic.
 */
export async function markOrderPaid(
  orderId: string,
  options: MarkOrderPaidOptions = {}
): Promise<MarkOrderPaidResult | null> {
  const orderRows = await db.select().from(orders).where(eq(orders.id, orderId))
  const order = orderRows[0]

  if (!order) {
    return null
  }

  const updated = await db
    .update(orders)
    .set({ status: "paid", paid_at: new Date() })
    .where(and(eq(orders.id, order.id), ne(orders.status, "paid")))
    .returning({ id: orders.id })

  if (updated.length === 0) {
    return { ok: true, orderId: order.id, tenantId: null, alreadyPaid: true }
  }

  const signupPayload = (order.signup_payload ?? {}) as { slug?: unknown }
  const slug = typeof signupPayload.slug === "string" ? signupPayload.slug : null
  let tenantId: string | null = null

  if (slug) {
    const tenantRows = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.customer_id, order.customer_id), eq(tenants.slug, slug)))
    const tenant = tenantRows[0]

    if (tenant) {
      tenantId = tenant.id
    } else {
      const created = await db
        .insert(tenants)
        .values({
          customer_id: order.customer_id,
          slug,
          config: order.signup_payload,
          status: "provisioning",
        })
        .onConflictDoNothing({ target: tenants.slug })
        .returning({ id: tenants.id })

      if (created.length > 0) {
        tenantId = created[0].id
      } else {
        const existing = await db
          .select({ id: tenants.id })
          .from(tenants)
          .where(eq(tenants.slug, slug))

        tenantId = existing[0]?.id ?? null
      }
    }
  }

  const jobId = tenantId ? await enqueueProvision(tenantId) : undefined

  await recordAudit({
    actor: options.actor ?? "payment-webhook",
    action: "order.paid",
    tenantId,
    meta: { orderId: order.id, jobId },
  })

  return { ok: true, orderId: order.id, tenantId, jobId }
}
