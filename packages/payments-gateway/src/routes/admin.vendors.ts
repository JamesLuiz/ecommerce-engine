import { Hono } from "hono"
import type { Context } from "hono"
import { adminAuth } from "../middleware/adminAuth.js"
import { mergeOrigins } from "../origins.js"
import { webhookSecretFor } from "../services/crypto.js"
import {
  createVendor,
  findVendorById,
  findVendorBySlug,
  findVendorByToken,
  rotateVendorToken,
  setVendorStatus,
  updateVendor,
} from "../services/vendors.js"
import type { CreateVendorInput, EnsureVendorInput, UpdateVendorInput } from "../types.js"
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

  const created = await createVendor({
    ...input,
    allowed_origins: mergeOrigins([], input.allowed_origins),
  })

  return c.json(
    {
      vendor_id: created.vendor.id,
      token: created.token,
      webhook_signing_secret: created.webhookSigningSecret,
    },
    201,
  )
})

adminVendorsRouter.post("/vendors/ensure", async (c: Context) => {
  const input = (await c.req.json().catch(() => null)) as EnsureVendorInput | null

  if (
    !input?.slug ||
    !input?.name ||
    !input?.webhook_url ||
    !Array.isArray(input.allowed_origins) ||
    !input.allowed_origins.every((origin) => typeof origin === "string") ||
    (input.current_token !== undefined && typeof input.current_token !== "string")
  ) {
    return c.json(
      { error: { code: "validation_error", message: "Invalid vendor payload" } },
      400,
    )
  }

  const existing = await findVendorBySlug(input.slug)
  let token = input.current_token?.trim() ?? ""
  let reusedToken = false

  if (existing) {
    await updateVendor(existing.id, {
      name: input.name,
      webhook_url: input.webhook_url,
      allowed_origins: mergeOrigins(existing.allowed_origins, input.allowed_origins),
    })
    await setVendorStatus(existing.id, "active")

    const currentVendor = token ? await findVendorByToken(token) : null
    reusedToken = currentVendor?.id === existing.id

    if (!reusedToken) {
      token = ""
    }
  } else {
    await createVendor(input)
    token = ""
  }

  const vendor = await findVendorBySlug(input.slug)

  if (!vendor) {
    return c.json(
      { error: { code: "internal_error", message: "Vendor could not be resolved" } },
      500,
    )
  }

  if (!token) {
    token = await rotateVendorToken(vendor.id)
  }

  return c.json(
    {
      vendor_id: vendor.id,
      token,
      webhook_signing_secret: webhookSecretFor(vendor.id),
      allowed_origins: vendor.allowed_origins,
      created: !existing,
      rotated: !reusedToken,
    },
    existing ? 200 : 201,
  )
})

adminVendorsRouter.get("/vendors/:id", async (c: Context) => {
  const id = c.req.param("id") ?? ""

  const vendor = await findVendorById(id)

  if (!vendor) {
    return c.json({ error: { code: "not_found", message: "Vendor not found" } }, 404)
  }

  return c.json({
    id: vendor.id,
    slug: vendor.slug,
    name: vendor.name,
    status: vendor.status,
    webhook_url: vendor.webhook_url,
    allowed_origins: vendor.allowed_origins,
    currency: vendor.currency,
    webhook_signing_secret: webhookSecretFor(vendor.id),
  })
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

  const vendor = await updateVendor(id, {
    ...(input ?? {}),
    ...(input?.allowed_origins
      ? { allowed_origins: mergeOrigins([], input.allowed_origins) }
      : {}),
  })

  if (!vendor) {
    return c.json({ error: { code: "not_found", message: "Vendor not found" } }, 404)
  }

  return c.json({ id: vendor.id, name: vendor.name, status: vendor.status })
})
