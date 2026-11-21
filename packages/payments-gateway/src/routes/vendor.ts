import { Hono } from "hono"
import type { Context } from "hono"
import { vendorAuth } from "../middleware/vendorAuth.js"
import type { VendorEnv } from "../env.js"

export const vendorRouter = new Hono<VendorEnv>()

vendorRouter.use("*", vendorAuth)

vendorRouter.get("/vendor", (c: Context<VendorEnv>) => {
  const vendor = c.get("vendor")

  return c.json({
    id: vendor.id,
    slug: vendor.slug,
    status: vendor.status,
    webhook_url: vendor.webhook_url,
    allowed_origins: vendor.allowed_origins,
  })
})
