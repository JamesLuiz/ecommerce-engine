import type { Context } from "hono"
import type { VendorEnv } from "../env.js"
import { findVendorByToken } from "../services/vendors.js"

export const vendorAuth = async (
  c: Context<VendorEnv>,
  next: () => Promise<void>,
): Promise<Response | void> => {
  const header = c.req.header("Authorization")

  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: { code: "unauthorized", message: "Missing bearer token" } }, 401)
  }

  const token = header.slice("Bearer ".length)

  const vendor = await findVendorByToken(token)

  if (!vendor) {
    return c.json({ error: { code: "invalid_token", message: "Invalid vendor token" } }, 401)
  }

  if (vendor.status !== "active") {
    return c.json({ error: { code: "vendor_suspended", message: "Vendor is suspended" } }, 403)
  }

  c.set("vendor", vendor)
  await next()
}
