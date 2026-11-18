import Link from "next/link"

import { markOrderPaid } from "@lib/orders"
import { db } from "@lib/db"
import { orders } from "@flowcheq/db"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export default async function CheckoutCompletePage(props: {
  searchParams: Promise<{ reference?: string; trxref?: string }>
}) {
  const params = await props.searchParams
  const reference = params.reference || params.trxref

  let status: "success" | "pending" | "failed" | "missing" = "missing"

  if (reference) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY
    const rows = await db
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(eq(orders.provider_reference, reference))
      .limit(1)
    const order = rows[0]

    if (!order) {
      status = "missing"
    } else if (order.status === "paid") {
      status = "success"
    } else if (secretKey) {
      try {
        const verifyRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          {
            headers: { Authorization: `Bearer ${secretKey}` },
            cache: "no-store",
          }
        )
        const verifyData = (await verifyRes.json().catch(() => ({}))) as {
          status?: boolean
          data?: { status?: string }
        }

        if (verifyRes.ok && verifyData.status && verifyData.data?.status === "success") {
          await markOrderPaid(order.id, { actor: "checkout-callback" })
          status = "success"
        } else if (verifyData.data?.status === "failed" || verifyData.data?.status === "abandoned") {
          status = "failed"
        } else {
          status = "pending"
        }
      } catch {
        status = "pending"
      }
    } else {
      status = "pending"
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f3ef] px-6 py-16 text-neutral-900">
      <div className="w-full max-w-lg rounded-[28px] border border-black/5 bg-white p-8 shadow-[0_30px_80px_rgba(17,17,17,0.08)]">
        {status === "success" ? (
          <>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
              Payment received
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
              Your order is confirmed.
            </h1>
            <p className="mt-4 text-base leading-7 text-neutral-600">
              We&apos;ve received your payment and logged your order. Our team will set up your
              online store and reach out with the next steps.
            </p>
          </>
        ) : status === "failed" ? (
          <>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
              Payment not completed
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
              Your payment didn&apos;t go through.
            </h1>
            <p className="mt-4 text-base leading-7 text-neutral-600">
              No successful payment was confirmed for this order. You can try again from the sales
              page.
            </p>
          </>
        ) : status === "pending" ? (
          <>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
              Payment processing
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
              We&apos;re confirming your payment.
            </h1>
            <p className="mt-4 text-base leading-7 text-neutral-600">
              Your payment is being processed. If you completed payment, your order will be marked
              paid shortly once confirmation arrives.
            </p>
          </>
        ) : (
          <>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
              Order not found
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
              We couldn&apos;t find that order.
            </h1>
            <p className="mt-4 text-base leading-7 text-neutral-600">
              The payment reference is missing or unknown. Please return to the sales page and try
              again.
            </p>
          </>
        )}

        {reference ? (
          <p className="mt-6 rounded-xl bg-[#f5f3ef] px-4 py-3 font-mono text-xs text-neutral-600">
            Reference: {reference}
          </p>
        ) : null}

        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-[var(--brand-primary)] px-6 py-3 text-sm font-medium text-white"
        >
          Back to home
        </Link>
      </div>
    </main>
  )
}
