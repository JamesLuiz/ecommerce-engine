import { desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

import { TenantConfig } from "@flowcheq/tenant-config"
import { customers, orders, plans } from "@flowcheq/db"
import { db } from "@lib/db"
import { recordAudit } from "@lib/audit"
import { markOrderPaid } from "@lib/orders"
import { getStaffSession } from "@lib/staff"

export const dynamic = "force-dynamic"

const CreateOrderBody = z.object({
  customer_id: z.uuid(),
  plan_id: z.string().min(1).max(64),
  provider: z.enum(["paystack"]),
  provider_reference: z.string().min(1).max(128),
  amount_minor: z.number().int().positive(),
  currency: z.string().length(3).default("NGN"),
  status: z.enum(["pending", "paid", "failed"]).default("pending"),
  signup_payload: z.unknown(),
})

const MAX_ORDERS_LIMIT = 500

const OrderStatusSchema = z.enum(["pending", "paid", "failed"])

export async function GET(request: Request) {
  const staff = await getStaffSession()

  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsedStatus = OrderStatusSchema.safeParse(searchParams.get("status") ?? undefined)

  if (searchParams.get("status") && !parsedStatus.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const status = parsedStatus.success ? parsedStatus.data : undefined
  const parsedLimit = Number(searchParams.get("limit") ?? MAX_ORDERS_LIMIT)
  const limit =
    Number.isInteger(parsedLimit) && parsedLimit > 0 && parsedLimit <= MAX_ORDERS_LIMIT
      ? parsedLimit
      : MAX_ORDERS_LIMIT

  const base = db
    .select({
      id: orders.id,
      customer_id: orders.customer_id,
      customer_email: customers.email,
      customer_name: customers.name,
      plan_id: orders.plan_id,
      provider: orders.provider,
      provider_reference: orders.provider_reference,
      amount_minor: orders.amount_minor,
      currency: orders.currency,
      status: orders.status,
      signup_payload: orders.signup_payload,
      created_at: orders.created_at,
      paid_at: orders.paid_at,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customer_id, customers.id))

  const filtered = status ? base.where(eq(orders.status, status)) : base
  const rows = await filtered.orderBy(desc(orders.created_at)).limit(limit)

  return NextResponse.json({ orders: rows })
}

export async function POST(request: Request) {
  const staff = await getStaffSession()

  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = CreateOrderBody.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 })
  }

  const signup = TenantConfig.safeParse(parsed.data.signup_payload)

  if (!signup.success) {
    return NextResponse.json(
      {
        error: "Invalid signup payload",
        issues: signup.error.issues.map(
          (issue) => `${issue.path.join(".") || "signup_payload"}: ${issue.message}`
        ),
      },
      { status: 400 }
    )
  }

  const { customer_id, plan_id, provider, provider_reference, amount_minor, currency, status } =
    parsed.data

  const customerRows = await db.select().from(customers).where(eq(customers.id, customer_id))
  const customer = customerRows[0]

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 })
  }

  const planRows = await db.select().from(plans).where(eq(plans.id, plan_id))
  const plan = planRows[0]

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 })
  }

  try {
    const [order] = await db
      .insert(orders)
      .values({
        customer_id,
        plan_id,
        provider,
        provider_reference,
        amount_minor,
        currency,
        // A paid order is inserted as pending first so the same code path that
        // the payment webhook uses can mark it paid and queue provisioning.
        status: status === "paid" ? "pending" : status,
        signup_payload: signup.data,
      })
      .returning()

    await recordAudit({
      actor: staff.email,
      action: "order.created",
      meta: { orderId: order.id, customerId: customer_id, planId: plan_id, status },
    })

    const provisioning =
      status === "paid" ? await markOrderPaid(order.id, { actor: staff.email }) : null

    const finalOrder = provisioning
      ? { ...order, status: "paid", paid_at: new Date() }
      : order

    return NextResponse.json({ order: finalOrder, provisioning }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Order create failed: ${message}` }, { status: 503 })
  }
}
