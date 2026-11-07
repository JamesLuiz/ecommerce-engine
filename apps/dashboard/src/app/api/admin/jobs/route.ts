import { NextResponse } from "next/server"

import { getQueueSnapshot } from "@lib/queue"
import { getStaffSession } from "@lib/staff"

export const dynamic = "force-dynamic"

export async function GET() {
  const staff = await getStaffSession()

  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const snapshot = await getQueueSnapshot()
    return NextResponse.json(snapshot)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Queue unavailable", detail: message }, { status: 503 })
  }
}
