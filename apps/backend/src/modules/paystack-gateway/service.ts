import {
  AbstractPaymentProvider,
  MedusaError,
} from "@medusajs/framework/utils"
import crypto from "node:crypto"

import { resolvePaystackConfig, type ResolvedPaystackConfig } from "../../lib/payment-provider-config"
import { GatewayClient } from "./gateway-client"

export type PaystackGatewayOptions = {
  gatewayUrl?: string
  gatewayToken?: string
  webhookSecret?: string
}

type PaystackInitResult = {
  reference: string
  authorization_url?: string
  access_code?: string
}

export class PaystackGatewayPaymentProvider extends AbstractPaymentProvider<PaystackGatewayOptions> {
  static identifier = "paystack-gateway"

  private readonly client: GatewayClient
  private readonly webhookSecret: string
  private readonly options: PaystackGatewayOptions

  constructor(container: Record<string, unknown>, options: PaystackGatewayOptions) {
    super(container, options)

    this.options = options
    this.webhookSecret = options.webhookSecret ?? process.env.GATEWAY_WEBHOOK_SECRET ?? ""
    const gatewayUrl = options.gatewayUrl ?? process.env.GATEWAY_URL ?? ""
    const gatewayToken = options.gatewayToken ?? process.env.GATEWAY_TOKEN ?? ""

    this.client = new GatewayClient({
      gatewayUrl,
      gatewayToken,
    })
  }

  static validateOptions(_options: Record<string, any>): void {
    // Configuration may come from env vars, provider options, or tenant DB config.
  }

  getClient(): GatewayClient {
    return this.client
  }

  private async resolveConfig(): Promise<ResolvedPaystackConfig> {
    return resolvePaystackConfig(this.container as any, {
      gatewayUrl: this.options.gatewayUrl,
      gatewayToken: this.options.gatewayToken,
      webhookSecret: this.options.webhookSecret,
    })
  }

  private getExternalRef(input: any): string {
    return (
      input.context?.idempotency_key ??
      input.context?.payment_session_id ??
      input.data?.payment_session_id ??
      input.data?.reference ??
      `payses_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`
    )
  }

  private getAmountKobo(input: any): number {
    return Math.round(Number(input.amount ?? 0) * 100)
  }

  private getCurrency(input: any): string {
    return (input.currency_code ?? "NGN").toUpperCase()
  }

  private getEmail(input: any): string {
    return (
      input.context?.customer?.email ??
      input.data?.email ??
      input.context?.email ??
      "customer@example.com"
    )
  }

  private getCallbackUrl(input: any): string {
    return (
      input.data?.callback_url ??
      input.data?.return_url ??
      input.context?.callback_url ??
      process.env.STOREFRONT_URL ??
      "https://example.com/checkout/callback"
    )
  }

