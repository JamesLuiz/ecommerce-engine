import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

import { reviewManualPaymentWorkflow } from "../../../../../workflows/manual-payment/review-manual-payment"

const ReviewSchema = z.object({
  status: z.enum(["reconciled", "rejected"]),
  note: z.string().max(500).optional().nullable(),
})

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const parsed = ReviewSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: "invalid_review",
        message: "Choose reconciled or rejected, with an optional short note.",
      },
    })
    return
  }

  const id = (req.params as { id?: string }).id

  if (!id) {
    res.status(400).json({ error: { code: "missing_id", message: "Missing payment id." } })
    return
  }

  const { result } = await reviewManualPaymentWorkflow(req.scope).run({
    input: {
      id,
      status: parsed.data.status,
      note: parsed.data.note,
    },
  })

  res.json({ payment: result })
}
