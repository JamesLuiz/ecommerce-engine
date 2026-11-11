import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GatewayClient } from "../../../../modules/paystack-gateway/gateway-client"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as {
    bank_code: string
    account_number: string
  }

  const client = new GatewayClient({
    gatewayUrl: process.env.GATEWAY_URL ?? "",
    gatewayToken: process.env.GATEWAY_TOKEN ?? "",
  })

  const resolved = await client.resolveAccount(body.bank_code, body.account_number)
  res.json(resolved)
}
