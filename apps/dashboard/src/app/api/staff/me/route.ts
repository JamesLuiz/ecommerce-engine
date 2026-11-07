import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { getStaffCustomer, STAFF_SESSION_COOKIE } from "@lib/auth"

export async function GET() {
  const sessionToken = (await cookies()).get(STAFF_SESSION_COOKIE)?.value
  const customer = await getStaffCustomer(sessionToken)

  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({ customer })
}
