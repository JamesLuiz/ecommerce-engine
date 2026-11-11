import { Hono } from "hono"
import type { Context } from "hono"
import { adminAuth } from "../middleware/adminAuth.js"
import {
  createVendor,
  findVendorById,
  rotateVendorToken,
  setVendorStatus,
  updateVendor,
} from "../services/vendors.js"
import type { CreateVendorInput, UpdateVendorInput } from "../types.js"
import type { VendorEnv } from "../env.js"

export const adminVendorsRouter = new Hono<VendorEnv>()

adminVendorsRouter.use("*", adminAuth)

adminVendorsRouter.post("/vendors", async (c: Context) => {
  const input = (await c.req.json().catch(() => null)) as CreateVendorInput | null

  if (!input?.slug || !input?.name || !input?.webhook_url) {
    return c.json(
      { error: { code: "validation_error", message: "Invalid vendor payload" } },
      400,
    )
  }

  const created = await createVendor(input)

  return c.json(
    {
      vendor_id: created.vendor.id,
      token: created.token,
      webhook_signing_secret: created.webhookSigningSecret,
    },
    201,
  )
})

adminVendorsRouter.post("/vendors/:id/rotate-token", async (c: Context) => {
  const id = c.req.param("id") ?? ""

  const token = await rotateVendorToken(id)

  return c.json({ token })
})

adminVendorsRouter.post("/vendors/:id/suspend", async (c: Context) => {
  const id = c.req.param("id") ?? ""

  const vendor = await findVendorById(id)

  if (!vendor) {
    return c.json({ error: { code: "not_found", message: "Vendor not found" } }, 404)
  }

  await setVendorStatus(id, "suspended")

  const updated = await findVendorById(id)

  return c.json({ status: "suspended", vendor: updated?.id ?? id })
})

adminVendorsRouter.post("/vendors/:id/activate", async (c: Context) => {
  const id = c.req.param("id") ?? ""

  const vendor = await findVendorById(id)

  if (!vendor) {
    return c.json({ error: { code: "not_found", message: "Vendor not found" } }, 404)
  }

  await setVendorStatus(id, "active")

  const updated = await findVendorById(id)

  return c.json({ status: "active", vendor: updated?.id ?? id })
})

adminVendorsRouter.patch("/vendors/:id", async (c: Context) => {
  const id = c.req.param("id") ?? ""
  const input = (await c.req.json().catch(() => null)) as UpdateVendorInput | null

  const vendor = await updateVendor(id, input ?? {})

  if (!vendor) {
    return c.json({ error: { code: "not_found", message: "Vendor not found" } }, 404)
  }

  return c.json({ id: vendor.id, name: vendor.name, status: vendor.status })
})
