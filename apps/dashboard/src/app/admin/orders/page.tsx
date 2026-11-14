import { desc, eq } from "drizzle-orm"

import { customers, orders, plans } from "@flowcheq/db"
import { db } from "@lib/db"
import { StatusBadge } from "../status-badge"
import { NewOrderForm } from "./new-order-form"
import { OrderActions } from "./order-actions"

export const dynamic = "force-dynamic"

const CURRENCY_SYMBOL: Record<string, string> = { NGN: "\u20a6", USD: "$", EUR: "\u20ac" }

function formatAmount(amountMinor: number, currency: string) {
  const symbol = CURRENCY_SYMBOL[currency] ?? `${currency} `

  return `${symbol}${(amountMinor / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

interface SignupPayloadShape {
  slug?: string
  businessName?: string
}

export default async function OrdersPage() {
  const orderRows = await db
    .select({
      id: orders.id,
      customer_email: customers.email,
      customer_name: customers.name,
      plan_id: orders.plan_id,
      provider: orders.provider,
      provider_reference: orders.provider_reference,
      amount_minor: orders.amount_minor,
      currency: orders.currency,
      status: orders.status,
      signup_payload: orders.signup_payload,
      created_at: orders.created_at,
      paid_at: orders.paid_at,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customer_id, customers.id))
    .orderBy(desc(orders.created_at))
    .limit(500)

  const customerRows = await db
    .select({ id: customers.id, email: customers.email, name: customers.name })
    .from(customers)
    .orderBy(customers.email)
    .limit(500)

  const planRows = await db.select().from(plans).orderBy(plans.id)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="mt-1 text-sm text-gray-600">
          Plan payments for customer stores. Marking an order paid creates the tenant from its signup
          payload and queues provisioning.
        </p>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Create order</h2>
        <p className="mt-1 mb-4 text-xs text-gray-500">
          Created as pending until the payment webhook (or the mark paid action) confirms the
          payment. Choosing paid deploys the store immediately.
        </p>
        <NewOrderForm
          customers={customerRows}
          plans={planRows.map((plan) => ({
            id: plan.id,
            name: plan.name,
            price_minor: plan.price_minor,
            currency: plan.currency,
          }))}
        />
      </section>

      {orderRows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No orders yet. Create one above after a customer has been added.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Paid / action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orderRows.map((order) => {
                const signup = (order.signup_payload ?? {}) as SignupPayloadShape

                return (
                  <tr key={order.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      {order.created_at.toISOString().slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{order.customer_name ?? order.customer_email}</div>
                      <div className="text-xs text-gray-500">{order.customer_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{signup.businessName ?? "-"}</div>
                      <div className="font-mono text-xs text-gray-500">{signup.slug ?? "-"}</div>
                    </td>
                    <td className="px-4 py-3">{order.plan_id}</td>
                    <td className="px-4 py-3 font-mono text-xs">{order.provider_reference}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatAmount(order.amount_minor, order.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      {order.status === "paid" ? (
                        <span className="text-xs text-gray-500">
                          {order.paid_at
                            ? order.paid_at.toISOString().slice(0, 16).replace("T", " ")
                            : "-"}
                        </span>
                      ) : (
                        <OrderActions orderId={order.id} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
