import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import { GatewayPaymentProvider } from "./payment-gateway-base"

type FlutterwaveOptions = {
  publicKey: string
  secretKey: string
  webhookSecret?: string
  baseUrl?: string
}

export class FlutterwavePaymentProvider extends GatewayPaymentProvider {
  static identifier = "flutterwave"

  static validateOptions(options: Record<string, any>): void {
    if (!options?.publicKey || !options?.secretKey) {
      throw new Error("Flutterwave requires a public key and secret key")
    }
  }

  constructor(container: Record<string, unknown>, options: FlutterwaveOptions) {
    super(container, options)
  }

  async initiatePayment(input: any): Promise<any> {
    const reference = this.getSessionId(input, this.buildReference("flutterwave"))
    const amount = Number(input.amount ?? 0)
    const email =
      input.context?.customer?.email ??
      input.context?.email ??
      "customer@example.com"

    const response = await this.fetchJson<any>(
      `${this.baseUrl || "https://api.flutterwave.com/v3"}/payments`,
      "POST",
      {
        tx_ref: reference,
        amount,
        currency: input.currency_code ?? "NGN",
        redirect_url: input.data?.callback_url ?? input.data?.return_url,
        payment_options: "card,banktransfer,ussd",
        customer: {
          email,
          phonenumber: input.context?.customer?.phone ?? "",
          name: input.context?.customer?.first_name
            ? `${input.context.customer.first_name} ${input.context.customer.last_name ?? ""}`.trim()
            : "Customer",
        },
        customizations: {
          title: input.data?.title ?? "Flowcheq Commerce",
          description: input.data?.description ?? "Checkout payment",
        },
      }
    )

    return {
      data: {
        ...response.data,
        tx_ref: reference,
        provider: "flutterwave",
      },
      id: response.data?.transaction_id ?? reference,
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
      `${this.baseUrl || "https://api.flutterwave.com/v3"}/transactions/${reference}/verify`
    )

    const success = response?.data?.status === "successful"

    return {
      data: {
        ...(input.data ?? {}),
        ...response.data,
        tx_ref: reference,
      },
      status: success ? "authorized" : "pending_authorization",
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
    const reference = this.getSessionId(input)
    const response = await this.fetchJson<any>(
      `${this.baseUrl || "https://api.flutterwave.com/v3"}/transactions/${reference}/verify`
    )

    switch (response?.data?.status) {
      case "successful":
        return { status: "captured", data: response.data }
      case "failed":
        return { status: "canceled", data: response.data }
      default:
        return { status: "pending", data: response.data }
    }
  }

  async refundPayment(input: any): Promise<any> {
    const reference = this.getSessionId(input)
    const response = await this.fetchJson<any>(
      `${this.baseUrl || "https://api.flutterwave.com/v3"}/transactions/${reference}/refund`,
      "POST",
      {
        amount: Number(input.amount ?? 0),
        currency: input.currency_code ?? "NGN",
      }
    )

    return {
      data: {
        ...(input.data ?? {}),
        ...response.data,
        tx_ref: reference,
      },
    }
  }

  async retrievePayment(input: any): Promise<any> {
    const reference = this.getSessionId(input)
    const response = await this.fetchJson<any>(
      `${this.baseUrl || "https://api.flutterwave.com/v3"}/transactions/${reference}/verify`
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
    const event = data?.event ?? data?.data?.status ?? data?.status
    const reference = data?.data?.tx_ref ?? data?.txRef ?? data?.data?.reference ?? "unknown"
    const amount = Number(data?.data?.amount ?? 0)

    if (["successful", "captured", "paid"].includes(String(event))) {
      return {
        action: "captured",
        data: { session_id: reference, amount },
      }
    }

    if (["pending", "processing"].includes(String(event))) {
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
  services: [FlutterwavePaymentProvider],
})
