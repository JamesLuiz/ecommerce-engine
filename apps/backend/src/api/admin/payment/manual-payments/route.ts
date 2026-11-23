import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { VENDOR_PAYMENT_MODULE } from "../../../../modules/vendor-payment"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendorPaymentService = req.scope.resolve(VENDOR_PAYMENT_MODULE)
  const status = typeof req.query.status === "string" ? req.query.status : undefined

  const payments = await vendorPaymentService.listManualPayments(
    status ? { status } : {},
    { order: { created_at: "DESC" }, take: 100 },
  )

  res.json({ payments })
}
