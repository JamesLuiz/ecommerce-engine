import { cookies } from "next/headers"
import { eq } from "drizzle-orm"

import { db } from "@lib/db"
import { customers } from "@flowcheq/db"
import { getStaffCustomer, STAFF_SESSION_COOKIE } from "./auth"

export interface StaffSession {
  id: string
  email: string
  role: string
}

/**
 * Returns the signed-in staff member, or null. Unlike the middleware (which
 * only checks that a cookie exists), this verifies the session in the database
 * and rejects customer accounts.
 */
export async function getStaffSession(): Promise<StaffSession | null> {
  const token = (await cookies()).get(STAFF_SESSION_COOKIE)?.value
  const customer = await getStaffCustomer(token)

  if (!customer || customer.role !== "staff") {
    return null
  }

  return customer
}

/**
 * True once any staff account exists. Drives the first-run setup redirect:
 * the login page sends visitors to /setup while this is false.
 */
export async function staffAccountExists(): Promise<boolean> {
  const rows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.role, "staff"))
    .limit(1)

  return rows.length > 0
}
