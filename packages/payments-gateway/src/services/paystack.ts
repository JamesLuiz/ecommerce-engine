import type { Bank } from "../types.js"

export type PaystackResolveResponse = {
  account_name: string
  account_number: string
  bank_id?: number
}

export type PaystackSubaccount = {
  subaccount_code: string
  percentage_charge: number
  settlement_bank: string
  account_name?: string | null
  account_number?: string | null
  bank_id?: number | null
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

type PaystackMeta = {
  next?: string | null
  previous?: string | null
  perPage?: number
}

type PaystackEnvelope<T> = {
  data?: T
  message?: string
  status?: boolean
  meta?: PaystackMeta
}

export class PaystackClient {
  private readonly secretKey: string
  private readonly baseUrl: string

  constructor(secretKey: string, baseUrl: string) {
    this.secretKey = secretKey
    this.baseUrl = baseUrl
  }

  private async requestEnvelope<T>(
    path: string,
    init?: RequestInit,
  ): Promise<PaystackEnvelope<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: init?.body ? String(init.body) : undefined,
    })

    const payload = (await response.json().catch(() => null)) as
      | PaystackEnvelope<T>
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

    return payload
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const payload = await this.requestEnvelope<T>(path, init)

    return payload.data as T
  }

  async listBanks(country = "nigeria", currency?: string): Promise<Bank[]> {
    const perPage = 100
    const banks: Bank[] = []
    const seenCodes = new Set<string>()
    let next: string | null = null
    let page = 0

    // Paystack ignores `page` on /bank and returns the full list every time.
    // Cursor pagination is the documented way to page through the list, and
    // the cursor is returned in `meta.next` (see List Banks in the Paystack API docs).
    do {
      const query = new URLSearchParams({
        country,
        use_cursor: "true",
        perPage: String(perPage),
      })

      if (currency) {
        query.set("currency", currency)
      }

      if (next) {
        query.set("next", next)
      }

      const payload = await this.requestEnvelope<Bank[]>(`/bank?${query.toString()}`)
      const batch = payload.data ?? []

      for (const bank of batch) {
        if (bank.active === false || bank.is_deleted === true) {
          continue
        }

        // Paystack returns a few duplicated codes across the Nigeria list.
        // Duplicate React keys would make the admin bank picker unusable.
        if (seenCodes.has(bank.code)) {
          continue
        }

        seenCodes.add(bank.code)
        banks.push(bank)
      }

      next = payload.meta?.next ?? null
      page += 1
    } while (next && page < 20)

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
    vendor_id: string
    external_ref: string
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
            // Paystack echoes metadata back on charge.* webhooks. `external_ref`
            // is the Medusa payment session id, which the vendor instance needs
            // to attach the event to the right session.
            vendor_id: input.vendor_id,
            external_ref: input.external_ref,
          },
        }),
      },
    )

    return data
  }

  async getBankName(
    bankCode: string,
    country = "nigeria",
    currency?: string,
  ): Promise<string> {
    const banks = await this.listBanks(country, currency)
    const bank = banks.find((candidate) => candidate.code === bankCode)

    if (bank) {
      return bank.name
    }

    // Paystack test mode resolves accounts against bank code 001, which is not
    // part of the live bank list. See "Resolve Account Number" in the Paystack docs.
    if (bankCode === "001") {
      return "Test Bank (Paystack test mode)"
    }

    return bankCode
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
