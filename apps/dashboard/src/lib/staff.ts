import { cookies } from "next/headers"

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
