import type { Context } from "hono"
import type { ErrorCode } from "../types.js"
import type { VendorEnv } from "../env.js"

export type RateLimitOptions = {
  windowMs?: number
  maxRequests?: number
  keyGenerator?: (c: Context<VendorEnv>) => string
}

export const createRateLimiter = (options: RateLimitOptions = {}) => {
  const windowMs = options.windowMs ?? 60 * 1000
  const maxRequests = options.maxRequests ?? 60
  const keyGen =
    options.keyGenerator ??
    ((c) =>
      c.get("vendor")?.id ??
      c.req.header("x-forwarded-for") ??
      c.req.header("x-real-ip") ??
      "anonymous")

  const windows = new Map<string, { start: number; count: number }>()

  return async (c: Context<VendorEnv>, next: () => Promise<void>): Promise<void> => {
    const identifier = keyGen(c)
    const now = Date.now()
    const windowStart = Math.floor(now / windowMs) * windowMs

    const current = windows.get(identifier) ?? { start: windowStart, count: 0 }

    if (current.start !== windowStart) {
      current.start = windowStart
      current.count = 0
    }

    const count = current.count + 1
    windows.set(identifier, { start: windowStart, count })

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
}

export const rateLimit = createRateLimiter()

export const resolveAccountRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 20,
  keyGenerator: (c) => `resolve:${c.get("vendor")?.id ?? "anonymous"}`,
})
