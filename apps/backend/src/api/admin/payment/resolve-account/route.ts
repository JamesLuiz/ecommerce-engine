import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { resolveGatewayClient } from "../../../../lib/payment-provider-config"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as {
    bank_code: string
    account_number: string
  }

  const client = await resolveGatewayClient(req.scope)

  const resolved = await client.resolveAccount(body.bank_code, body.account_number)
  res.json(resolved)
}
