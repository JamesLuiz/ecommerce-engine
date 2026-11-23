import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import type { PaymentStatus } from "@lib/payment-status"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"
import { Container, Heading, Text } from "@modules/common/components/ui"

const CheckoutUnavailable = ({
  title,
  description,
}: {
  title: string
  description: string
}) => (
  <Container
    className="w-full min-w-0 border border-ui-border-base p-6"
    data-testid="checkout-unavailable"
  >
    <Heading level="h2" className="mb-2 text-xl font-semibold">
      {title}
    </Heading>
    <Text className="txt-medium text-ui-fg-subtle">{description}</Text>
  </Container>
)

export default async function CheckoutForm({
  cart,
  customer,
  paymentStatus,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  paymentStatus?: PaymentStatus
}) {
  if (!cart) {
    return null
  }

  const shippingMethods = await listCartShippingMethods(cart.id)
  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")

  if (!shippingMethods || !paymentMethods) {
    return (
      <CheckoutUnavailable
        title="Checkout is temporarily unavailable"
        description="We couldn't load delivery and payment options. Refresh the page, or try again in a few minutes."
      />
    )
  }

  if (shippingMethods.length === 0 || paymentMethods.length === 0) {
    const missing = [
      shippingMethods.length === 0 ? "delivery options" : null,
      paymentMethods.length === 0 ? "payment options" : null,
    ]
      .filter(Boolean)
      .join(" and ")

    return (
      <CheckoutUnavailable
        title="Checkout isn't available for this region yet"
        description={`The selected region is missing ${missing}. Ask the store owner to complete the store setup in the admin, then refresh this page.`}
      />
    )
  }

  return (
    <>
      {paymentStatus?.message && (
        <Container
          className="mb-6 border border-ui-border-base"
          role={paymentStatus.payment === "failed" ? "alert" : "status"}
          data-testid="payment-status-message"
        >
          <Text className="txt-medium text-ui-fg-base">
            {paymentStatus.message}
          </Text>
        </Container>
      )}
      <div className="w-full grid grid-cols-1 gap-y-8">
        <Addresses cart={cart} customer={customer} />

        <Shipping cart={cart} availableShippingMethods={shippingMethods} />

        <Payment cart={cart} availablePaymentMethods={paymentMethods} />

        <Review cart={cart} />
      </div>
    </>
  )
}
