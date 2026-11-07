import { NextResponse } from "next/server"

import { STAFF_SESSION_COOKIE } from "@lib/auth"

export async function GET() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: STAFF_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })

  return response
}
