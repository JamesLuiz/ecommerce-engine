import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import { releases } from "@flowcheq/db"
import { db } from "@lib/db"
import { recordAudit } from "@lib/audit"

const ReleaseBody = z.object({
  version: z
    .string()
    .min(1)
    .max(64)
    .regex(/^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/, "Expected a version like v1.2.3"),
})

function hasValidToken(request: Request): boolean {
  const secret = process.env.RELEASE_WEBHOOK_SECRET

  if (!secret) {
    return false
  }

  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : ""
  const provided = new Uint8Array(Buffer.from(token))
  const expected = new Uint8Array(Buffer.from(secret))

  if (provided.length !== expected.length) {
    return false
  }

  return timingSafeEqual(provided, expected)
}

export async function POST(request: Request) {
  if (!hasValidToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = ReleaseBody.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid release payload" }, { status: 400 })
  }

  const { version } = parsed.data

  await db.insert(releases).values({ version }).onConflictDoNothing()
  await recordAudit({
    actor: "release-workflow",
    action: "release.register",
    meta: { version },
  })

  return NextResponse.json({ ok: true, version }, { status: 201 })
}
