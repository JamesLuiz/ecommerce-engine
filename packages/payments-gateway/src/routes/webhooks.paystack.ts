import { Hono } from "hono"
import type { Context } from "hono"
import { createHash, timingSafeEqual } from "node:crypto"
import { db } from "../db.js"
import { computeWebhookSignature, vendorSecret } from "../services/crypto.js"
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

  const transaction = await findTransactionByReferenceScoped(vendorId, payload.reference ?? "")

  const eventRow = await insertWebhookEvent({
    dedupeKey,
    event: payload.event ?? "charge",
    reference: transaction?.reference ?? payload.reference ?? null,
    vendorId,
    payload,
    rawBody,
  })

  return c.json({ status: "received", event_id: eventRow?.id ?? null })
})

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
    const rows = (await db`
      select id from vendors
      where slug = ${vendorSlug}
      limit 1
    `) as Array<{ id: string }>

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
      `select vendor_id from transactions where ${lookup.sql}`,
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
  const rows = (await db`
    select * from webhook_events
    where dedupe_key = ${dedupeKey}
    limit 1
  `) as Array<{ id: string }>

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
  const rows = (await db`
    insert into webhook_events (dedupe_key, event, reference, vendor_id, payload, raw_body, status)
    values (
      ${input.dedupeKey},
      ${input.event},
      ${input.reference},
      ${input.vendorId},
      ${JSON.stringify(input.payload)}::jsonb,
      ${input.rawBody},
      'received'
    )
    returning id
  `) as Array<{ id: string }>

  const row = rows[0]

  return row ? { id: row.id } : null
}

async function findTransactionByReferenceScoped(
  vendorId: string,
  reference: string,
): Promise<Transaction | null> {
  const rows = (await db`
    select * from transactions
    where vendor_id = ${vendorId}
    and reference = ${reference}
    limit 1
  `) as Transaction[]

  const row = rows[0]

  return row ?? null
}
