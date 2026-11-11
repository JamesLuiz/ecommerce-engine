import { Hono } from "hono"
import type { Context } from "hono"
import { db } from "../db.js"
import { PaystackClient } from "../services/paystack.js"
import { findSettlementByVendorId } from "../services/settlement.js"
import {
  createTransaction,
  listTransactions,
  updateTransaction,
} from "../services/transactions.js"
import { vendorAuth } from "../middleware/vendorAuth.js"
import { rateLimit } from "../middleware/rateLimit.js"
import type { Transaction } from "../types.js"
import type { VendorEnv } from "../env.js"

export const transactionsRouter = new Hono<VendorEnv>()

transactionsRouter.use("*", vendorAuth)

transactionsRouter.post("/transactions/initialize", async (c: Context<VendorEnv>) => {
  const vendor = c.get("vendor")

  const input = (await c.req.json().catch(() => null)) as
    | {
        amount: number
        currency: string
        email: string
        external_ref: string
        callback_url: string
        subaccount?: string
      }
    | null

  if (
    !input?.amount ||
    !input?.currency ||
    !input?.email ||
    !input?.external_ref ||
    !input?.callback_url
  ) {
    return c.json(
      { error: { code: "validation_error", message: "Invalid transaction payload." } },
      400,
    )
  }

  const settlement = await findSettlementByVendorId(vendor.id)

  if (!settlement) {
    return c.json(
      { error: { code: "settlement_not_configured", message: "Vendor has no settlement account." } },
      409,
    )
  }

  let callbackOrigin: string
  try {
    callbackOrigin = new URL(input.callback_url).origin
  } catch {
    return c.json(
      { error: { code: "validation_error", message: "Invalid callback_url format." } },
      400,
    )
  }

  if (!vendor.allowed_origins.includes(callbackOrigin)) {
    return c.json(
      { error: { code: "invalid_callback_origin", message: "callback_url origin is not allowed." } },
      400,
    )
  }

  const reference = `${vendor.slug}_${Math.random().toString(16).slice(2, 10)}`

  await createTransaction({
    reference,
    vendor_id: vendor.id,
    external_ref: input.external_ref,
    amount: input.amount,
    currency: input.currency,
    status: "pending",
    customer_email: input.email,
    channel: null,
    subaccount_code: settlement.subaccount_code,
    metadata: {
      vendor: vendor.slug,
      vendor_id: vendor.id,
      external_ref: input.external_ref,
      callback_url: input.callback_url,
    },
  })

  const client = new PaystackClient(
    process.env.PAYSTACK_SECRET_KEY ?? "",
    process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co",
  )

  const initialized = await client.initialize({
    email: input.email,
    amount: input.amount,
    currency: input.currency,
    reference,
    callback_url: input.callback_url,
    subaccount: settlement.subaccount_code,
  })

  await updateTransaction(reference, {
    status: "pending",
    amount: input.amount,
    currency: input.currency,
    gateway_response: {
      authorization_url: initialized.authorization_url,
      access_code: initialized.access_code,
    },
  })

  return c.json({
    reference,
    authorization_url: initialized.authorization_url,
    access_code: initialized.access_code,
  }, 201)
})

transactionsRouter.get("/transactions/verify/:reference", async (c: Context<VendorEnv>) => {
  const vendor = c.get("vendor")
  const reference = c.req.param("reference") ?? ""

  const transaction = await findTransactionByReferenceScoped(vendor.id, reference)

  if (!transaction) {
    return c.json({ error: { code: "not_found", message: "Transaction not found." } }, 404)
  }

  const client = new PaystackClient(
    process.env.PAYSTACK_SECRET_KEY ?? "",
    process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co",
  )

  const verified = await client.verify(reference)

  const isMatch =
    verified.status === "success" &&
    verified.amount === transaction.amount &&
    verified.currency.toUpperCase() === transaction.currency.toUpperCase()

  const finalStatus = isMatch ? "success" : "failed"

  await updateTransaction(reference, {
    status: finalStatus,
    amount: verified.amount,
    currency: verified.currency,
    paid_at: verified.paid_at ? new Date(verified.paid_at) : null,
    channel: verified.channel ?? transaction.channel,
    gateway_response: { verify: verified, match: isMatch },
  })

  return c.json({
    reference,
    status: finalStatus,
    amount: verified.amount,
    currency: verified.currency,
    paid_at: verified.paid_at,
    channel: verified.channel,
  })
})

transactionsRouter.get("/transactions", rateLimit, async (c: Context<VendorEnv>) => {
  const vendor = c.get("vendor")
  const query = c.req.query()

  const result = await listTransactions(vendor.id, {
    status: query.status,
    from: query.from,
    to: query.to,
    q: query.q,
    min_amount: query.min_amount ? Number(query.min_amount) : undefined,
    max_amount: query.max_amount ? Number(query.max_amount) : undefined,
    channel: query.channel,
    page: query.page ? Number(query.page) : 1,
    per_page: query.per_page ? Number(query.per_page) : 20,
    sort: query.sort,
  })

  return c.json(result)
})

transactionsRouter.get("/transactions/:reference", async (c: Context<VendorEnv>) => {
  const vendor = c.get("vendor")
  const reference = c.req.param("reference") ?? ""

  const transaction = await findTransactionByReferenceScoped(vendor.id, reference)

  if (!transaction) {
    return c.json({ error: { code: "not_found", message: "Transaction not found." } }, 404)
  }

  const refundRows = (await db.unsafe<Array<{
    id: string
    amount: number
    status: string
    reason: string | null
    created_at: Date
  }>>(
    "select id, amount, status, reason, created_at from refunds where reference = $1 and vendor_id = $2 order by created_at desc",
    [reference, vendor.id],
  )) as Array<{
    id: string
    amount: number
    status: string
    reason: string | null
    created_at: Date
  }>

  const fees = transaction.fees ?? 0
  const net = transaction.amount - fees

  return c.json({
    ...transaction,
    fees: transaction.fees,
    net,
    refunds: refundRows,
  })
})

async function findTransactionByReferenceScoped(
  vendorId: string,
  reference: string,
): Promise<Transaction | null> {
  const rows = (await db.unsafe<Transaction[]>(
    "select * from transactions where vendor_id = $1 and reference = $2 limit 1",
    [vendorId, reference],
  )) as Transaction[]

  const row = rows[0]

  return row ?? null
}
