import { Hono } from "hono"
import type { Context } from "hono"
import { saveSettlement, findSettlementByVendorId } from "../services/settlement.js"
import { PaystackClient } from "../services/paystack.js"
import { vendorAuth } from "../middleware/vendorAuth.js"
import { resolveAccountRateLimit } from "../middleware/rateLimit.js"
import type { SettlementInput } from "../types.js"
import type { VendorEnv } from "../env.js"

export const settlementRouter = new Hono<VendorEnv>()

settlementRouter.use("*", vendorAuth)

settlementRouter.post("/accounts/resolve", resolveAccountRateLimit, async (c: Context<VendorEnv>) => {
  const input = (await c.req.json().catch(() => null)) as {
    bank_code?: string
    account_number?: string
  } | null

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

  try {
    const resolved = await client.resolveAccount(input.bank_code, input.account_number)
    return c.json({
      account_name: resolved.account_name,
      account_number: resolved.account_number,
      bank_code: resolved.bank_code,
    })
  } catch (err: unknown) {
    return c.json(
      {
        error: {
          code: "account_resolve_failed",
          message: err instanceof Error ? err.message : "Could not resolve account details.",
        },
      },
      422,
    )
  }
})

settlementRouter.get("/settlement", async (c: Context<VendorEnv>) => {
  const vendor = c.get("vendor")

  const settlement = await findSettlementByVendorId(vendor.id)

  if (!settlement) {
    return c.json(
      { error: { code: "settlement_not_configured", message: "Vendor has no settlement account." } },
      409,
    )
  }

  return c.json({
    bank_code: settlement.bank_code,
    bank_name: settlement.bank_name,
    account_number_last4: settlement.account_number_last4,
    account_name: settlement.account_name,
    status: settlement.status,
    verified_at: settlement.verified_at,
  })
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

  const actor = input.actor || c.req.header("x-admin-actor") || "unknown"

  const settlement = await saveSettlement(client, vendor.id, {
    ...input,
    actor,
  })

  return c.json({
    bank_code: settlement.bank_code,
    bank_name: settlement.bank_name,
    account_number_last4: settlement.account_number_last4,
    account_name: settlement.account_name,
    status: settlement.status,
    verified_at: settlement.verified_at,
  })
})
