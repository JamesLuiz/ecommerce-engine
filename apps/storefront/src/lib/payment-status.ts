export const PAYMENT_SUCCESS_MESSAGE =
  "Your order has been successfully placed."
export const PAYMENT_FAILED_MESSAGE =
  "We couldn't confirm your payment. Please try again or choose another payment method."
export const MANUAL_PAYMENT_RECEIVED_MESSAGE = "We've received your order."

export type PaymentStatusQuery = {
  payment?: string | string[]
  message?: string | string[]
}

export type PaymentStatus = {
  payment?: string
  message?: string
}

const firstValue = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value

export function readPaymentStatus(query: PaymentStatusQuery): PaymentStatus {
  const payment = firstValue(query.payment)
  const message = firstValue(query.message)?.trim().slice(0, 300)

  return {
    payment,
    message:
      message ||
      (payment === "success"
        ? PAYMENT_SUCCESS_MESSAGE
        : payment === "failed"
          ? PAYMENT_FAILED_MESSAGE
          : undefined),
  }
}
