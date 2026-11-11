import { Hono } from "hono"
import type { Context } from "hono"
import { saveSettlement, findSettlementByVendorId } from "../services/settlement.js"
import { PaystackClient } from "../services/paystack.js"
import { vendorAuth } from "../middleware/vendorAuth.js"
import type { SettlementInput } from "../types.js"
import type { VendorEnv } from "../env.js"

export const settlementRouter = new Hono<VendorEnv>()

settlementRouter.use("*", vendorAuth)

settlementRouter.get("/settlement", async (c: Context<VendorEnv>) => {
  const vendor = c.get("vendor")

  const settlement = await findSettlementByVendorId(vendor.id)

  if (!settlement) {
    return c.json(
      { error: { code: "settlement_not_configured", message: "Vendor has no settlement account." } },
      409,
    )
  }

  return c.json(settlement)
})

settlementRouter.put("/settlement", async (c: Context<VendorEnv>) => {
  const vendor = c.get("vendor")

  const input = (await c.req.json().catch(() => null)) as SettlementInput | null

  if (!input?.bank_code || !input?.account_number) {
    return c.json(
      { error: { code: "validation_error", message: "bank_code and account_number are required." } },
      400,
    )
  }

  if (!/^\d{10}$/.test(input.account_number)) {
    return c.json(
      { error: { code: "validation_error", message: "account_number must be 10 digits." } },
      400,
    )
  }

  const client = new PaystackClient(
    process.env.PAYSTACK_SECRET_KEY ?? "",
    process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co",
  )

  const settlement = await saveSettlement(client, vendor.id, {
    ...input,
    actor: c.req.header("x-admin-actor") ?? "unknown",
  })

  return c.json(settlement)
})
