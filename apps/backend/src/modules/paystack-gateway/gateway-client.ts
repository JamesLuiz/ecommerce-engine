import { MedusaError } from "@medusajs/framework/utils"

export type GatewayClientOptions = {
  gatewayUrl: string
  gatewayToken: string
}

export type GatewayInitializePayload = {
  amount: number
  currency: string
  email: string
  external_ref: string
  callback_url: string
}

export type GatewayInitializeResult = {
  reference: string
  authorization_url: string
  access_code: string
}

export type GatewayVerifyResult = {
  reference: string
  status: "success" | "failed" | "pending"
  amount: number
  currency: string
  paid_at: string | null
  channel?: string | null
}

export type GatewayBank = {
  name: string
  code: string
}

export type GatewayResolveResult = {
  account_name: string
  account_number: string
  bank_code: string
}

export type GatewaySettlement = {
  bank_code: string
  bank_name: string
  account_number_last4: string
  account_name: string
  status: string
  verified_at: string
}

export class GatewayClient {
  private readonly gatewayUrl: string
  private readonly gatewayToken: string

  constructor(options: GatewayClientOptions) {
    this.gatewayUrl = (options.gatewayUrl || "").replace(/\/+$/, "")
    this.gatewayToken = options.gatewayToken || ""
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch(`${this.gatewayUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.gatewayToken}`,
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
      })

      const text = await response.text()
      const json = text ? JSON.parse(text) : {}

      if (!response.ok) {
        const code = json?.error?.code ?? "gateway_error"
        const message = json?.error?.message ?? `Gateway request failed with HTTP ${response.status}`

        if (response.status === 404) {
          throw new MedusaError(MedusaError.Types.NOT_FOUND, message)
        }
        if (response.status === 401) {
          throw new MedusaError(MedusaError.Types.UNAUTHORIZED, message)
        }
        if (response.status === 409) {
          throw new MedusaError(MedusaError.Types.CONFLICT, message)
        }
        if (response.status === 400 || response.status === 422) {
          throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
        }
        throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `[${code}] ${message}`)
      }

      return json as T
    } catch (err: unknown) {
      if (err instanceof MedusaError) throw err
      if ((err as Error)?.name === "AbortError") {
        throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Gateway request timed out after 10s")
      }
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        err instanceof Error ? err.message : "Gateway request failed",
      )
    } finally {
      clearTimeout(timeout)
    }
  }

  async getBanks(): Promise<{ data: GatewayBank[] }> {
    return this.request<{ data: GatewayBank[] }>("/v1/banks")
  }

  async resolveAccount(bankCode: string, accountNumber: string): Promise<GatewayResolveResult> {
    return this.request<GatewayResolveResult>("/v1/accounts/resolve", {
      method: "POST",
      body: JSON.stringify({ bank_code: bankCode, account_number: accountNumber }),
    })
  }

  async getSettlement(): Promise<GatewaySettlement> {
    return this.request<GatewaySettlement>("/v1/settlement")
  }

  async updateSettlement(
    bankCode: string,
    accountNumber: string,
    actor?: string,
  ): Promise<GatewaySettlement> {
    return this.request<GatewaySettlement>("/v1/settlement", {
      method: "PUT",
      headers: actor ? { "x-admin-actor": actor } : {},
      body: JSON.stringify({ bank_code: bankCode, account_number: accountNumber, actor }),
    })
  }

  async initializeTransaction(payload: GatewayInitializePayload): Promise<GatewayInitializeResult> {
    return this.request<GatewayInitializeResult>("/v1/transactions/initialize", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async verifyTransaction(reference: string): Promise<GatewayVerifyResult> {
    return this.request<GatewayVerifyResult>(`/v1/transactions/verify/${encodeURIComponent(reference)}`)
  }

  async getTransaction(reference: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/v1/transactions/${encodeURIComponent(reference)}`)
  }

  async listTransactions(params: Record<string, string | number | undefined>): Promise<Record<string, unknown>> {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value))
      }
    }
    const qs = query.toString()
    return this.request<Record<string, unknown>>(`/v1/transactions${qs ? `?${qs}` : ""}`)
  }

  async refundTransaction(reference: string, amount?: number, reason?: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("/v1/refunds", {
      method: "POST",
      body: JSON.stringify({ reference, amount, reason }),
    })
  }
}
