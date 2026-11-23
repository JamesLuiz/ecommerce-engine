import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

import { VENDOR_PAYMENT_MODULE } from "../../../../../../modules/vendor-payment"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendorPaymentService = req.scope.resolve(VENDOR_PAYMENT_MODULE)
  const id = (req.params as { id?: string }).id

  if (!id) {
    res.status(400).json({ error: { code: "missing_id", message: "Missing payment id." } })
    return
  }

  const payment = await vendorPaymentService.retrieveManualPayment(id).catch(() => null)

  if (!payment) {
    res.status(404).json({
      error: { code: "manual_payment_not_found", message: "Manual payment not found." },
    })
    return
  }

  const fileModule = req.scope.resolve(Modules.FILE)
  const file = await fileModule.retrieveFile(payment.receipt_file_id)

  res.redirect(file.url)
}
