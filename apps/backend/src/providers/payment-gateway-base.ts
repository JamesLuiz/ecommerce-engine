import { AbstractPaymentProvider } from "@medusajs/framework/utils"

export type GatewayOptions = {
  publicKey?: string
  secretKey?: string
  webhookSecret?: string
  baseUrl?: string
}

export abstract class GatewayPaymentProvider extends AbstractPaymentProvider<GatewayOptions> {
  protected readonly publicKey: string
  protected readonly secretKey: string
  protected readonly webhookSecret?: string

  constructor(container: Record<string, unknown>, options: GatewayOptions) {
    super(container, options)

    this.publicKey = options.publicKey ?? ""
    this.secretKey = options.secretKey ?? ""
    this.webhookSecret = options.webhookSecret
  }

  protected get baseUrl(): string {
    return this.config?.baseUrl ?? ""
  }

  protected getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
    }

    return headers
  }

  protected async fetchJson<T>(
    url: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(url, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })

    const responseText = await response.text()
    const payload = responseText ? JSON.parse(responseText) : {}

    if (!response.ok) {
      const message =
        payload?.message ??
        payload?.error?.message ??
        payload?.data?.message ??
        "Gateway request failed"
      throw new Error(message)
    }

    return payload as T
  }

  protected buildReference(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`
  }

  protected getSessionId(input: any, fallback = "unknown"): string {
    return (
      input?.data?.reference ??
      input?.data?.id ??
      input?.data?.transaction_id ??
      input?.data?.tx_ref ??
      fallback
    )
  }
}
