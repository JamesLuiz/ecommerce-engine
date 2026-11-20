import { NextResponse } from "next/server"

import { settleReferralEarnings } from "@lib/referral"
import { settlementRequestSchema } from "@lib/referral-rules"
import { getStaffSession } from "@lib/staff"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const staff = await getStaffSession()

  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = settlementRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid settlement request", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    )
  }

  const result = await settleReferralEarnings(parsed.data, staff.email)

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 })
  }

  return NextResponse.json(result)
}
