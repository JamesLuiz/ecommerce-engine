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
    const err = error instanceof Error ? error : new Error(String(error))
    const cause = (err as Error & { cause?: unknown }).cause
    const detail = cause instanceof Error ? cause.message : cause ? String(cause) : err.message

    console.error("[referral.enroll] failed", { error: err.message, cause: detail })

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Could not enrol. Please try again."
            : `Could not enrol: ${detail}`,
      },
      { status: 500 }
    )
  }
}
