import { NextResponse } from "next/server"

import { enrollReferral } from "@lib/referral"
import { enrollmentSchema } from "@lib/referral-rules"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = enrollmentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid enrolment details",
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 }
    )
  }

  try {
    const result = await enrollReferral(parsed.data, request)

    return NextResponse.json({
      ok: true,
      alreadyEnrolled: result.alreadyEnrolled,
      name: result.enrollment.name,
      code: result.enrollment.code,
      referralUrl: result.referralUrl,
      meUrl: result.meUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Could not enrol: ${message}` }, { status: 500 })
  }
}
