import { eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

import { hash } from "@node-rs/argon2"
import { customers } from "@flowcheq/db"
import { db } from "@lib/db"
import { recordAudit } from "@lib/audit"
import { createStaffSession, STAFF_SESSION_COOKIE } from "@lib/auth"

// Arbitrary constant for the Postgres advisory lock that serializes concurrent
// first setups, so exactly one account can be created even under a race.
const SETUP_LOCK_KEY = 742193

const SetupBody = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(12).max(200),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = SetupBody.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Name, a valid email and a password of at least 12 characters are required" },
      { status: 400 }
    )
  }

  // Kept verbatim: the login route compares emails exactly as stored.
  const { name, email } = parsed.data

  // Hash outside the transaction so the advisory lock is held briefly.
  const passwordHash = await hash(parsed.data.password)

  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${SETUP_LOCK_KEY})`)

    const existing = await tx
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.role, "staff"))
      .limit(1)

    if (existing.length > 0) {
      return null
    }

    const inserted = await tx
      .insert(customers)
      .values({
        email,
        password_hash: passwordHash,
        role: "staff",
        name,
      })
      .returning({ id: customers.id })

    return inserted[0] ?? null
  })

  if (!created) {
    return NextResponse.json(
      { error: "Setup is locked: a staff account already exists" },
      { status: 409 }
    )
  }

  await recordAudit({
    actor: "setup",
    action: "staff.created",
    meta: { email },
  })

  // Sign the new account in immediately so setup ends inside the dashboard.
  const token = await createStaffSession(created.id)
  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: STAFF_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })

  return response
}
