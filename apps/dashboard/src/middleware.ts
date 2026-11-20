import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const STAFF_SESSION_COOKIE = "flowcheq_staff_session"
const REFERRAL_COOKIE = "flowcheq_referral"
const REFERRAL_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/
const THIRTY_DAYS = 60 * 60 * 24 * 30

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get(STAFF_SESSION_COOKIE)?.value

    if (!token) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("next", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  const response = NextResponse.next()

  // A referral link points at the public sales page. Remember the code so a
  // purchase completed minutes or days later is still attributed to it.
  if (pathname === "/") {
    const code = request.nextUrl.searchParams.get("ref")

    if (code && REFERRAL_CODE_PATTERN.test(code)) {
      response.cookies.set(REFERRAL_COOKIE, code, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: THIRTY_DAYS,
      })
    }
  }

  return response
}

export const config = {
  matcher: ["/admin/:path*", "/"],
}
