/**
 * Ensure this store has a registered Paystack gateway vendor and persist the
 * one-time vendor token in the tenant database.
 *
 * The gateway stores only a hash of the token, so setup must capture the token
 * returned by the admin API. Passing the current token back to the idempotent
 * ensure endpoint lets a valid token be reused and a stale one be rotated.
 *
 *   npx medusa exec ./src/scripts/ensure-gateway-vendor.ts
 */
import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import {
  getPaystackPrefilledLinks,
  resolvePlatformGatewayConfig,
  upsertGatewayConfig,
} from "../lib/payment-provider-config"

type GatewayVendorContext = {
  slug?: string
  name?: string
}

type TenantIdentity = {
  slug?: string
  name?: string
}

type EnsureVendorResponse = {
  vendor_id?: string
  token?: string
  webhook_signing_secret?: string
  error?: { message?: string }
}

function readTenantIdentity(): TenantIdentity {
  const raw = process.env.TENANT_CONFIG

  if (!raw?.trim()) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      slug: typeof parsed.slug === "string" ? parsed.slug : undefined,
      name:
        typeof parsed.businessName === "string" ? parsed.businessName : undefined,
    }
  } catch {
    return {}
  }
}

function normalizeOrigin(value: string | undefined | null): string | null {
  if (!value?.trim()) {
    return null
  }

  for (const candidate of value.split(",")) {
    const trimmed = candidate.trim()

    if (!trimmed) {
      continue
    }

    try {
      return new URL(trimmed).origin
    } catch {
      // Try the next comma-separated origin.
    }
  }

  return null
}

function allowedOrigins(): string[] {
  const origins = new Set<string>()

  for (const value of [
    process.env.STOREFRONT_URL,
    process.env.STORE_CORS,
    process.env.ADMIN_CORS,
    process.env.MEDUSA_BACKEND_URL,
    process.env.BACKEND_URL,
  ]) {
    const origin = normalizeOrigin(value)

    if (origin) {
      origins.add(origin)
    }
  }

  // Local storefronts are commonly opened on either hostname. Allow both so
  // Paystack callback origin checks pass regardless of which one was used.
  for (const origin of [...origins]) {
    try {
      const url = new URL(origin)

      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        const counterpart = new URL(url.toString())
        counterpart.hostname = url.hostname === "localhost" ? "127.0.0.1" : "localhost"
        origins.add(counterpart.origin)
      }
    } catch {
      // Ignore malformed origins; they were already filtered by normalizeOrigin.
    }
  }

  return [...origins]
}

export default async function ensureGatewayVendor(
  { container }: ExecArgs,
  context: GatewayVendorContext = {}
) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const adminToken = (
    process.env.PAYMENTS_GATEWAY_ADMIN_TOKEN ||
    process.env.GATEWAY_ADMIN_TOKEN ||
    process.env.ADMIN_TOKEN ||
    ""
  ).trim()

  if (!adminToken) {
    logger.warn(
      "Skipping Paystack gateway vendor setup: no gateway admin token is configured. " +
        "Set PAYMENTS_GATEWAY_ADMIN_TOKEN to enable automatic vendor registration."
    )
    return
  }

  const current = await resolvePlatformGatewayConfig(container)
  const gatewayUrl = current.gatewayUrl.trim().replace(/\/+$/, "")

  if (!gatewayUrl) {
    logger.warn(
      "Skipping Paystack gateway vendor setup: GATEWAY_URL is not configured."
    )
    return
  }

  const identity = readTenantIdentity()
  const slug = (context.slug || process.env.GATEWAY_VENDOR_SLUG || identity.slug || "flowcheq").trim()
  const name = (
    context.name ||
    process.env.GATEWAY_VENDOR_NAME ||
    identity.name ||
    slug
  ).trim()
  const links = getPaystackPrefilledLinks()

  let response: Response
  try {
    response = await fetch(`${gatewayUrl}/admin/vendors/ensure`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slug,
        name,
        webhook_url: links.webhook_url,
        allowed_origins: allowedOrigins(),
        current_token: current.gatewayToken || undefined,
      }),
      signal: AbortSignal.timeout(15000),
    })
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Could not reach the payments gateway at ${gatewayUrl}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }

  const text = await response.text()
  let data: EnsureVendorResponse = {}

  try {
    data = text ? (JSON.parse(text) as EnsureVendorResponse) : {}
  } catch {
    data = {}
  }

  if (!response.ok || !data.token || !data.vendor_id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Paystack gateway vendor setup failed (${response.status}): ${
        data.error?.message || text.slice(0, 300) || "empty response"
      }`
    )
  }

  await upsertGatewayConfig(container, {
    gatewayUrl: current.gatewayUrl,
    gatewayToken: data.token,
    vendorId: data.vendor_id,
    webhookSecret: data.webhook_signing_secret ?? null,
  })

  logger.info(
    `Paystack gateway vendor "${slug}" is configured; its token is stored in this store's database.`
  )
}
