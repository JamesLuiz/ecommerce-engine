import { Hono } from "hono"
import type { Context } from "hono"
import { vendorAuth } from "../middleware/vendorAuth.js"
import { db } from "../db.js"
import { PaystackClient } from "../services/paystack.js"
import { loadConfig } from "../config.js"
import type { VendorEnv } from "../env.js"
import type { Transaction } from "../types.js"

export const refundsRouter = new Hono<VendorEnv>()

refundsRouter.use("*", vendorAuth)

refundsRouter.post("/refunds", async (c: Context<VendorEnv>) => {
  const config = loadConfig(process.env)

  if (!config.REFUNDS_ENABLED) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "Refunds are currently disabled.",
        },
      },
      400,
    )
  }

  const vendor = c.get("vendor")
  const input = (await c.req.json().catch(() => null)) as {
    reference?: string
    amount?: number
    reason?: string
  } | null

  if (!input?.reference) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "reference is required for refund.",
        },
      },
      400,
    )
  }

  const rows = (await db.unsafe<Transaction[]>(
    "select * from transactions where vendor_id = $1 and reference = $2 limit 1",
    [vendor.id, input.reference],
  )) as Transaction[]

  const transaction = rows[0]

  if (!transaction) {
    return c.json(
      { error: { code: "not_found", message: "Transaction not found." } },
      404,
    )
  }

  if (transaction.status !== "success" && transaction.status !== "partially_refunded") {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "Only successful transactions can be refunded.",
        },
      },
      400,
    )
  }

  const refundAmount = input.amount ?? transaction.amount

  const client = new PaystackClient(
    process.env.PAYSTACK_SECRET_KEY ?? "",
    process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co",
  )

  try {
    const paystackRefund = await client.refund(
      transaction.reference,
      refundAmount,
      input.reason ?? "Customer refund request",
    )

    const refundRows = (await db.unsafe<Array<{ id: string }>>(
      `insert into refunds (reference, vendor_id, amount, status, reason)
       values ($1, $2, $3, 'pending', $4)
       returning id`,
      [transaction.reference, vendor.id, refundAmount, input.reason ?? null],
    )) as Array<{ id: string }>

    return c.json(
      {
        id: refundRows[0]?.id,
        reference: transaction.reference,
        amount: refundAmount,
        status: paystackRefund.status ?? "pending",
      },
      201,
    )
  } catch (err: unknown) {
    return c.json(
      {
        error: {
          code: "paystack_error",
          message: err instanceof Error ? err.message : "Paystack refund request failed",
        },
      },
      502,
    )
  }
})
