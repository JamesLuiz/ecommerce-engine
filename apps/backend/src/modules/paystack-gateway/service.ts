import {
  AbstractPaymentProvider,
  MedusaError,
} from "@medusajs/framework/utils"
import crypto from "node:crypto"
import { GatewayClient } from "./gateway-client"

export type PaystackGatewayOptions = {
  gatewayUrl?: string
  gatewayToken?: string
  webhookSecret?: string
}

export class PaystackGatewayPaymentProvider extends AbstractPaymentProvider<PaystackGatewayOptions> {
  static identifier = "paystack-gateway"

  private readonly client: GatewayClient
  private readonly webhookSecret: string

  constructor(container: Record<string, unknown>, options: PaystackGatewayOptions) {
    super(container, options)

    this.webhookSecret = options.webhookSecret ?? process.env.GATEWAY_WEBHOOK_SECRET ?? ""
    const gatewayUrl = options.gatewayUrl ?? process.env.GATEWAY_URL ?? ""
    const gatewayToken = options.gatewayToken ?? process.env.GATEWAY_TOKEN ?? ""

    this.client = new GatewayClient({
      gatewayUrl,
      gatewayToken,
    })
  }

  static validateOptions(options: Record<string, any>): void {
    // We allow configuration via either options or environment variables
  }

  getClient(): GatewayClient {
    return this.client
  }

  async initiatePayment(input: any): Promise<any> {
    const amountMajor = Number(input.amount ?? 0)
    const amountKobo = Math.round(amountMajor * 100)
    const currency = (input.currency_code ?? "NGN").toUpperCase()

    const email =
      input.context?.customer?.email ??
      input.data?.email ??
      input.context?.email ??
      "customer@example.com"

    const externalRef =
      input.context?.idempotency_key ??
      input.context?.payment_session_id ??
      input.data?.payment_session_id ??
      `payses_${Date.now()}`

    const callbackUrl =
      input.data?.callback_url ??
      input.data?.return_url ??
      input.context?.callback_url ??
      "https://example.com/checkout/callback"

    const result = await this.client.initializeTransaction({
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
      },
      status: "pending",
    }
  }

  async authorizePayment(input: any): Promise<any> {
    const reference = input.data?.reference ?? input.id

    if (!reference) {
      return {
        data: input.data ?? {},
        status: "pending",
      }
    }

    const verified = await this.client.verifyTransaction(reference)

    if (verified.status === "success") {
      return {
        status: "captured",
        data: {
          ...(input.data ?? {}),
          ...verified,
        },
      }
    }

    return {
      status: "pending",
      data: {
        ...(input.data ?? {}),
        ...verified,
      },
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

    try {
      const verified = await this.client.verifyTransaction(reference)

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
    const data = await this.client.getTransaction(reference)
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

    try {
      const res = await this.client.refundTransaction(reference, amountKobo, input.reason)
      return {
        data: {
          ...(input.data ?? {}),
          refund: res,
        },
      }
    } catch (err: unknown) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        err instanceof Error ? err.message : "Refund failed on payment gateway",
      )
    }
  }

  async getWebhookActionAndData(payload: any): Promise<any> {
    const headers = payload.headers ?? {}
    const rawData = payload.rawData ?? payload.rawBody ?? payload.data ?? payload

    // Medusa preserves the raw request body as a Buffer (hooks middleware uses
    // `preserveRawBody`). The signature must be verified over the exact bytes,
    // and the same bytes must then be parsed as JSON.
    const rawText = Buffer.isBuffer(rawData)
      ? rawData.toString("utf8")
      : typeof rawData === "string"
        ? rawData
        : JSON.stringify(rawData)

    const ts = headers["x-gateway-timestamp"] ?? headers["X-Gateway-Timestamp"]
    const sig = headers["x-gateway-signature"] ?? headers["X-Gateway-Signature"]

    if (!ts || !sig) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Missing gateway webhook signature headers")
    }

    if (!this.webhookSecret) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Gateway webhook secret is not configured")
    }

    if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "stale webhook")
    }

    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(`${ts}.${rawText}`)
      .digest("hex")

    const sigBuffer = Buffer.from(sig)
    const expBuffer = Buffer.from(expected)

    if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "bad signature")
    }

    const dataObj = JSON.parse(rawText)
    const event = dataObj.event ?? ""
    const sessionData = dataObj.data ?? {}
    // The gateway copies the Medusa payment session id into Paystack metadata as
    // `external_ref`. Without it the event cannot be tied to a session, so it is
    // ignored rather than guessed from the Paystack reference.
    const externalRef = sessionData.metadata?.external_ref
    const amountMinor = sessionData.amount ?? 0
    const amountMajor = amountMinor / 100

    if (!externalRef) {
      return { action: "not_supported", data: {} }
    }

    if (event === "charge.success") {
      return {
        action: "captured",
        data: {
          session_id: externalRef,
          amount: amountMajor,
        },
      }
    }

    if (event === "charge.failed") {
      return {
        action: "failed",
        data: {
          session_id: externalRef,
          amount: amountMajor,
        },
      }
    }

    return {
      action: "not_supported",
      data: {
        session_id: externalRef,
        amount: amountMajor,
      },
    }
  }
}

export default PaystackGatewayPaymentProvider
