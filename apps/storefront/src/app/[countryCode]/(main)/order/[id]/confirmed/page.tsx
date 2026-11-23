import { retrieveOrder } from "@lib/data/orders"
import { readPaymentStatus } from "@lib/payment-status"
import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    payment?: string | string[]
    message?: string | string[]
  }>
}
export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "You purchase was successful",
}

export default async function OrderConfirmedPage(props: Props) {
  const params = await props.params
  const paymentStatus = readPaymentStatus(await props.searchParams)
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    return notFound()
  }

  return (
    <OrderCompletedTemplate order={order} statusMessage={paymentStatus.message} />
  )
}
