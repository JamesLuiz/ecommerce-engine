import { Hono } from "hono"
import type { Context } from "hono"
import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { db } from "../db.js"
import { webhookForwardQueue } from "../jobs/queue.js"
import { computeWebhookSignature, webhookSecretFor } from "../services/crypto.js"
import { updateTransaction } from "../services/transactions.js"
import { findVendorById } from "../services/vendors.js"
import type { Transaction } from "../types.js"

type PaystackWebhookPayload = {
  event?: string
  data?: {
    id?: number
    reference?: string
    amount?: number
    currency?: string
    channel?: string
    fees?: number
    paid_at?: string
    gateway_response?: string
    status?: string
    metadata?: {
      vendor_id?: string
      vendor?: string
      external_ref?: string
    }
  }
}

export const webhooksRouter = new Hono()

webhooksRouter.post("/paystack", async (c: Context) => {
  const rawBody = await c.req.raw.text()
  const paystackSignature = c.req.header("x-paystack-signature")

  if (!paystackSignature) {
    return c.json(
      { error: { code: "invalid_signature", message: "Missing x-paystack-signature header." } },
      401,
    )
  }

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY ?? ""
  const expectedPaystackSignature = createHmac("sha512", paystackSecret)
    .update(rawBody)
    .digest("hex")

  const sigBuffer = Buffer.from(paystackSignature)
  const expBuffer = Buffer.from(expectedPaystackSignature)
  const isSignatureValid =
    sigBuffer.length === expBuffer.length && timingSafeEqual(sigBuffer, expBuffer)

  if (!isSignatureValid) {
    return c.json(
      { error: { code: "invalid_signature", message: "Invalid Paystack signature." } },
      401,
    )
  }

  const dedupeKey = createHash("sha256").update(rawBody).digest("hex")
  const existingEvent = await findWebhookEventByDedupeKey(dedupeKey)

  if (existingEvent) {
    return c.json({ status: "ignored", reason: "duplicate" }, 200)
  }

  let payload: PaystackWebhookPayload
  try {
    payload = JSON.parse(rawBody) as PaystackWebhookPayload
  } catch {
    return c.json({ error: { code: "validation_error", message: "Invalid JSON payload." } }, 400)
  }

  const event = payload.event ?? ""
  const reference = payload.data?.reference ?? ""
  const metadataVendorId = payload.data?.metadata?.vendor_id ?? ""
  const metadataVendorSlug = payload.data?.metadata?.vendor ?? ""
  const metadataExternalRef = payload.data?.metadata?.external_ref ?? ""

  const resolvedVendorId = await resolveVendorId(
    metadataVendorId,
    metadataVendorSlug,
    metadataExternalRef,
    reference,
  )

  if (!resolvedVendorId) {
    await insertWebhookEvent({
      dedupeKey,
      event,
      reference: reference || null,
      vendorId: null,
      payload,
      rawBody,
      status: "ignored",
    })
    return c.json({ status: "ignored", reason: "unknown_vendor" }, 200)
  }

  const transaction = reference
    ? await findTransactionByReferenceScoped(resolvedVendorId, reference)
    : null

  const eventRow = await insertWebhookEvent({
    dedupeKey,
    event,
    reference: transaction?.reference ?? (reference || null),
    vendorId: resolvedVendorId,
    payload,
    rawBody,
    status: "received",
  })

  if (transaction) {
    await applyWebhookEventToTransaction(transaction, event, payload)
  }

  const vendor = await findVendorById(resolvedVendorId)

  if (vendor?.webhook_url) {
    const timestamp = String(Math.floor(Date.now() / 1000))
    const secret = webhookSecretFor(resolvedVendorId)
    const forwardSignature = computeWebhookSignature(secret, timestamp, rawBody)

    await webhookForwardQueue.add("forward", {
      vendorId: resolvedVendorId,
      webhookUrl: vendor.webhook_url,
      rawBody,
      timestamp,
      signature: forwardSignature,
    })
  }

  return c.json({ status: "received", event_id: eventRow?.id ?? null }, 200)
})

async function applyWebhookEventToTransaction(
  transaction: Transaction,
  event: string,
  payload: PaystackWebhookPayload,
): Promise<void> {
  const data = payload.data ?? {}
  const gatewayResponse = { event, payload }

  if (
    event === "charge.success" &&
    (transaction.status === "pending" || transaction.status === "failed")
  ) {
    await updateTransaction(transaction.reference, {
      status: "success",
      paid_at: data.paid_at ? new Date(data.paid_at) : new Date(),
      fees: typeof data.fees === "number" ? data.fees : transaction.fees,
      channel: data.channel ?? transaction.channel,
      paystack_id: typeof data.id === "number" ? data.id : transaction.paystack_id,
      gateway_response: gatewayResponse,
    })
    return
  }

  if (event === "charge.failed" && transaction.status === "pending") {
    await updateTransaction(transaction.reference, {
      status: "failed",
      gateway_response: gatewayResponse,
    })
    return
  }

  if (
    event === "refund.processed" &&
    (transaction.status === "success" || transaction.status === "partially_refunded")
  ) {
    await updateTransaction(transaction.reference, {
      status: "refunded",
      gateway_response: gatewayResponse,
    })
  }
}

async function resolveVendorId(
  vendorId: string,
  vendorSlug: string,
  externalRef: string,
  reference: string,
): Promise<string | null> {
  if (vendorId) {
    const vendor = await findVendorById(vendorId)
    if (vendor) return vendor.id
  }

  if (vendorSlug) {
    const rows = (await db.unsafe<Array<{ id: string }>>(
      "select id from vendors where slug = $1 limit 1",
      [vendorSlug],
    )) as Array<{ id: string }>

    const row = rows[0]
    if (row) return row.id
  }

  if (reference) {
    const rows = (await db.unsafe<Array<{ vendor_id: string }>>(
      "select vendor_id from transactions where reference = $1 limit 1",
      [reference],
    )) as Array<{ vendor_id: string }>

    const row = rows[0]
    if (row) return row.vendor_id
  }

  if (externalRef) {
    const rows = (await db.unsafe<Array<{ vendor_id: string }>>(
      "select vendor_id from transactions where external_ref = $1 limit 1",
      [externalRef],
    )) as Array<{ vendor_id: string }>

    const row = rows[0]
    if (row) return row.vendor_id
  }

  return null
}

async function findWebhookEventByDedupeKey(dedupeKey: string) {
  const rows = (await db.unsafe<Array<{ id: string }>>(
    "select * from webhook_events where dedupe_key = $1 limit 1",
    [dedupeKey],
  )) as Array<{ id: string }>

  const row = rows[0]
  return row ?? null
}

async function insertWebhookEvent(input: {
  dedupeKey: string
  event: string
  reference: string | null
  vendorId: string | null
  payload: unknown
  rawBody: string
  status?: "received" | "ignored" | "delivered" | "failed"
}) {
  const status = input.status ?? "received"
  const rows = (await db.unsafe<Array<{ id: string }>>(
    `insert into webhook_events (dedupe_key, event, reference, vendor_id, payload, raw_body, status)
     values ($1, $2, $3, $4, $5::jsonb, $6, $7)
     returning id`,
    [
      input.dedupeKey,
      input.event,
      input.reference,
      input.vendorId,
      JSON.stringify(input.payload),
      input.rawBody,
      status,
    ],
  )) as Array<{ id: string }>

  const row = rows[0]
  return row ? { id: row.id } : null
}

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
