import { and, eq, gt } from "drizzle-orm"
import { randomBytes } from "node:crypto"

import { db } from "@lib/db"
import { customers, sessions } from "@flowcheq/db"

export const STAFF_SESSION_COOKIE = "flowcheq_staff_session"

const SESSION_TTL_DAYS = 7

export async function createStaffSession(customerId: string): Promise<string> {
  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({
    id: token,
    customer_id: customerId,
    expires_at: expiresAt,
  })

  return token
}

export async function getStaffCustomer(
  token: string | undefined
): Promise<{ id: string; email: string; role: string } | null> {
  if (!token) {
    return null
  }

  const rows = await db
    .select({
      customer_id: sessions.customer_id,
      email: customers.email,
      role: customers.role,
    })
    .from(sessions)
    .innerJoin(customers, eq(sessions.customer_id, customers.id))
    .where(
      and(eq(sessions.id, token), gt(sessions.expires_at, new Date()))
    )

  const row = rows[0]

  if (!row) {
    return null
  }

  return {
    id: row.customer_id,
    email: row.email,
    role: row.role,
  }
}
