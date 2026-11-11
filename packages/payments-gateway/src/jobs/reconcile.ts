import { Worker } from "bullmq"
import { db } from "../db.js"
import { redis } from "../redis.js"
import { PaystackClient } from "../services/paystack.js"
import { forwardVendorWebhook } from "../services/webhookForwarder.js"
import { findVendorById } from "../services/vendors.js"
import { updateTransaction } from "../services/transactions.js"

type PendingTransaction = {
  reference: string
  vendor_id: string
  amount: number
  currency: string
  created_at: Date
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

export const reconciliationWorker = new Worker(
  "gateway-reconcile-transactions",
  async () => {
    const pendingTransactions = (await db.unsafe<PendingTransaction[]>(
      `select reference, vendor_id, amount, currency, created_at from transactions
       where status = 'pending'
         and created_at < now() - interval '10 minutes'`,
    )) as PendingTransaction[]

    const client = new PaystackClient(
      process.env.PAYSTACK_SECRET_KEY ?? "",
      process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co",
    )

    for (const transaction of pendingTransactions) {
      const verified = await client.verify(transaction.reference)

      if (verified.status === "success" && verified.amount === transaction.amount) {
        const updated = await updateTransaction(transaction.reference, {
          status: "success",
          amount: transaction.amount,
          currency: transaction.currency,
          paid_at: verified.paid_at ? new Date(verified.paid_at) : new Date(),
          gateway_response: { verify: verified },
        })

        const vendor = await findVendorById(transaction.vendor_id)

        if (updated && vendor) {
          await forwardVendorWebhook({
            vendorId: transaction.vendor_id,
            webhookUrl: vendor.webhook_url,
            rawBody: JSON.stringify({
              event: "charge.success",
              reference: transaction.reference,
              data: { metadata: { vendor_id: transaction.vendor_id, external_ref: null } },
            }),
            timestamp: String(Math.floor(Date.now() / 1000)),
          })
        }

        continue
      }

      if (transaction.created_at.getTime() < Date.now() - TWENTY_FOUR_HOURS_MS) {
        await updateTransaction(transaction.reference, { status: "abandoned" })
      }
    }

    return { reconciled: pendingTransactions.length }
  },
  { connection: redis },
)
