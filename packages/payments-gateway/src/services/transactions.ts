import { db } from "../db.js"
import type { Transaction, TransactionStatus } from "../types.js"

type TransactionRow = {
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

const toTransaction = (row: TransactionRow): Transaction => ({
  reference: row.reference,
  vendor_id: row.vendor_id,
  external_ref: row.external_ref,
  amount: row.amount,
  currency: row.currency,
  status: row.status,
  customer_email: row.customer_email,
  channel: row.channel,
  fees: row.fees,
  paid_at: row.paid_at,
  gateway_response: row.gateway_response,
  paystack_id: row.paystack_id,
  subaccount_code: row.subaccount_code,
  metadata: row.metadata ?? {},
  created_at: row.created_at,
  updated_at: row.updated_at,
})

export const createTransaction = async (input: {
  reference: string
  vendor_id: string
  external_ref: string | null
  amount: number
  currency: string
  status: TransactionStatus
  customer_email: string
  channel: string | null
  subaccount_code: string
  metadata: Record<string, unknown>
}): Promise<Transaction> => {
  const rows = (await db.unsafe<TransactionRow[]>(
    `insert into transactions (
       reference, vendor_id, external_ref, amount, currency, status, customer_email, channel, subaccount_code, metadata
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     returning *`,
    [
      input.reference,
      input.vendor_id,
      input.external_ref,
      input.amount,
      input.currency,
      input.status,
      input.customer_email,
      input.channel,
      input.subaccount_code,
      JSON.stringify(input.metadata),
    ],
  )) as TransactionRow[]

  const row = rows[0]

  if (!row) {
    throw new Error("Failed to create the transaction")
  }

  return toTransaction(row)
}

export const findTransactionByReference = async (
  reference: string,
): Promise<Transaction | null> => {
  const rows = (await db.unsafe<TransactionRow[]>(
    "select * from transactions where reference = $1 limit 1",
    [reference],
  )) as TransactionRow[]

  const row = rows[0]

  if (!row) {
    return null
  }

  return toTransaction(row)
}

export const updateTransaction = async (
  reference: string,
  patch: Partial<TransactionRow>,
): Promise<Transaction | null> => {
  const columns = [
    "status",
    "amount",
    "currency",
    "fees",
    "paid_at",
    "channel",
    "gateway_response",
    "paystack_id",
  ] as const

  const sets: string[] = ["updated_at = now()"]
  const params: Array<string | number | Date | null> = [reference]
  let index = 2

  for (const column of columns) {
    const value = patch[column]

    if (value === undefined) {
      continue
    }

    if (column === "gateway_response") {
      sets.push(`${column} = $${index}`)
      params.push(value ? JSON.stringify(value) : null)
    } else {
      sets.push(`${column} = $${index}`)
      params.push(value as string | number | Date | null)
    }

    index += 1
  }

  const rows = (await db.unsafe<TransactionRow[]>(
    `update transactions set ${sets.join(", ")} where reference = $1 returning *`,
    params,
  )) as TransactionRow[]

  const row = rows[0]

  if (!row) {
    return null
  }

  return toTransaction(row)
}

export type TransactionFilters = {
  status?: string
  from?: string
  to?: string
  q?: string
  min_amount?: number
  max_amount?: number
  channel?: string
  page?: number
  per_page?: number
  sort?: string
}

export type TransactionListResult = {
  data: Transaction[]
  page: number
  per_page: number
  total: number
  summary: {
    total_count: number
    total_amount_success: number
    total_fees: number
  }
}

export const listTransactions = async (
  vendorId: string,
  filters: TransactionFilters,
): Promise<TransactionListResult> => {
  const page = filters.page ?? 1
  const perPage = Math.min(filters.per_page ?? 20, 100)
  const statusValues =
    filters.status?.split(",").map((value) => value.trim()).filter(Boolean) ?? []

  const conditions: string[] = ["vendor_id = $1"]
  const params: Array<string | number | string[]> = [vendorId]
  let index = 2

  if (statusValues.length > 0) {
    conditions.push(`status = any($${index})`)
    params.push(statusValues)
    index += 1
  }

  if (filters.from) {
    conditions.push(`created_at >= $${index}`)
    params.push(filters.from)
    index += 1
  }

  if (filters.to) {
    conditions.push(`created_at <= $${index}`)
    params.push(filters.to)
    index += 1
  }

  if (filters.channel) {
    conditions.push(`channel = $${index}`)
    params.push(filters.channel)
    index += 1
  }

  if (filters.min_amount !== undefined) {
    conditions.push(`amount >= $${index}`)
    params.push(filters.min_amount)
    index += 1
  }

  if (filters.max_amount !== undefined) {
    conditions.push(`amount <= $${index}`)
    params.push(filters.max_amount)
    index += 1
  }

  if (filters.q) {
    conditions.push(`customer_email ilike $${index}`)
    params.push(`%${filters.q}%`)
    index += 1
  }

  const whereSql = conditions.join(" and ")

  const countRows = (await db.unsafe<Array<{ total: number }>>(
    `select count(*)::int as total from transactions where ${whereSql}`,
    params,
  )) as Array<{ total: number }>

  const data = (await db.unsafe<TransactionRow[]>(
    `select * from transactions where ${whereSql} order by created_at desc, reference asc limit $${index} offset $${index + 1}`,
    [...params, perPage, (page - 1) * perPage],
  )) as TransactionRow[]

  const successful = (await db.unsafe<Array<{ amount: number; fees: number; count: number }>>(
    `select coalesce(sum(amount), 0) as amount, coalesce(sum(fees), 0) as fees, count(*)::int as count from transactions where status = 'success' and ${whereSql}`,
    params,
  )) as Array<{ amount: number; fees: number; count: number }>

  return {
    data: data.map(toTransaction),
    page,
    per_page: perPage,
    total: Number(countRows[0]?.total ?? 0),
    summary: {
      total_count: Number(successful[0]?.count ?? 0),
      total_amount_success: Number(successful[0]?.amount ?? 0),
      total_fees: Number(successful[0]?.fees ?? 0),
    },
  }
}
