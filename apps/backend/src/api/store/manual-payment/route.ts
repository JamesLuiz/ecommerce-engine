import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  ALLOWED_RECEIPT_MIME_TYPES,
  MAX_MANUAL_RECEIPT_SIZE,
  submitManualPaymentWorkflow,
} from "../../../workflows/manual-payment/submit-manual-payment"

type UploadedReceipt = {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

export const MANUAL_PAYMENT_RECEIVED_MESSAGE = "We've received your order."

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const receipt = (req as MedusaRequest & { file?: UploadedReceipt }).file

  if (!receipt) {
    res.status(400).json({
      error: {
        code: "receipt_required",
        message: "Upload a payment receipt to continue.",
      },
    })
    return
  }

  if (!ALLOWED_RECEIPT_MIME_TYPES.has(receipt.mimetype)) {
    res.status(415).json({
      error: {
        code: "receipt_type_invalid",
        message: "Receipt must be a PDF, JPG, PNG, or WEBP file.",
      },
    })
    return
  }

  if (receipt.size > MAX_MANUAL_RECEIPT_SIZE) {
    res.status(413).json({
      error: {
        code: "receipt_too_large",
        message: "Receipt must be 5 MB or smaller.",
      },
    })
    return
  }

  const { cart_id } = req.validatedBody as { cart_id: string }

  const { result } = await submitManualPaymentWorkflow(req.scope).run({
    input: {
      cart_id,
      receipt: {
        filename: receipt.originalname,
        mimeType: receipt.mimetype,
        content: receipt.buffer.toString("base64"),
        size: receipt.size,
      },
    },
  })

  res.status(201).json({
    order_id: result.order_id,
    status: result.status,
    message: MANUAL_PAYMENT_RECEIVED_MESSAGE,
  })
}
