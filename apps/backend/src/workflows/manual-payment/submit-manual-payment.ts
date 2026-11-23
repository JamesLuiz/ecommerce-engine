import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"

import {
  getStoredManualSettlementAccount,
  MANUAL_PAYMENT_PROVIDER_ID,
  toPublicManualAccount,
} from "../../lib/manual-settlement"
import { VENDOR_PAYMENT_MODULE } from "../../modules/vendor-payment"

export const MAX_MANUAL_RECEIPT_SIZE = 5 * 1024 * 1024

export const ALLOWED_RECEIPT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
])

export type ManualReceiptInput = {
  filename: string
  mimeType: string
  content: string
  size: number
}

export type SubmitManualPaymentInput = {
  cart_id: string
  receipt: ManualReceiptInput
}

type ManualCartSnapshot = {
  id: string
  email?: string | null
  total?: number | string | null
  currency_code?: string | null
  payment_collection?: {
    payment_sessions?: Array<{
      id: string
      provider_id: string
      status: string
    }> | null
  } | null
}

type ManualCartValidation = {
  cart: ManualCartSnapshot
  existingPayment: {
    id: string
    order_id: string | null
    status: string
  } | null
}

const validateManualCartStep = createStep(
  "validate-manual-cart",
  async (input: { cart_id: string }, { container }): Promise<StepResponse<ManualCartValidation>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "email",
        "total",
        "currency_code",
        "payment_collection.id",
        "payment_collection.payment_sessions.id",
        "payment_collection.payment_sessions.provider_id",
        "payment_collection.payment_sessions.status",
      ],
      filters: { id: input.cart_id },
    })

    const cart = data?.[0] as ManualCartSnapshot | undefined

    if (!cart) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Cart not found.")
    }

    const session = cart.payment_collection?.payment_sessions?.find(
      (paymentSession) =>
        paymentSession.provider_id === MANUAL_PAYMENT_PROVIDER_ID &&
        paymentSession.status === "pending",
    )

    if (!session) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Select manual payment before submitting a receipt.",
      )
    }

    const vendorPaymentService = container.resolve(VENDOR_PAYMENT_MODULE)
    const [existing] = await vendorPaymentService.listManualPayments(
      { cart_id: input.cart_id },
      { take: 1 },
    )

    return new StepResponse({
      cart,
      existingPayment: existing
        ? {
            id: existing.id,
            order_id: existing.order_id ?? null,
            status: existing.status,
          }
        : null,
    })
  },
)

const loadManualAccountStep = createStep(
  "load-manual-account",
  async (_input: Record<string, never>, { container }) => {
    const account = await getStoredManualSettlementAccount(container, true)

    if (!account) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Manual settlement is not configured for this store.",
      )
    }

    return new StepResponse(toPublicManualAccount(account))
  },
)

const uploadManualReceiptStep = createStep(
  "upload-manual-receipt",
  async (input: { receipt: ManualReceiptInput }, { container }) => {
    const { receipt } = input

    if (!ALLOWED_RECEIPT_MIME_TYPES.has(receipt.mimeType)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Receipt must be a PDF, JPG, PNG, or WEBP file.",
      )
    }

    if (receipt.size > MAX_MANUAL_RECEIPT_SIZE) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Receipt must be 5 MB or smaller.",
      )
    }

    const fileModule = container.resolve(Modules.FILE)
    const uploaded = await fileModule.createFiles({
      filename: receipt.filename,
      mimeType: receipt.mimeType,
      content: receipt.content,
      access: "private",
    })

    return new StepResponse(
      {
        fileId: uploaded.id,
        filename: receipt.filename,
        mimeType: receipt.mimeType,
      },
      uploaded.id,
    )
  },
  async (fileId, { container }) => {
    if (!fileId) {
      return
    }

    const fileModule = container.resolve(Modules.FILE)
    await fileModule.deleteFiles(fileId)
  },
)

type CreateManualPaymentInput = {
  cart: ManualCartSnapshot
  account: {
    bank_name: string
    account_name: string
    account_number_last4: string
  }
  uploaded: {
    fileId: string
    filename: string
    mimeType: string
  }
  order_id: string
}

const createManualPaymentStep = createStep(
  "create-manual-payment",
  async (input: CreateManualPaymentInput, { container }) => {
    const vendorPaymentService = container.resolve(VENDOR_PAYMENT_MODULE)
    const created = await vendorPaymentService.createManualPayments({
      cart_id: input.cart.id,
      order_id: input.order_id,
      amount: Number(input.cart.total ?? 0),
      currency_code: input.cart.currency_code ?? "NGN",
      customer_email: input.cart.email ?? "",
      bank_name: input.account.bank_name,
      account_name: input.account.account_name,
      account_number_last4: input.account.account_number_last4,
      receipt_file_id: input.uploaded.fileId,
      receipt_filename: input.uploaded.filename,
      receipt_mime_type: input.uploaded.mimeType,
      status: "pending_review",
    })

    return new StepResponse(
      {
        id: created.id,
        order_id: created.order_id,
        status: created.status,
      },
      created.id,
    )
  },
  async (paymentId, { container }) => {
    if (!paymentId) {
      return
    }

    const vendorPaymentService = container.resolve(VENDOR_PAYMENT_MODULE)
    await vendorPaymentService.deleteManualPayments(paymentId)
  },
)

export const submitManualPaymentWorkflow = createWorkflow(
  "submit-manual-payment",
  (input: SubmitManualPaymentInput) => {
    const validation = validateManualCartStep({ cart_id: input.cart_id })
    const account = loadManualAccountStep({})
    const cart = transform({ validation }, ({ validation }) => validation.cart)
    const cartId = transform({ cart }, ({ cart }) => cart.id)
    const existingPayment = transform(
      { validation },
      ({ validation }) => validation.existingPayment,
    )

    const createdPayment = when(
      "submit-new-manual-receipt",
      { existingPayment },
      ({ existingPayment }) => !existingPayment,
    ).then(() => {
      const uploaded = uploadManualReceiptStep({ receipt: input.receipt })
      const order = completeCartWorkflow.runAsStep({ input: { id: cartId } })
      const orderId = transform({ order }, ({ order }) => order.id)
      const paymentInput = transform(
        { cart, account, uploaded, orderId },
        ({ cart, account, uploaded, orderId }) => ({
          cart,
          account,
          uploaded,
          order_id: orderId,
        }),
      )

      return createManualPaymentStep(paymentInput)
    })

    return new WorkflowResponse(
      transform(
        { existingPayment, createdPayment },
        ({ existingPayment, createdPayment }) => {
          const payment = existingPayment ?? createdPayment

          return {
            id: payment?.id ?? null,
            order_id: payment?.order_id ?? null,
            status: payment?.status ?? "pending_review",
          }
        },
      ),
    )
  },
)
