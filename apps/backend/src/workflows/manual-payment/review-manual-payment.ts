import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"

import { VENDOR_PAYMENT_MODULE } from "../../modules/vendor-payment"

export type ReviewManualPaymentInput = {
  id: string
  status: "reconciled" | "rejected"
  note?: string | null
}

const reviewManualPaymentStep = createStep(
  "review-manual-payment",
  async (input: ReviewManualPaymentInput, { container }) => {
    const vendorPaymentService = container.resolve(VENDOR_PAYMENT_MODULE)
    const previous = await vendorPaymentService
      .retrieveManualPayment(input.id)
      .catch(() => null)

    if (!previous) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Manual payment not found.",
      )
    }

    const updated = await vendorPaymentService.updateManualPayments({
      id: input.id,
      status: input.status,
      reconciled_at: new Date(),
      reconciliation_note: input.note?.trim() || null,
    })

    return new StepResponse(updated, {
      id: previous.id,
      status: previous.status,
      reconciled_at: previous.reconciled_at,
      reconciliation_note: previous.reconciliation_note,
    })
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }

    const vendorPaymentService = container.resolve(VENDOR_PAYMENT_MODULE)
    await vendorPaymentService.updateManualPayments({
      id: previous.id,
      status: previous.status,
      reconciled_at: previous.reconciled_at,
      reconciliation_note: previous.reconciliation_note,
    })
  },
)

export const reviewManualPaymentWorkflow = createWorkflow(
  "review-manual-payment",
  (input: ReviewManualPaymentInput) => {
    const payment = reviewManualPaymentStep(input)
    return new WorkflowResponse(payment)
  },
)
