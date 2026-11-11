import type { Context } from "hono"
import type { ErrorCode } from "../types.js"
import type { VendorEnv } from "../env.js"

const windows = new Map<string, { start: number; count: number }>()

export const rateLimit = async (
  c: Context<VendorEnv>,
  next: () => Promise<void>,
): Promise<void> => {
  const identifier = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anonymous"
  const now = Date.now()
  const windowMs = 60 * 1000
  const windowStart = Math.floor(now / windowMs) * windowMs

  const current = windows.get(identifier) ?? { start: windowStart, count: 0 }

  if (current.start !== windowStart) {
    current.start = windowStart
    current.count = 0
  }

  const count = current.count + 1
  windows.set(identifier, { start: windowStart, count })

  const maxRequests = 60
  const allowed = count <= maxRequests

  c.header("x-ratelimit-limit", String(maxRequests))
  c.header("x-ratelimit-remaining", String(Math.max(0, maxRequests - count)))
  c.header("x-ratelimit-reset", String(Math.ceil((windowStart + windowMs - now) / 1000)))

  if (!allowed) {
    c.json(
      { error: { code: "rate_limited" as ErrorCode, message: "Too many requests" } },
      429,
    )
    return
  }

  await next()
}
