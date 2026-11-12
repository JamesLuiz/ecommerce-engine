import { computeWebhookSignature, webhookSecretFor } from "./crypto.js"

export type WebhookForwardInput = {
  vendorId: string
  webhookUrl: string
  rawBody: string
  timestamp?: string
}

export const forwardVendorWebhook = async (
  input: WebhookForwardInput,
): Promise<{ delivered: boolean; attempts: number }> => {
  const secret = webhookSecretFor(input.vendorId)
  const timestamp = input.timestamp ?? String(Math.floor(Date.now() / 1000))
  const signature = computeWebhookSignature(secret, timestamp, input.rawBody)

  const response = await fetch(input.webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-gateway-timestamp": timestamp,
      "x-gateway-signature": signature,
    },
    body: input.rawBody,
  })

  return { delivered: response.ok, attempts: 1 }
}
