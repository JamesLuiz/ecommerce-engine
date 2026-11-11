export type ErrorCode =
  | "validation_error"
  | "invalid_signature"
  | "unauthorized"
  | "invalid_token"
  | "vendor_suspended"
  | "not_found"
  | "settlement_not_configured"
  | "settlement_cooldown"
  | "account_resolve_failed"
  | "rate_limited"
  | "paystack_error"
  | "conflict"
  | "internal_error"

export type ApiError = {
  error: {
    code: ErrorCode
    message: string
  }
}

export type VendorStatus = "active" | "suspended"

export type Vendor = {
  id: string
  slug: string
  name: string
  status: VendorStatus
  token_hash: string
  webhook_url: string
  allowed_origins: string[]
  currency: string
  created_at: Date
  updated_at: Date
}

export type SettlementStatus = "active"

export type Settlement = {
  vendor_id: string
  bank_code: string
  bank_name: string
  account_number_last4: string
  account_name: string
  subaccount_code: string
  status: SettlementStatus
  verified_at: Date
  updated_at: Date
}

export type TransactionStatus =
  | "pending"
  | "success"
  | "failed"
  | "abandoned"
  | "refunded"
  | "partially_refunded"

export type Transaction = {
  reference: string
  vendor_id: string
  external_ref: string | null
  amount: number
  currency: string
  status: TransactionStatus
  customer_email: string
  channel: string | null
  fees: number | null
  paid_at: Date | null
  gateway_response: unknown
  paystack_id: number | null
  subaccount_code: string
  metadata: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

export type WebhookEventStatus = "received" | "delivered" | "failed" | "ignored"

export type WebhookEvent = {
  id: string
  dedupe_key: string
  event: string
  reference: string | null
  vendor_id: string | null
  payload: Record<string, unknown>
  status: WebhookEventStatus
  attempts: number
  last_error: string | null
  created_at: Date
  delivered_at: Date | null
}

export type Bank = {
  name: string
  code: string
}

export type CreateVendorInput = {
  slug: string
  name: string
  webhook_url: string
  allowed_origins: string[]
}

export type UpdateVendorInput = {
  name?: string
  webhook_url?: string
  allowed_origins?: string[]
}

export type SettlementInput = {
  bank_code: string
  account_number: string
  actor: string
}

export type TransactionInitializeInput = {
  amount: number
  currency: string
  email: string
  external_ref: string
  callback_url: string
}
