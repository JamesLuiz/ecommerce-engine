import type { Context } from "hono"
import type { VendorEnv } from "../env.js"
import { findVendorByToken } from "../services/vendors.js"

export const vendorAuth = async (
  c: Context<VendorEnv>,
  next: () => Promise<void>,
): Promise<void> => {
  const header = c.req.header("Authorization")

  if (!header?.startsWith("Bearer ")) {
    c.json({ error: { code: "unauthorized", message: "Missing bearer token" } }, 401)
    return
  }

  const token = header.slice("Bearer ".length)

  const vendor = await findVendorByToken(token)

  if (!vendor) {
    c.json({ error: { code: "invalid_token", message: "Invalid vendor token" } }, 401)
    return
  }

  if (vendor.status !== "active") {
    c.json({ error: { code: "vendor_suspended", message: "Vendor is suspended" } }, 403)
    return
  }

  c.set("vendor", vendor)
  await next()
}
