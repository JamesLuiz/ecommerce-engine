import { Hono } from "hono"
import type { Context } from "hono"
import { createHash, timingSafeEqual } from "node:crypto"
import { db } from "../db.js"
import { webhookForwardQueue } from "../jobs/queue.js"
import { computeWebhookSignature, vendorSecret } from "../services/crypto.js"
import { updateTransaction } from "../services/transactions.js"
import { findVendorById } from "../services/vendors.js"
import type { Transaction } from "../types.js"

type PaystackWebhookPayload = {
  event?: string
  reference?: string
  data?: {
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
  const timestamp = c.req.header("x-gateway-timestamp")
  const signature = c.req.header("x-gateway-signature")

  if (!timestamp || !signature) {
    return c.json(
      { error: { code: "invalid_signature", message: "Missing gateway signature headers." } },
      401,
    )
  }

  const payload = JSON.parse(rawBody) as PaystackWebhookPayload

  const vendorId = await resolveVendorId(
    payload.data?.metadata?.vendor_id ?? "",
    payload.data?.metadata?.vendor ?? "",
    payload.data?.metadata?.external_ref ?? "",
    payload.reference ?? "",
  )

  const secret = vendorSecret(vendorId, process.env.WEBHOOK_SIGNING_ROOT ?? "")
  const expected = computeWebhookSignature(secret, timestamp, rawBody)

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  const valid =
    signatureBuffer.length === expectedBuffer.length &&
    timingSafeEqual(signatureBuffer, expectedBuffer)

  if (!valid) {
    return c.json(
      { error: { code: "invalid_signature", message: "Invalid gateway signature." } },
      401,
    )
  }

  const dedupeKey = createHash("sha256").update(rawBody).digest("hex")
  const existingEvent = await findWebhookEventByDedupeKey(dedupeKey)

  if (existingEvent) {
    return c.json({ status: "ignored" })
  }

  const event = payload.event ?? "charge"
  const transaction = await findTransactionByReferenceScoped(vendorId, payload.reference ?? "")

  const eventRow = await insertWebhookEvent({
    dedupeKey,
    event,
    reference: transaction?.reference ?? payload.reference ?? null,
    vendorId,
    payload,
    rawBody,
  })

  if (transaction) {
    await applyWebhookEventToTransaction(transaction, event, payload)
  }

  const vendor = await findVendorById(vendorId)

  await webhookForwardQueue.add("forward", {
    vendorId,
    webhookUrl: vendor?.webhook_url ?? "",
    rawBody,
    timestamp,
    signature,
  })

  return c.json({ status: "received", event_id: eventRow?.id ?? null })
})

async function applyWebhookEventToTransaction(
  transaction: Transaction,
  event: string,
  payload: unknown,
): Promise<void> {
  const gatewayResponse = { event, payload }

  if (event === "charge.success" && (transaction.status === "pending" || transaction.status === "failed")) {
    await updateTransaction(transaction.reference, {
      status: "success",
      paid_at: new Date(),
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
): Promise<string> {
  if (vendorId) {
    return vendorId
  }

  if (vendorSlug) {
    const rows = (await db.unsafe<Array<{ id: string }>>(
      "select id from vendors where slug = $1 limit 1",
      [vendorSlug],
    )) as Array<{ id: string }>

    const row = rows[0]

    if (row) {
      return row.id
    }
  }

  const lookups: Array<{ sql: string; value: string }> = []

  if (externalRef) {
    lookups.push({ sql: "external_ref = $1", value: externalRef })
  }

  if (reference) {
    lookups.push({ sql: "reference = $1", value: reference })
  }

  for (const lookup of lookups) {
    const rows = (await db.unsafe<Array<{ vendor_id: string }>>(
      `select vendor_id from transactions where ${lookup.sql} limit 1`,
      [lookup.value],
    )) as Array<{ vendor_id: string }>

    const transaction = rows[0]

    if (transaction) {
      return transaction.vendor_id
    }
  }

  throw new Error("vendor_not_found")
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
  vendorId: string
  payload: unknown
  rawBody: string
}) {
  const rows = (await db.unsafe<Array<{ id: string }>>(
    `insert into webhook_events (dedupe_key, event, reference, vendor_id, payload, raw_body, status)
     values ($1, $2, $3, $4, $5::jsonb, $6, 'received')
     returning id`,
    [
      input.dedupeKey,
      input.event,
      input.reference,
      input.vendorId,
      JSON.stringify(input.payload),
      input.rawBody,
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
