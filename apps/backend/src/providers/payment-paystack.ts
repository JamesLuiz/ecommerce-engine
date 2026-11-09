import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import { GatewayPaymentProvider } from "./payment-gateway-base"

type PaystackOptions = {
  publicKey: string
  secretKey: string
  webhookSecret?: string
  baseUrl?: string
}

export class PaystackPaymentProvider extends GatewayPaymentProvider {
  static identifier = "paystack"

  static validateOptions(options: Record<string, any>): void {
    if (!options?.publicKey || !options?.secretKey) {
      throw new Error("Paystack requires a public key and secret key")
    }
  }

  constructor(container: Record<string, unknown>, options: PaystackOptions) {
    super(container, options)
  }

  async initiatePayment(input: any): Promise<any> {
    const reference = this.getSessionId(input, this.buildReference("paystack"))
    const amount = Math.round(Number(input.amount ?? 0) * 100)
    const currency = (input.currency_code ?? "NGN").toUpperCase()
    const email =
      input.context?.customer?.email ??
      input.context?.email ??
      "customer@example.com"

    const response = await this.fetchJson<any>(
      `${this.baseUrl || "https://api.paystack.co"}/transaction/initialize`,
      "POST",
      {
        email,
        amount: String(amount),
        currency,
        reference,
        callback_url: input.data?.callback_url ?? input.data?.return_url,
        metadata: {
          ...(input.data?.metadata ?? {}),
          cart_id: input.context?.cart_id ?? input.context?.id,
          customer_id: input.context?.customer?.id,
        },
      }
    )

    return {
      data: {
        ...response.data,
        reference,
        provider: "paystack",
      },
      id: response.data?.reference ?? reference,
      status: "pending",
    }
  }

  async authorizePayment(input: any): Promise<any> {
    const reference = this.getSessionId(input)

    if (!reference || reference === "unknown") {
      return {
        data: input.data,
        status: "pending_authorization",
      }
    }

    const response = await this.fetchJson<any>(
      `${this.baseUrl || "https://api.paystack.co"}/transaction/verify/${reference}`
    )

    const isAuthorized = response?.data?.status === "success"

    return {
      data: {
        ...(input.data ?? {}),
        ...response.data,
        reference,
      },
      status: isAuthorized ? "authorized" : "pending_authorization",
    }
  }

  async cancelPayment(input: any): Promise<any> {
    return { data: input.data ?? {} }
  }

  async capturePayment(input: any): Promise<any> {
    return { data: input.data ?? {} }
  }

  async deletePayment(input: any): Promise<any> {
    return { data: input.data ?? {} }
  }

  async getPaymentStatus(input: any): Promise<any> {
    const response = await this.fetchJson<any>(
      `${this.baseUrl || "https://api.paystack.co"}/transaction/verify/${this.getSessionId(input)}`
    )

    switch (response?.data?.status) {
      case "success":
        return { status: "captured", data: response.data }
      case "failed":
        return { status: "canceled", data: response.data }
      default:
        return { status: "pending", data: response.data }
    }
  }

  async refundPayment(input: any): Promise<any> {
    const reference = this.getSessionId(input)
    const amount = Math.round(Number(input.amount ?? 0) * 100)

    const response = await this.fetchJson<any>(
      `${this.baseUrl || "https://api.paystack.co"}/refund`,
      "POST",
      {
        transaction: reference,
        amount: amount > 0 ? String(amount) : undefined,
      }
    )

    return {
      data: {
        ...(input.data ?? {}),
        ...response.data,
        reference,
      },
      id: response.data?.id,
    }
  }

  async retrievePayment(input: any): Promise<any> {
    const response = await this.fetchJson<any>(
      `${this.baseUrl || "https://api.paystack.co"}/transaction/verify/${this.getSessionId(input)}`
    )

    return { data: response.data }
  }

  async updatePayment(input: any): Promise<any> {
    return {
      data: {
        ...(input.data ?? {}),
        amount: input.amount,
        currency_code: input.currency_code,
      },
    }
  }

  async getWebhookActionAndData(data: any): Promise<any> {
    const event = data?.event ?? data?.data?.event ?? data?.data?.status
    const reference = data?.data?.reference ?? data?.data?.metadata?.reference ?? "unknown"
    const amount = Number(data?.data?.amount ?? 0)

    if (["charge.success", "transaction.success", "success"].includes(event)) {
      return {
        action: "captured",
        data: { session_id: reference, amount },
      }
    }

    if (["charge.pending", "transaction.pending", "pending"].includes(event)) {
      return {
        action: "not_supported",
        data: { session_id: reference, amount },
      }
    }

    return {
      action: "failed",
      data: { session_id: reference, amount },
    }
  }
}

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaystackPaymentProvider],
})
