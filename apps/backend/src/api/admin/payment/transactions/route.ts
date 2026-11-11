import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GatewayClient } from "../../../../modules/paystack-gateway/gateway-client"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.query as Record<string, string>

  const client = new GatewayClient({
    gatewayUrl: process.env.GATEWAY_URL ?? "",
    gatewayToken: process.env.GATEWAY_TOKEN ?? "",
  })

  const result = await client.listTransactions({
    status: query.status,
    from: query.from,
    to: query.to,
    q: query.q,
    min_amount: query.min_amount ? Number(query.min_amount) : undefined,
    max_amount: query.max_amount ? Number(query.max_amount) : undefined,
    channel: query.channel,
    page: query.page ? Number(query.page) : 1,
    per_page: query.per_page ? Number(query.per_page) : 20,
    sort: query.sort,
  })

  res.json(result)
}
