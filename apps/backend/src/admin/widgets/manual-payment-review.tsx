import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/types"
import { Badge, Button, Container, Heading, Text, Textarea, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type ManualPayment = {
  id: string
  order_id: string | null
  amount: number
  currency_code: string
  customer_email: string
  bank_name: string
  account_name: string
  account_number_last4: string
  receipt_filename: string
  status: "pending_review" | "reconciled" | "rejected"
  reconciliation_note: string | null
  reconciled_at: string | null
  created_at: string
}

const formatAmount = (amount: number, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount || 0)

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "-"
  return new Date(value).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

const statusColor = (status: ManualPayment["status"]): "green" | "red" | "orange" => {
  if (status === "reconciled") return "green"
  if (status === "rejected") return "red"
  return "orange"
}

const statusLabel = (status: ManualPayment["status"]) =>
  status.replace("_", " ").replace(/^./, (char) => char.toUpperCase())

const readErrorMessage = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => null)
  return body?.error?.message ?? body?.message ?? fallback
}

/**
 * Admin widget injected into order details. It only renders for orders that
 * have a manual settlement receipt, so staff can verify the order, open the
 * customer's proof of payment, and reconcile or reject it in one place.
 */
const ManualSettlementWidget = ({
  data: order,
}: DetailWidgetProps<HttpTypes.AdminOrder>) => {
  const orderId = order?.id
  const [payment, setPayment] = useState<ManualPayment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [note, setNote] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (!orderId) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/admin/payment/manual-payments?order_id=${encodeURIComponent(orderId)}`,
          { credentials: "same-origin" },
        )

        if (!response.ok) {
          if (!cancelled) setPayment(null)
          return
        }

        const payload = (await response.json()) as { payments?: ManualPayment[] }
        if (!cancelled) setPayment(payload.payments?.[0] ?? null)
      } catch {
        if (!cancelled) setPayment(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [orderId])

  if (!orderId || isLoading || !payment) {
    return null
  }

  const amountMismatch = Math.abs((order.total ?? 0) - payment.amount) > 0.01

  const review = async (status: "reconciled" | "rejected") => {
    setIsUpdating(true)
    try {
      const response = await fetch(
        `/admin/payment/manual-payments/${encodeURIComponent(payment.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ status, note: note.trim() || null }),
        },
      )

      if (!response.ok) {
        toast.error(await readErrorMessage(response, "Failed to update manual payment"))
        return
      }

      const payload = (await response.json()) as { payment: ManualPayment }
      setPayment(payload.payment)
      setNote("")
      toast.success(`Manual payment marked ${status}`)
    } catch {
      toast.error("Failed to update manual payment")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Container className="p-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <Heading level="h2">Manual settlement</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Proof of payment submitted by the customer.
          </Text>
        </div>
        <Badge color={statusColor(payment.status)}>{statusLabel(payment.status)}</Badge>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
        <div>
          <Text size="small" className="text-ui-fg-subtle">Order</Text>
          <Text weight="plus">
            #{order.display_id ?? order.id} · {formatAmount(order.total ?? 0, order.currency_code)}
          </Text>
          <Text size="small" className="text-ui-fg-subtle">
            {order.email || "-"} · placed {formatDate(order.created_at)} · payment status: {order.payment_status}
          </Text>
        </div>

        <div>
          <Text size="small" className="text-ui-fg-subtle">Payment method</Text>
          <Text weight="plus">Manual settlement — direct bank transfer</Text>
          <Text size="small" className="text-ui-fg-subtle">
            {payment.bank_name} · {payment.account_name} · account ending {payment.account_number_last4}
          </Text>
        </div>

        <div>
          <Text size="small" className="text-ui-fg-subtle">Amount paid</Text>
          <Text weight="plus">{formatAmount(payment.amount, payment.currency_code)}</Text>
          {amountMismatch ? (
            <Text size="small" className="text-ui-fg-error">
              The submitted amount does not match the order total. Review the receipt before reconciling.
            </Text>
          ) : null}
        </div>

        <div>
          <Text size="small" className="text-ui-fg-subtle">Receipt</Text>
          <a
            href={`/admin/payment/manual-payments/${encodeURIComponent(payment.id)}/receipt`}
            target="_blank"
            rel="noreferrer"
            className="text-ui-fg-interactive"
          >
            {payment.receipt_filename || "Open receipt"}
          </a>
          <Text size="small" className="text-ui-fg-subtle">
            Submitted {formatDate(payment.created_at)}
          </Text>
        </div>

        {payment.status === "pending_review" ? (
          <div style={{ display: "grid", gap: 8 }}>
            <Text size="small" className="text-ui-fg-subtle">
              Add an optional note for your records, then reconcile or reject the payment.
            </Text>
            <Textarea
              placeholder="e.g. Confirmed transfer reference 12345"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="small" disabled={isUpdating} onClick={() => void review("reconciled")}>
                Reconcile payment
              </Button>
              <Button
                size="small"
                variant="danger"
                disabled={isUpdating}
                onClick={() => void review("rejected")}
              >
                Reject payment
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Text size="small" className="text-ui-fg-subtle">Reviewed</Text>
            <Text>{formatDate(payment.reconciled_at)}</Text>
            {payment.reconciliation_note ? (
              <Text size="small" className="text-ui-fg-subtle">{payment.reconciliation_note}</Text>
            ) : null}
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
  id: "flowcheq:manual-payment-review",
})

export default ManualSettlementWidget
