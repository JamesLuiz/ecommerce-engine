import { NextResponse } from "next/server"

import { hasValidBearerToken } from "@lib/internal-auth"
import { markOrderPaid } from "@lib/orders"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasValidBearerToken(request, process.env.ORDER_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const result = await markOrderPaid(id)

  if (!result) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  return NextResponse.json(result)
}
