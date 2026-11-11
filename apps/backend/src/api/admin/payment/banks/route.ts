import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GatewayClient } from "../../../../modules/paystack-gateway/gateway-client"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const client = new GatewayClient({
    gatewayUrl: process.env.GATEWAY_URL ?? "",
    gatewayToken: process.env.GATEWAY_TOKEN ?? "",
  })

  const banks = await client.getBanks()
  res.json(banks)
}
