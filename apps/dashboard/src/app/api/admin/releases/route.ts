import { desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

import { releases } from "@flowcheq/db"
import { db } from "@lib/db"
import { recordAudit } from "@lib/audit"
import { getStaffSession } from "@lib/staff"

export const dynamic = "force-dynamic"

const UpdateBody = z.object({
  version: z.string().min(1),
  ring: z.enum(["none", "internal", "canary", "all"]),
})

export async function GET() {
  const staff = await getStaffSession()

  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await db.select().from(releases).orderBy(desc(releases.created_at)).limit(100)

  return NextResponse.json({ releases: rows })
}

export async function POST(request: Request) {
  const staff = await getStaffSession()

  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = UpdateBody.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid release update" }, { status: 400 })
  }

  const { version, ring } = parsed.data
  const updated = await db
    .update(releases)
    .set({ ring })
    .where(eq(releases.version, version))
    .returning({ version: releases.version })

  if (updated.length === 0) {
    return NextResponse.json({ error: "Release not found" }, { status: 404 })
  }

  await recordAudit({
    actor: staff.email,
    action: "release.ring",
    meta: { version, ring },
  })

  return NextResponse.json({ ok: true, version, ring })
}
