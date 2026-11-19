import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"

import {
  getStoredPaymentProviderConfig,
  toPublicPaymentProviderConfig,
  upsertPaymentProviderConfig,
} from "../../../../lib/payment-provider-config"

const ConfigBody = z.object({
  mode: z.enum(["platform", "direct"]),
  enabled: z.boolean().optional(),
  public_key: z.string().trim().optional().nullable(),
  // Write-only: pass a non-empty value to set/update, pass empty string or null to clear,
  // omit to leave unchanged.
  secret_key: z.string().optional().nullable(),
  webhook_secret: z.string().optional().nullable(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const stored = await getStoredPaymentProviderConfig(req.scope)
  res.json(toPublicPaymentProviderConfig(stored))
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const parsed = ConfigBody.safeParse(req.body ?? {})

  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payment config", issues: parsed.error.issues })
    return
  }

  const body = parsed.data

  if (body.mode === "direct") {
    const stored = await getStoredPaymentProviderConfig(req.scope)
    const willHaveSecret = body.secret_key === undefined ? Boolean(stored?.secret_key_enc) : Boolean(body.secret_key)
    const willHavePublic = body.public_key === undefined ? Boolean(stored?.public_key) : Boolean(body.public_key)

    if (!willHavePublic || !willHaveSecret) {
      res.status(400).json({
        message: "Direct mode requires a Paystack public key and secret key.",
      })
      return
    }
  }

  const normalized: any = {
    mode: body.mode,
    enabled: body.enabled,
  }

  if (body.public_key !== undefined) {
    normalized.public_key = body.public_key?.trim() || null
  }
  if (body.secret_key !== undefined) {
    const v = body.secret_key?.trim()
    normalized.secret_key = v ? v : body.secret_key === null || body.secret_key === "" ? null : undefined
  }
  if (body.webhook_secret !== undefined) {
    const v = body.webhook_secret?.trim()
    normalized.webhook_secret = v ? v : body.webhook_secret === null || body.webhook_secret === "" ? null : undefined
  }

  await upsertPaymentProviderConfig(req.scope, normalized)
  const stored = await getStoredPaymentProviderConfig(req.scope)
  res.json(toPublicPaymentProviderConfig(stored))
}
