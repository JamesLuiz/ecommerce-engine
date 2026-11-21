import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { resolveGatewayClient } from "../../../../../lib/payment-provider-config"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const reference = req.params.reference

  const client = await resolveGatewayClient(req.scope)

  const transaction = await client.getTransaction(reference)
  res.json(transaction)
}
