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

export interface MarkOrderFulfilledResult {
  ok: true
  orderId: string
  alreadyFulfilled?: boolean
}

export interface DeployOrderResult {
  ok: true
  orderId: string
  tenantId: string | null
  jobId?: string
}

export interface MarkOrderPaidOptions {
  actor?: string
  /**
   * When true (default), queue provisioning for the order's tenant after
   * marking the order paid. Set to false for manual admin "mark paid" actions
   * when deployment should be triggered separately.
   */
  provision?: boolean
}

type OrderRow = typeof orders.$inferSelect

/**
 * Resolves (or creates) the tenant described by an order's signup payload.
 * Idempotent and safe under concurrent calls.
 */
async function resolveOrderTenant(order: OrderRow): Promise<string | null> {
  const signupPayload = (order.signup_payload ?? {}) as { slug?: unknown }
  const slug = typeof signupPayload.slug === "string" ? signupPayload.slug : null

  if (!slug) {
    return null
  }

  const tenantRows = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(and(eq(tenants.customer_id, order.customer_id), eq(tenants.slug, slug)))
  const tenant = tenantRows[0]

  if (tenant) {
    return tenant.id
  }

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
    return created[0].id
  }

  const existing = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))

  return existing[0]?.id ?? null
}

/**
 * Marks an order paid and, by default, queues provisioning for the tenant
 * described by its signup payload. Safe to call repeatedly.
 */
export async function markOrderPaid(
  orderId: string,
  options: MarkOrderPaidOptions = {}
): Promise<MarkOrderPaidResult | null> {
  const provision = options.provision ?? true
  const orderRows = await db.select().from(orders).where(eq(orders.id, orderId))
  const order = orderRows[0]

  if (!order) {
    return null
  }

  let alreadyPaid = order.status === "paid"

  if (!alreadyPaid) {
    const updated = await db
      .update(orders)
      .set({ status: "paid", paid_at: new Date() })
      .where(and(eq(orders.id, order.id), ne(orders.status, "paid")))
      .returning({ id: orders.id })

    if (updated.length === 0) {
      alreadyPaid = true
    }
  }

  if (alreadyPaid && !provision) {
    const signupPayload = (order.signup_payload ?? {}) as { slug?: unknown }
    const slug = typeof signupPayload.slug === "string" ? signupPayload.slug : null
    let tenantId: string | null = null

    if (slug) {
      const tenantRows = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(and(eq(tenants.customer_id, order.customer_id), eq(tenants.slug, slug)))
      tenantId = tenantRows[0]?.id ?? null
    }

    return { ok: true, orderId: order.id, tenantId, alreadyPaid: true }
  }

  const tenantId = await resolveOrderTenant(order)
  let jobId: string | undefined

  if (provision && tenantId) {
    await db.update(tenants).set({ status: "provisioning" }).where(eq(tenants.id, tenantId))
    jobId = await enqueueProvision(tenantId)
  }

  await recordAudit({
    actor: options.actor ?? "payment-webhook",
    action: alreadyPaid ? "order.deploy" : "order.paid",
    tenantId,
    meta: { orderId: order.id, jobId, provision },
  })

  return { ok: true, orderId: order.id, tenantId, jobId, ...(alreadyPaid ? { alreadyPaid: true } : {}) }
}

/**
 * Queues provisioning (deploy) for a paid order's tenant. Creates/resolves the
 * tenant if needed. Safe to call repeatedly.
 */
export async function deployOrder(
  orderId: string,
  options: { actor?: string } = {}
): Promise<DeployOrderResult | { ok: false; error: string } | null> {
  const orderRows = await db.select().from(orders).where(eq(orders.id, orderId))
  const order = orderRows[0]

  if (!order) {
    return null
  }

  if (order.status !== "paid") {
    return { ok: false, error: "Order must be paid before it can be deployed" }
  }

  const tenantId = await resolveOrderTenant(order)

  if (!tenantId) {
    return { ok: false, error: "Order has no tenant/store slug to deploy" }
  }

  await db.update(tenants).set({ status: "provisioning" }).where(eq(tenants.id, tenantId))
  const jobId = await enqueueProvision(tenantId)

  await recordAudit({
    actor: options.actor ?? "staff",
    action: "order.deploy",
    tenantId,
    meta: { orderId: order.id, jobId },
  })

  return { ok: true, orderId: order.id, tenantId, jobId }
}

/**
 * Marks an order fulfilled. Safe to call repeatedly: an already fulfilled order
 * returns early.
 */
export async function markOrderFulfilled(
  orderId: string,
  options: { actor?: string } = {}
): Promise<MarkOrderFulfilledResult | null> {
  const orderRows = await db.select().from(orders).where(eq(orders.id, orderId))
  const order = orderRows[0]

  if (!order) {
    return null
  }

  if (order.fulfilled_at) {
    return { ok: true, orderId: order.id, alreadyFulfilled: true }
  }

  await db
    .update(orders)
    .set({ fulfilled_at: new Date() })
    .where(eq(orders.id, order.id))

  await recordAudit({
    actor: options.actor ?? "staff",
    action: "order.fulfilled",
    meta: { orderId: order.id },
  })

  return { ok: true, orderId: order.id }
}
