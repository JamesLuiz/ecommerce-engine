import { Hono } from "hono"
import type { Context } from "hono"
import { z } from "zod"
import { findSettlementByVendorId, saveSettlement } from "../services/settlement.js"
import { resolveBankAccount } from "../services/accounts.js"
import { createPaystackClient } from "../services/paystack.js"
import { vendorAuth } from "../middleware/vendorAuth.js"
import { resolveAccountRateLimit } from "../middleware/rateLimit.js"
import type { VendorEnv } from "../env.js"

const bankAccountSchema = z.object({
  bank_code: z
    .string()
    .trim()
    .regex(/^\d{3,6}$/, "bank_code must be a numeric Paystack bank code."),
  account_number: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "account_number must be 10 digits."),
})

const saveSettlementSchema = bankAccountSchema.extend({
  actor: z.string().trim().min(1).max(120).optional(),
})

const validationMessage = (error: z.ZodError): string =>
  error.issues[0]?.message ?? "Invalid payload."

export const settlementRouter = new Hono<VendorEnv>()

settlementRouter.use("*", vendorAuth)

settlementRouter.post(
  "/accounts/resolve",
  resolveAccountRateLimit,
  async (c: Context<VendorEnv>) => {
    const parsed = bankAccountSchema.safeParse(await c.req.json().catch(() => null))

    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "validation_error",
            message: validationMessage(parsed.error),
          },
        },
        400,
      )
    }

    const resolved = await resolveBankAccount(createPaystackClient(), parsed.data)

    return c.json({
      account_name: resolved.account_name,
      account_number: resolved.account_number,
      bank_code: resolved.bank_code,
      bank_id: resolved.bank_id,
    })
  },
)

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

  const parsed = saveSettlementSchema.safeParse(await c.req.json().catch(() => null))

  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: validationMessage(parsed.error),
        },
      },
      400,
    )
  }

  const actor = parsed.data.actor || c.req.header("x-admin-actor") || "unknown"

  const settlement = await saveSettlement(createPaystackClient(), vendor.id, {
    bank_code: parsed.data.bank_code,
    account_number: parsed.data.account_number,
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
