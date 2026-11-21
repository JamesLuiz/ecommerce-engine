import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { resolveGatewayClient } from "../../../../lib/payment-provider-config"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const client = await resolveGatewayClient(req.scope)

  const banks = await client.getBanks()
  res.json(banks)
}
