import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

import { decryptSecret } from "../../../../../../lib/payment-config-crypto"
import { VENDOR_PAYMENT_MODULE } from "../../../../../../modules/vendor-payment"

const CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
])

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

  let content: Buffer

  if (payment.receipt_content_enc) {
    content = Buffer.from(decryptSecret(payment.receipt_content_enc), "base64")
  } else if (payment.receipt_file_id) {
    // Older receipts were written to the File Module before receipt storage was
    // moved into the tenant database. Read the bytes directly so the broken
    // localhost/static URL is never used.
    const fileModule = req.scope.resolve(Modules.FILE)
    content = await fileModule.getAsBuffer(payment.receipt_file_id)
  } else {
    res.status(410).json({
      error: { code: "receipt_unavailable", message: "This receipt is no longer available." },
    })
    return
  }

  const mimeType = CONTENT_TYPES.has(payment.receipt_mime_type)
    ? payment.receipt_mime_type
    : "application/octet-stream"
  const filename =
    payment.receipt_filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "receipt"

  res.setHeader("Content-Type", mimeType)
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`)
  res.setHeader("Cache-Control", "no-store")
  res.send(content)
}