  private async paystackRequest<T>(
    secretKey: string,
    path: string,
    method: "GET" | "POST" = "GET",
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`https://api.paystack.co${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const text = await response.text()
    const payload = text ? JSON.parse(text) : {}

    if (!response.ok || payload?.status === false) {
      const message =
        payload?.message ??
        payload?.error?.message ??
        payload?.data?.message ??
        `Paystack request failed with HTTP ${response.status}`
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
    }

    return payload as T
  }

  private async initiateDirect(input: any, secretKey: string): Promise<any> {
    const externalRef = this.getExternalRef(input)
    const amountKobo = this.getAmountKobo(input)
    const currency = this.getCurrency(input)
    const email = this.getEmail(input)
    const callbackUrl = this.getCallbackUrl(input)

    const result = await this.paystackRequest<any>(secretKey, "/transaction/initialize", "POST", {
      email,
      amount: String(amountKobo),
      currency,
      reference: externalRef,
      callback_url: callbackUrl,
      metadata: {
        ...(input.data?.metadata ?? {}),
        external_ref: externalRef,
        cart_id: input.context?.cart_id ?? input.context?.id ?? null,
        customer_id: input.context?.customer?.id ?? null,
      },
    })

    const data = (result?.data ?? {}) as PaystackInitResult

    return {
      id: data.reference ?? externalRef,
      data: {
        reference: data.reference ?? externalRef,
        authorization_url: data.authorization_url,
        access_code: data.access_code,
        mode: "direct",
      },
      status: "pending",
    }
  }

  private async initiatePlatform(input: any, client: GatewayClient): Promise<any> {
    const externalRef = this.getExternalRef(input)
    const amountKobo = this.getAmountKobo(input)
    const currency = this.getCurrency(input)
    const email = this.getEmail(input)
    const callbackUrl = this.getCallbackUrl(input)

    const result = await client.initializeTransaction({
      amount: amountKobo,
      currency,
      email,
      external_ref: externalRef,
      callback_url: callbackUrl,
    })

    return {
      id: result.reference,
      data: {
        reference: result.reference,
        authorization_url: result.authorization_url,
        access_code: result.access_code,
        mode: "platform",
      },
      status: "pending",
    }
  }

  async initiatePayment(input: any): Promise<any> {
    const config = await this.resolveConfig()

    if (config.mode === "direct") {
      return this.initiateDirect(input, config.secretKey)
    }

    const client =
      config.gatewayUrl || config.gatewayToken || config.webhookSecret
        ? new GatewayClient({
            gatewayUrl: config.gatewayUrl,
            gatewayToken: config.gatewayToken,
          })
        : this.client

    return this.initiatePlatform(input, client)
  }

  private async verifyDirect(reference: string, secretKey: string): Promise<any> {
    const result = await this.paystackRequest<any>(
      secretKey,
      `/transaction/verify/${encodeURIComponent(reference)}`
    )
    return result?.data ?? {}
  }

  async authorizePayment(input: any): Promise<any> {
    const reference = input.data?.reference ?? input.id

    if (!reference) {
      return { data: input.data ?? {}, status: "pending" }
    }

    const config = await this.resolveConfig()

    try {
      if (config.mode === "direct") {
        const verified = await this.verifyDirect(reference, config.secretKey)
        if (verified.status === "success") {
          return { status: "captured", data: { ...(input.data ?? {}), ...verified } }
        }
        return { status: "pending", data: { ...(input.data ?? {}), ...verified } }
      }

      const client = new GatewayClient({
        gatewayUrl: config.gatewayUrl,
        gatewayToken: config.gatewayToken,
      })
      const verified = await client.verifyTransaction(reference)
      if (verified.status === "success") {
        return { status: "captured", data: { ...(input.data ?? {}), ...verified } }
      }
      return { status: "pending", data: { ...(input.data ?? {}), ...verified } }
    } catch {
      return { status: "pending", data: input.data ?? {} }
    }
  }

  async capturePayment(input: any): Promise<any> {
    return { data: input.data ?? {} }
  }

  async getPaymentStatus(input: any): Promise<any> {
    const reference = input.data?.reference ?? input.id

    if (!reference) {
      return { status: "pending", data: input.data ?? {} }
    }

    const config = await this.resolveConfig()

    try {
      if (config.mode === "direct") {
        const verified = await this.verifyDirect(reference, config.secretKey)
        if (verified.status === "success") {
          return { status: "captured", data: { ...(input.data ?? {}), ...verified } }
        }
        if (verified.status === "failed" || verified.status === "abandoned") {
          return { status: "error", data: { ...(input.data ?? {}), ...verified } }
        }
        return { status: "pending", data: { ...(input.data ?? {}), ...verified } }
      }

      const client = new GatewayClient({
        gatewayUrl: config.gatewayUrl,
        gatewayToken: config.gatewayToken,
      })
      const verified = await client.verifyTransaction(reference)
      if (verified.status === "success") {
        return { status: "captured", data: { ...(input.data ?? {}), ...verified } }
      }
      if (verified.status === "failed") {
        return { status: "error", data: { ...(input.data ?? {}), ...verified } }
      }
      return { status: "pending", data: { ...(input.data ?? {}), ...verified } }
    } catch {
      return { status: "pending", data: input.data ?? {} }
    }
  }

  async retrievePayment(input: any): Promise<any> {
    const reference = input.data?.reference ?? input.id
    if (!reference) {
      return { data: input.data ?? {} }
    }

    const config = await this.resolveConfig()

    if (config.mode === "direct") {
      const data = await this.verifyDirect(reference, config.secretKey)
      return { data }
    }

    const client = new GatewayClient({
      gatewayUrl: config.gatewayUrl,
      gatewayToken: config.gatewayToken,
    })
    const data = await client.getTransaction(reference)
    return { data }
  }

  async updatePayment(input: any): Promise<any> {
    const currentStatus = await this.getPaymentStatus(input)

    if (currentStatus.status === "pending" && input.amount) {
      return this.initiatePayment(input)
    }

    return {
      data: {
        ...(input.data ?? {}),
        amount: input.amount,
        currency_code: input.currency_code,
      },
    }
  }

  async cancelPayment(input: any): Promise<any> {
    return { data: input.data ?? {} }
  }

  async deletePayment(input: any): Promise<any> {
    return { data: input.data ?? {} }
  }

  async refundPayment(input: any): Promise<any> {
    const reference = input.data?.reference ?? input.id
    const amountKobo = input.amount ? Math.round(Number(input.amount) * 100) : undefined
    const config = await this.resolveConfig()

    try {
      if (config.mode === "direct") {
        const body: Record<string, unknown> = { transaction: reference }
        if (amountKobo) body.amount = String(amountKobo)
        if (input.reason) body.merchant_note = String(input.reason)
        const res = await this.paystackRequest<any>(config.secretKey, "/refund", "POST", body)
        return { data: { ...(input.data ?? {}), refund: res?.data ?? res } }
      }

      const client = new GatewayClient({
        gatewayUrl: config.gatewayUrl,
        gatewayToken: config.gatewayToken,
      })
      const res = await client.refundTransaction(reference, amountKobo, input.reason)
      return { data: { ...(input.data ?? {}), refund: res } }
    } catch (err: unknown) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        err instanceof Error ? err.message : "Refund failed"
      )
    }
  }

  private safeEqualHex(a: string, b: string): boolean {
    const aBuf = Buffer.from(a)
    const bBuf = Buffer.from(b)
    if (aBuf.length !== bBuf.length) return false
    return crypto.timingSafeEqual(aBuf, bBuf)
  }

  private parsePayload(rawData: any): { rawText: string; dataObj: any } {
    const rawText = Buffer.isBuffer(rawData)
      ? rawData.toString("utf8")
      : typeof rawData === "string"
        ? rawData
        : JSON.stringify(rawData)
    return { rawText, dataObj: JSON.parse(rawText) }
  }

  private async handleDirectWebhook(payload: any, secretKey: string): Promise<any> {
    const headers = payload.headers ?? {}
    const signature = (headers["x-paystack-signature"] ?? headers["X-Paystack-Signature"] ?? "") as string

    if (!signature) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Missing Paystack webhook signature")
    }

    const { rawText, dataObj } = this.parsePayload(payload.rawData ?? payload.rawBody ?? payload.data ?? payload)
    const expected = crypto.createHmac("sha512", secretKey).update(rawText).digest("hex")

    if (!this.safeEqualHex(signature, expected)) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Invalid Paystack webhook signature")
    }

    const event = dataObj.event ?? ""
    const sessionData = dataObj.data ?? {}
    const sessionId =
      sessionData.metadata?.external_ref ??
      sessionData.reference ??
      sessionData.metadata?.reference
    const amountMajor = Number(sessionData.amount ?? 0) / 100

    if (!sessionId) {
      return { action: "not_supported", data: {} }
    }

    if (event === "charge.success") {
      return { action: "captured", data: { session_id: sessionId, amount: amountMajor } }
    }

    if (event === "charge.failed") {
      return { action: "failed", data: { session_id: sessionId, amount: amountMajor } }
    }

    return { action: "not_supported", data: { session_id: sessionId, amount: amountMajor } }
  }

  private async handlePlatformWebhook(payload: any, webhookSecret: string): Promise<any> {
    const headers = payload.headers ?? {}
    const { rawText, dataObj } = this.parsePayload(payload.rawData ?? payload.rawBody ?? payload.data ?? payload)

    const ts = headers["x-gateway-timestamp"] ?? headers["X-Gateway-Timestamp"]
    const sig = headers["x-gateway-signature"] ?? headers["X-Gateway-Signature"]

    if (!ts || !sig) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Missing gateway webhook signature headers")
    }

    if (!webhookSecret) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Gateway webhook secret is not configured")
    }

    if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "stale webhook")
    }

    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(`${ts}.${rawText}`)
      .digest("hex")

    if (!this.safeEqualHex(String(sig), expected)) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "bad signature")
    }

    const event = dataObj.event ?? ""
    const sessionData = dataObj.data ?? {}
    const externalRef = sessionData.metadata?.external_ref
    const amountMajor = Number(sessionData.amount ?? 0) / 100

    if (!externalRef) {
      return { action: "not_supported", data: {} }
    }

    if (event === "charge.success") {
      return { action: "captured", data: { session_id: externalRef, amount: amountMajor } }
    }

    if (event === "charge.failed") {
      return { action: "failed", data: { session_id: externalRef, amount: amountMajor } }
    }

    return { action: "not_supported", data: { session_id: externalRef, amount: amountMajor } }
  }

  async getWebhookActionAndData(payload: any): Promise<any> {
    const config = await this.resolveConfig()

    if (config.mode === "direct") {
      return this.handleDirectWebhook(payload, config.secretKey)
    }

    const secret = config.webhookSecret || this.webhookSecret
    return this.handlePlatformWebhook(payload, secret)
  }
}

export default PaystackGatewayPaymentProvider
