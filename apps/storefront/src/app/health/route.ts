import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Container health probe. Kept independent of Medusa so the storefront can
 * report liveness even when the backend is still starting.
 */
export function GET() {
  return NextResponse.json({ status: "ok" })
}
