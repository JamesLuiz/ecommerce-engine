import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { orders } from "@flowcheq/db"
import { db } from "@lib/db"
import { hasValidBearerToken } from "@lib/internal-auth"
import { markOrderPaid } from "@lib/orders"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  if (!hasValidBearerToken(request, process.env.ORDER_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { reference } = await params

  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.provider_reference, reference))
  const order = rows[0]

  // Tenant checkout transactions also reach the gateway webhook. They are not
  // plan orders, so an unknown reference is a no-op instead of an error.
  if (!order) {
    return NextResponse.json({ ok: true, ignored: true, reason: "unknown_reference" })
  }

  const result = await markOrderPaid(order.id)

  return NextResponse.json(result)
}
