import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

import { verify } from "@node-rs/argon2"
import { db } from "@lib/db"
import { customers } from "@flowcheq/db"
import { createStaffSession, STAFF_SESSION_COOKIE } from "@lib/auth"

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = LoginBody.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 })
  }

  const { email, password } = parsed.data
  const found = await db
    .select()
    .from(customers)
    .where(eq(customers.email, email))
    .limit(1)
  const customer = found[0]

  if (!customer) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
  }

  const valid = await verify(customer.password_hash, password)

  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
  }

  if (customer.role !== "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const token = await createStaffSession(customer.id)
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
