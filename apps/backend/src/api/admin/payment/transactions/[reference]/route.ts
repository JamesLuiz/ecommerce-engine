import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GatewayClient } from "../../../../../modules/paystack-gateway/gateway-client"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const reference = req.params.reference

  const client = new GatewayClient({
    gatewayUrl: process.env.GATEWAY_URL ?? "",
    gatewayToken: process.env.GATEWAY_TOKEN ?? "",
  })

  const transaction = await client.getTransaction(reference)
  res.json(transaction)
}
