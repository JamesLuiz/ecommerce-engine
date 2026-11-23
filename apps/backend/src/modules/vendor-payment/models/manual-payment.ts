import { model } from "@medusajs/framework/utils"

export const ManualPayment = model.define("manual_payment", {
  id: model.id({ prefix: "mnpay" }).primaryKey(),
  cart_id: model.text().unique(),
  order_id: model.text().nullable(),
  amount: model.number(),
  currency_code: model.text(),
  customer_email: model.text(),
  bank_name: model.text(),
  account_name: model.text(),
  account_number_last4: model.text(),
  // Legacy local-file key. New receipts are stored encrypted in the row so
  // tenants do not depend on writable container storage for reconciliation.
  receipt_file_id: model.text().nullable(),
  receipt_content_enc: model.text().nullable(),
  receipt_filename: model.text(),
  receipt_mime_type: model.text(),
  status: model.enum(["pending_review", "reconciled", "rejected"]).default("pending_review"),
  reconciliation_note: model.text().nullable(),
  reconciled_at: model.dateTime().nullable(),
})

export default ManualPayment
