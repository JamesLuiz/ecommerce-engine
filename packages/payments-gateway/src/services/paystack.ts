import type { Bank } from "../types.js"

export type PaystackResolveResponse = {
  account_name: string
  account_number: string
  bank_id?: number
}

export type PaystackSubaccount = {
  account_code: string
  percentage_charge: number
  settlement_bank: string
  bank_account_name?: string | null
  metadata?: Record<string, unknown> | null
}

export type PaystackInitializeResponse = {
  reference: string
  authorization_url: string
  access_code: string
}

export type PaystackVerifyResponse = {
  status: "success" | "failed"
  amount: number
  currency: string
  paid_at: string | null
  channel: string | null
}

export type PaystackRefundResponse = {
  reference: string
  status: string
  amount: number
  message?: string
}

type PaystackEnvelope<T> = {
  data?: T
  message?: string
  status?: boolean
}

export class PaystackClient {
  private readonly secretKey: string
  private readonly baseUrl: string

  constructor(secretKey: string, baseUrl: string) {
    this.secretKey = secretKey
    this.baseUrl = baseUrl
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: init?.body ? String(init.body) : undefined,
    })

    const payload = (await response.json().catch(() => null)) as
      | (PaystackEnvelope<T> & { message?: string })
      | null

    if (!response.ok || payload?.status === false) {
      throw new Error(
        `Paystack request failed for ${path}: ${
          payload?.message ?? `HTTP ${response.status}`
        }`,
      )
    }

    if (!payload?.data) {
      throw new Error(`Paystack returned no data for ${path}`)
    }

    return payload.data
  }

  async listBanks(country = "nigeria"): Promise<Bank[]> {
    const perPage = 100
    const banks: Bank[] = []
    let page = 1

    while (page <= 20) {
      const batch = await this.request<Bank[]>(
        `/bank?country=${encodeURIComponent(country)}&perPage=${perPage}&page=${page}`,
      )

      banks.push(...batch)

      if (batch.length < perPage) {
        break
      }

      page += 1
    }

    return banks
  }

  async resolveAccount(
    bankCode: string,
    accountNumber: string,
  ): Promise<PaystackResolveResponse> {
    const query = new URLSearchParams({
      account_number: accountNumber,
      bank_code: bankCode,
    })

    const data = await this.request<PaystackResolveResponse>(
      `/bank/resolve?${query.toString()}`,
    )

    return data
  }

  async createSubaccount(input: {
    business_name: string
    settlement_bank: string
    account_number: string
    percentage_charge: number
  }): Promise<PaystackSubaccount> {
    const data = await this.request<PaystackSubaccount>("/subaccount", {
      method: "POST",
      body: JSON.stringify(input),
    })

    return data
  }

  async updateSubaccount(
    accountCode: string,
    input: {
      business_name: string
      settlement_bank: string
      account_number: string
      percentage_charge: number
    },
  ): Promise<PaystackSubaccount> {
    const data = await this.request<PaystackSubaccount>(
      `/subaccount/${encodeURIComponent(accountCode)}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
    )

    return data
  }

  async initialize(input: {
    email: string
    amount: number
    currency: string
    reference: string
    callback_url: string
    subaccount: string
  }): Promise<PaystackInitializeResponse> {
    const data = await this.request<PaystackInitializeResponse>(
      "/transaction/initialize",
      {
        method: "POST",
        body: JSON.stringify({
          email: input.email,
          amount: input.amount,
          currency: input.currency,
          reference: input.reference,
          callback_url: input.callback_url,
          subaccount: input.subaccount,
          bearer: "subaccount",
          metadata: {
            gateway: "flowcheq",
            callback_source: "medusa",
          },
        }),
      },
    )

    return data
  }

  async getBankName(bankCode: string): Promise<string> {
    const banks = await this.listBanks()
    const bank = banks.find((candidate) => candidate.code === bankCode)

    return bank?.name ?? bankCode
  }

  async verify(reference: string): Promise<PaystackVerifyResponse> {
    const data = await this.request<PaystackVerifyResponse>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
    )

    return data
  }

  async refund(
    reference: string,
    amount: number,
    reason: string,
  ): Promise<PaystackRefundResponse> {
    const data = await this.request<PaystackRefundResponse>("/refund", {
      method: "POST",
      body: JSON.stringify({ reference, amount, reason }),
    })

    return data
  }
}

export const createPaystackClient = (): PaystackClient =>
  new PaystackClient(
    process.env.PAYSTACK_SECRET_KEY ?? "",
    process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co",
  )
