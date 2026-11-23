import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { readPaymentStatus } from "@lib/payment-status"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Checkout",
}

type Props = {
  searchParams: Promise<{
    payment?: string | string[]
    message?: string | string[]
  }>
}

export default async function Checkout({ searchParams }: Props) {
  const paymentStatus = readPaymentStatus(await searchParams)
  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const customer = await retrieveCustomer()

  return (
    <div className="content-container py-8 small:py-12">
      <div className="grid w-full grid-cols-1 items-start gap-8 small:grid-cols-[minmax(0,1fr)_minmax(320px,384px)] medium:gap-12 large:grid-cols-[minmax(0,1fr)_minmax(360px,416px)]">
        <div className="min-w-0">
          <PaymentWrapper cart={cart}>
            <CheckoutForm
              cart={cart}
              customer={customer}
              paymentStatus={paymentStatus}
            />
          </PaymentWrapper>
        </div>
        <aside className="min-w-0" aria-label="Order summary">
          <CheckoutSummary cart={cart} />
        </aside>
      </div>
    </div>
  )
}
