import type { Context } from "hono"
import { timingSafeEqual } from "node:crypto"

export const adminAuth = async (
  c: Context,
  next: () => Promise<void>,
): Promise<void> => {
  const header = c.req.header("Authorization")

  if (!header?.startsWith("Bearer ")) {
    c.json({ error: { code: "unauthorized", message: "Missing admin token" } }, 401)
    return
  }

  const token = header.slice("Bearer ".length)
  const expected = process.env.ADMIN_TOKEN ?? ""

  const tokenBuffer = Buffer.from(token)
  const expectedBuffer = Buffer.from(expected)

  const valid =
    tokenBuffer.length === expectedBuffer.length &&
    timingSafeEqual(tokenBuffer, expectedBuffer)

  if (!valid) {
    c.json({ error: { code: "unauthorized", message: "Invalid admin token" } }, 401)
    return
  }

  await next()
}
