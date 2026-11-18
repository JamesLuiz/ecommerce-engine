import { createHmac, timingSafeEqual } from "node:crypto"

import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { orders } from "@flowcheq/db"
import { db } from "@lib/db"
import { markOrderPaid } from "@lib/orders"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-paystack-signature") ?? ""
  const secret = process.env.PAYSTACK_SECRET_KEY ?? ""

  if (!secret || !signature) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const expected = createHmac("sha512", secret).update(rawBody).digest("hex")
  const sigBuf = Buffer.from(signature, "hex")
  const expBuf = Buffer.from(expected, "hex")

  if (
    sigBuf.length !== expBuf.length ||
    !timingSafeEqual(new Uint8Array(sigBuf), new Uint8Array(expBuf))
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: { event?: string; data?: { reference?: string } }
  try {
    payload = JSON.parse(rawBody) as { event?: string; data?: { reference?: string } }
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  if (payload.event !== "charge.success") {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const reference = payload.data?.reference
  if (!reference) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.provider_reference, reference))
    .limit(1)

  const order = rows[0]
  if (!order) {
    return NextResponse.json({ ok: true, ignored: true, reason: "unknown_reference" })
  }

  const result = await markOrderPaid(order.id)
  return NextResponse.json(result ?? { ok: true })
}
