import { desc } from "drizzle-orm"
import { NextResponse } from "next/server"

import { audit_log } from "@flowcheq/db"
import { db } from "@lib/db"
import { getStaffSession } from "@lib/staff"

export const dynamic = "force-dynamic"

export async function GET() {
  const staff = await getStaffSession()

  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await db.select().from(audit_log).orderBy(desc(audit_log.at)).limit(200)

  return NextResponse.json({ audit: rows })
}
