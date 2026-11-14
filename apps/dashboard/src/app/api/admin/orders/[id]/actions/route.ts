import { NextResponse } from "next/server"
import { z } from "zod"

import { getStaffSession } from "@lib/staff"
import { markOrderPaid } from "@lib/orders"

const OrderActionBody = z.object({
  action: z.literal("mark_paid"),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffSession()

  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = OrderActionBody.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const { id } = await params
  const result = await markOrderPaid(id, { actor: staff.email })

  if (!result) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  return NextResponse.json(result)
}
