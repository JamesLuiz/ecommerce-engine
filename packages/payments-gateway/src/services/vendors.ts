import { db } from "../db.js"
import { sha256Hex, generateToken, webhookSecretFor } from "./crypto.js"
import type { CreateVendorInput, UpdateVendorInput, Vendor } from "../types.js"

type VendorRow = {
  id: string
  slug: string
  name: string
  status: "active" | "suspended"
  token_hash: string
  webhook_url: string
  allowed_origins: string[] | null
  currency: string
  created_at: Date
  updated_at: Date
}

const toVendor = (row: VendorRow): Vendor => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  status: row.status,
  token_hash: row.token_hash,
  webhook_url: row.webhook_url,
  allowed_origins: row.allowed_origins ?? [],
  currency: row.currency,
  created_at: row.created_at,
  updated_at: row.updated_at,
})

export const findVendorByToken = async (token: string): Promise<Vendor | null> => {
  const rows = (await db.unsafe<VendorRow[]>(
    "select * from vendors where token_hash = $1 limit 1",
    [sha256Hex(token)],
  )) as VendorRow[]

  const row = rows[0]

  if (!row) {
    return null
  }

  return toVendor(row)
}

export const findVendorById = async (id: string): Promise<Vendor | null> => {
  const rows = (await db.unsafe<VendorRow[]>(
    "select * from vendors where id = $1 limit 1",
    [id],
  )) as VendorRow[]

  const row = rows[0]

  if (!row) {
    return null
  }

  return toVendor(row)
}

export const createVendor = async (
  input: CreateVendorInput,
): Promise<{
  vendor: Vendor
  token: string
  webhookSigningSecret: string
}> => {
  const token = generateToken()
  const tokenHash = sha256Hex(token)

  const rows = (await db.unsafe<VendorRow[]>(
    `insert into vendors (slug, name, token_hash, webhook_url, allowed_origins, currency)
     values ($1, $2, $3, $4, $5, 'NGN')
     returning *`,
    [input.slug, input.name, tokenHash, input.webhook_url, input.allowed_origins],
  )) as VendorRow[]

  const row = rows[0]

  if (!row) {
    throw new Error("Failed to create the vendor")
  }

  const vendor = toVendor(row)

  return { vendor, token, webhookSigningSecret: webhookSecretFor(vendor.id) }
}

export const rotateVendorToken = async (id: string): Promise<string> => {
  const token = generateToken()
  const tokenHash = sha256Hex(token)

  await db.unsafe(
    "update vendors set token_hash = $2, updated_at = now() where id = $1",
    [id, tokenHash],
  )

  return token
}

export const setVendorStatus = async (
  id: string,
  status: "active" | "suspended",
): Promise<void> => {
  await db.unsafe(
    "update vendors set status = $2, updated_at = now() where id = $1",
    [id, status],
  )
}

export const updateVendor = async (
  id: string,
  input: UpdateVendorInput,
): Promise<Vendor | null> => {
  const current = await findVendorById(id)

  if (!current) {
    return null
  }

  const rows = (await db.unsafe<VendorRow[]>(
    `update vendors
     set name = $2, webhook_url = $3, allowed_origins = $4, updated_at = now()
     where id = $1
     returning *`,
    [
      id,
      input.name ?? current.name,
      input.webhook_url ?? current.webhook_url,
      input.allowed_origins ?? current.allowed_origins,
    ],
  )) as VendorRow[]

  const row = rows[0]

  if (!row) {
    return null
  }

  return toVendor(row)
}
