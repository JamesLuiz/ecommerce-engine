import { createHash, createHmac, randomBytes } from "node:crypto"

export const sha256Hex = (value: string): string =>
  createHash("sha256").update(value).digest("hex")

export const generateToken = (): string =>
  `vgw_${randomBytes(32).toString("base64url")}`

export const vendorSecret = (vendorId: string, webhookSigningRoot: string): string =>
  createHmac("sha256", webhookSigningRoot).update(vendorId).digest("hex")

export const webhookSecretFor = (vendorId: string): string =>
  vendorSecret(vendorId, process.env.WEBHOOK_SIGNING_ROOT ?? "")

export const computeWebhookSignature = (
  secret: string,
  timestamp: string,
  rawBody: string,
): string =>
  createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")
