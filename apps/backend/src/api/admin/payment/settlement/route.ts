import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GatewayClient } from "../../../../modules/paystack-gateway/gateway-client"
import { VENDOR_PAYMENT_MODULE } from "../../../../modules/vendor-payment"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const client = new GatewayClient({
    gatewayUrl: process.env.GATEWAY_URL ?? "",
    gatewayToken: process.env.GATEWAY_TOKEN ?? "",
  })

  try {
    const gatewaySettlement = await client.getSettlement()
    res.json(gatewaySettlement)
  } catch (err: any) {
    const vendorPaymentService = req.scope.resolve(VENDOR_PAYMENT_MODULE)
    const local = await vendorPaymentService.listSettlementAccounts({}, { take: 1 }).catch(() => [])

    if (local && local.length > 0) {
      res.json(local[0])
      return
    }

    res.status(err.status ?? 404).json({
      error: {
        code: "settlement_not_configured",
        message: err.message ?? "Vendor has no settlement account.",
      },
    })
  }
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as {
    bank_code: string
    account_number: string
  }

  const actor =
    (req as any).auth_context?.actor_id ??
    (req as any).user?.email ??
    "admin"

  const client = new GatewayClient({
    gatewayUrl: process.env.GATEWAY_URL ?? "",
    gatewayToken: process.env.GATEWAY_TOKEN ?? "",
  })

  const saved = await client.updateSettlement(body.bank_code, body.account_number, actor)

  try {
    const vendorPaymentService = req.scope.resolve(VENDOR_PAYMENT_MODULE)
    const existing = await vendorPaymentService.listSettlementAccounts({}, { take: 1 })

    if (existing.length > 0) {
      await vendorPaymentService.updateSettlementAccounts({
        id: existing[0].id,
        bank_code: saved.bank_code,
        bank_name: saved.bank_name,
        account_number_last4: saved.account_number_last4,
        account_name: saved.account_name,
        status: saved.status,
        verified_at: new Date(saved.verified_at),
      })
    } else {
      await vendorPaymentService.createSettlementAccounts({
        bank_code: saved.bank_code,
        bank_name: saved.bank_name,
        account_number_last4: saved.account_number_last4,
        account_name: saved.account_name,
        status: saved.status,
        verified_at: new Date(saved.verified_at),
      })
    }
  } catch (err) {
    console.warn("Failed to update local settlement display cache:", err)
  }

  res.json(saved)
}
