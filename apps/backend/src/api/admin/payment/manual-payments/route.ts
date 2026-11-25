import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { VENDOR_PAYMENT_MODULE } from "../../../../modules/vendor-payment"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendorPaymentService = req.scope.resolve(VENDOR_PAYMENT_MODULE)
  const status = typeof req.query.status === "string" ? req.query.status : undefined
  const orderId = typeof req.query.order_id === "string" ? req.query.order_id : undefined
  const filters: Record<string, string> = {}
  if (status) filters.status = status
  if (orderId) filters.order_id = orderId

  const payments = await vendorPaymentService.listManualPayments(
    filters,
    {
      order: { created_at: "DESC" },
      take: 100,
      select: [
        "id",
        "cart_id",
        "order_id",
        "amount",
        "currency_code",
        "customer_email",
        "bank_name",
        "account_name",
        "account_number_last4",
        "receipt_filename",
        "status",
        "reconciliation_note",
        "reconciled_at",
        "created_at",
      ],
    },
  )

  res.json({ payments })
}
