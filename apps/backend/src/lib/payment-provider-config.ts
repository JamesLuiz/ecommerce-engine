import type { MedusaContainer } from "@medusajs/framework/types"
import { VENDOR_PAYMENT_MODULE } from "../modules/vendor-payment"
import { decryptSecret, encryptSecret, maskSecret } from "./payment-config-crypto"

export type PaystackPaymentMode = "platform" | "direct"

export interface StoredPaymentProviderConfig {
  id?: string
  provider: "paystack"
  mode: PaystackPaymentMode
  public_key: string | null
  secret_key_enc: string | null
  webhook_secret_enc: string | null
  enabled: boolean
}

export interface ResolvedDirectPaystackConfig {
  mode: "direct"
  publicKey: string
  secretKey: string
  webhookSecret?: string
}

export interface ResolvedPlatformPaystackConfig {
  mode: "platform"
  gatewayUrl: string
  gatewayToken: string
  webhookSecret: string
}

export type ResolvedPaystackConfig = ResolvedDirectPaystackConfig | ResolvedPlatformPaystackConfig

function getBaseUrl(originOrUrl: string | undefined | null): string | null {
  if (!originOrUrl) return null
  const value = originOrUrl.trim()
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    // allow comma-separated CORS origins
    const first = value.split(",")[0]?.trim()
    if (!first) return null
    try {
      return new URL(first).origin
    } catch {
      return null
    }
  }
}

export function getPaystackPrefilledLinks() {
  const backendBase =
    getBaseUrl(process.env.MEDUSA_BACKEND_URL) ||
    getBaseUrl(process.env.BACKEND_URL) ||
    getBaseUrl(process.env.ADMIN_CORS) ||
    null
  const storefrontBase =
    getBaseUrl(process.env.STOREFRONT_URL) ||
    getBaseUrl(process.env.STORE_CORS) ||
    null

  // Medusa payment webhook hook path for this provider registration
  const webhookPath = "/hooks/payment/paystack-gateway_paystack-gateway"

  return {
    webhook_url: backendBase ? `${backendBase}${webhookPath}` : webhookPath,
    callback_url: storefrontBase ? `${storefrontBase}/checkout` : "/checkout",
    provider_id: "pp_paystack-gateway_paystack-gateway",
  }
}

export async function getStoredPaymentProviderConfig(
  container: MedusaContainer | Record<string, unknown>
): Promise<StoredPaymentProviderConfig | null> {
  try {
    const service = (container as any).resolve(VENDOR_PAYMENT_MODULE) as any
    const configs = await service.listPaymentProviderConfigs({ provider: "paystack" }, { take: 1 })
    if (!configs?.length) return null
    const config = configs[0]
    return {
      id: config.id,
      provider: "paystack",
      mode: (config.mode === "direct" ? "direct" : "platform") as PaystackPaymentMode,
      public_key: config.public_key ?? null,
      secret_key_enc: config.secret_key_enc ?? null,
      webhook_secret_enc: config.webhook_secret_enc ?? null,
      enabled: config.enabled !== false,
    }
  } catch {
    return null
  }
}

export async function resolvePaystackConfig(
  container: MedusaContainer | Record<string, unknown>,
  platformDefaults?: { gatewayUrl?: string; gatewayToken?: string; webhookSecret?: string }
): Promise<ResolvedPaystackConfig> {
  const stored = await getStoredPaymentProviderConfig(container)

  if (stored?.mode === "direct" && stored.enabled) {
    const secretKey = stored.secret_key_enc ? decryptSecret(stored.secret_key_enc) : ""
    const publicKey = stored.public_key || ""
    const webhookSecret = stored.webhook_secret_enc ? decryptSecret(stored.webhook_secret_enc) : ""

    if (secretKey && publicKey) {
      return {
        mode: "direct",
        publicKey,
        secretKey,
        webhookSecret: webhookSecret || undefined,
      }
    }
  }

  return {
    mode: "platform",
    gatewayUrl: platformDefaults?.gatewayUrl ?? process.env.GATEWAY_URL ?? "",
    gatewayToken: platformDefaults?.gatewayToken ?? process.env.GATEWAY_TOKEN ?? "",
    webhookSecret: platformDefaults?.webhookSecret ?? process.env.GATEWAY_WEBHOOK_SECRET ?? "",
  }
}

export async function upsertPaymentProviderConfig(
  container: MedusaContainer | Record<string, unknown>,
  input: {
    mode: PaystackPaymentMode
    public_key?: string | null
    secret_key?: string | null
    webhook_secret?: string | null
    enabled?: boolean
  }
) {
  const service = (container as any).resolve(VENDOR_PAYMENT_MODULE) as any
  const existing = await service.listPaymentProviderConfigs({ provider: "paystack" }, { take: 1 })
  const current = existing?.[0]

  const update: Record<string, any> = {
    provider: "paystack",
    mode: input.mode,
    enabled: input.enabled ?? true,
  }

  if (input.public_key !== undefined) {
    update.public_key = input.public_key || null
  }

  if (input.secret_key !== undefined) {
    update.secret_key_enc = input.secret_key ? encryptSecret(input.secret_key) : null
  }

  if (input.webhook_secret !== undefined) {
    update.webhook_secret_enc = input.webhook_secret ? encryptSecret(input.webhook_secret) : null
  }

  let saved
  if (current) {
    saved = await service.updatePaymentProviderConfigs({ id: current.id, ...update })
  } else {
    saved = await service.createPaymentProviderConfigs(update)
  }

  return saved
}

export function toPublicPaymentProviderConfig(stored: StoredPaymentProviderConfig | null) {
  const links = getPaystackPrefilledLinks()
  const directReady = Boolean(
    stored?.mode === "direct" && stored.public_key && stored.secret_key_enc
  )

  return {
    provider: "paystack",
    mode: stored?.mode ?? "platform",
    enabled: stored?.enabled ?? true,
    direct: {
      public_key: stored?.public_key ?? "",
      secret_key_set: Boolean(stored?.secret_key_enc),
      secret_key_masked: stored?.secret_key_enc ? "****" : null,
      webhook_secret_set: Boolean(stored?.webhook_secret_enc),
      webhook_secret_masked: stored?.webhook_secret_enc ? "****" : null,
      ready: directReady,
    },
    platform: {
      gateway_configured: Boolean(process.env.GATEWAY_URL && process.env.GATEWAY_TOKEN),
    },
    links,
  }
}
