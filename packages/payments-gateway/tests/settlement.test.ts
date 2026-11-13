import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const { unsafe } = vi.hoisted(() => ({ unsafe: vi.fn() }))

vi.mock("../src/db.js", () => ({ db: { unsafe } }))

import { saveSettlement } from "../src/services/settlement"
import type { PaystackClient } from "../src/services/paystack"

const vendorId = "6f6c3e8e-3c2a-4f2a-9f3f-1f6a3f0a5c11"

const vendorRow = {
  id: vendorId,
  slug: "acme-store",
  name: "Acme Store",
  status: "active",
  token_hash: "hash",
  webhook_url: "https://acme.example.com/hooks/payment/paystack-gateway",
  allowed_origins: [],
  currency: "NGN",
  created_at: new Date(),
  updated_at: new Date(),
}

const existingSettlementRow = {
  vendor_id: vendorId,
  bank_code: "011",
  bank_name: "First Bank",
  account_number_last4: "1111",
  account_name: "OLD ACCOUNT NAME",
  subaccount_code: "ACCT_OLD",
  status: "active",
  verified_at: new Date("2026-01-01T00:00:00.000Z"),
  updated_at: new Date("2026-01-01T00:00:00.000Z"),
}

type DbOptions = {
  vendor?: Record<string, unknown> | null
  existing?: Record<string, unknown> | null
}

const mockDb = ({ vendor = vendorRow, existing = null }: DbOptions = {}): void => {
  unsafe.mockImplementation(async (sql: string, params?: unknown[]) => {
    if (sql.includes("from vendors where id")) {
      return vendor ? [vendor] : []
    }

    if (sql.includes("insert into settlements")) {
      const [id, bankCode, bankName, last4, accountName, subaccountCode, now] =
        params as unknown[]

      return [
        {
          vendor_id: id,
          bank_code: bankCode,
          bank_name: bankName,
          account_number_last4: last4,
          account_name: accountName,
          subaccount_code: subaccountCode,
          status: "active",
          verified_at: now,
          updated_at: now,
        },
      ]
    }

    if (sql.includes("from settlements")) {
      return existing ? [existing] : []
    }

    return []
  })
}

const fakeClient = (): PaystackClient =>
  ({
    resolveAccount: vi.fn(async () => ({
      account_name: "ACME LIMITED",
      account_number: "0123456789",
      bank_id: 9,
    })),
    createSubaccount: vi.fn(async () => ({
      subaccount_code: "ACCT_123",
      percentage_charge: 0,
      settlement_bank: "GTBank",
      account_name: "ACME LIMITED",
    })),
    updateSubaccount: vi.fn(async () => ({
      subaccount_code: "ACCT_OLD",
      percentage_charge: 0,
      settlement_bank: "GTBank",
      account_name: "ACME LIMITED",
    })),
    getBankName: vi.fn(async () => "GTBank"),
  }) as unknown as PaystackClient

describe("saveSettlement", () => {
  beforeAll(() => {
    process.env.DATABASE_URL = "postgres://gateway:gateway@localhost:5432/gateway"
    process.env.PAYSTACK_SECRET_KEY = "sk_test_abc"
    process.env.ADMIN_TOKEN = "admin"
    process.env.WEBHOOK_SIGNING_ROOT = "root"
    process.env.SETTLEMENT_CHANGE_COOLDOWN_HOURS = "0"
  })

  beforeEach(() => {
    unsafe.mockReset()
  })

  it("creates a subaccount with the bank code and a zero percentage charge", async () => {
    mockDb()
    const client = fakeClient()

    const settlement = await saveSettlement(client, vendorId, {
      bank_code: "058",
      account_number: "0123456789",
      actor: "admin",
    })

    expect(client.createSubaccount).toHaveBeenCalledWith({
      business_name: "Acme Store",
      settlement_bank: "058",
      account_number: "0123456789",
      percentage_charge: 0,
    })

    expect(settlement.subaccount_code).toBe("ACCT_123")
    expect(settlement.bank_name).toBe("GTBank")
    expect(settlement.account_number_last4).toBe("6789")
    expect(settlement.account_name).toBe("ACME LIMITED")

    const auditCall = unsafe.mock.calls.find(([sql]) =>
      String(sql).includes("settlement_audit"),
    )

    expect(auditCall?.[1]).toEqual([
      vendorId,
      "created",
      "058",
      "6789",
      "ACME LIMITED",
      "admin",
    ])
  })

  it("falls back to subaccount validation when test mode resolve is rate-limited", async () => {
    mockDb()
    const client = fakeClient()

    vi.mocked(client.resolveAccount).mockRejectedValue(
      new Error(
        "Paystack request failed for /bank/resolve: Test mode daily limit of 3 live bank resolves exceeded. Use test bank codes 001 or upgrade to live mode.",
      ),
    )

    const settlement = await saveSettlement(client, vendorId, {
      bank_code: "058",
      account_number: "0000000001",
      actor: "admin",
    })

    expect(client.createSubaccount).toHaveBeenCalledWith({
      business_name: "Acme Store",
      settlement_bank: "058",
      account_number: "0000000001",
      percentage_charge: 0,
    })
    expect(settlement.account_name).toBe("ACME LIMITED")
    expect(settlement.bank_name).toBe("GTBank")
  })

  it("updates the existing subaccount and audits the change", async () => {
    mockDb({ existing: existingSettlementRow })
    const client = fakeClient()

    const settlement = await saveSettlement(client, vendorId, {
      bank_code: "058",
      account_number: "0123456789",
      actor: "admin",
    })

    expect(client.updateSubaccount).toHaveBeenCalledWith("ACCT_OLD", {
      business_name: "Acme Store",
      settlement_bank: "058",
      account_number: "0123456789",
      percentage_charge: 0,
    })
    expect(client.createSubaccount).not.toHaveBeenCalled()
    expect(settlement.subaccount_code).toBe("ACCT_OLD")

    const auditCall = unsafe.mock.calls.find(([sql]) =>
      String(sql).includes("settlement_audit"),
    )

    expect((auditCall?.[1] as unknown[])[1]).toBe("updated")
  })

  it("rejects changes inside the cooldown window", async () => {
    process.env.SETTLEMENT_CHANGE_COOLDOWN_HOURS = "24"
    mockDb({ existing: { ...existingSettlementRow, updated_at: new Date() } })
    const client = fakeClient()

    await expect(
      saveSettlement(client, vendorId, {
        bank_code: "058",
        account_number: "0123456789",
        actor: "admin",
      }),
    ).rejects.toMatchObject({ code: "settlement_cooldown", status: 429 })

    expect(client.createSubaccount).not.toHaveBeenCalled()
    expect(client.updateSubaccount).not.toHaveBeenCalled()

    process.env.SETTLEMENT_CHANGE_COOLDOWN_HOURS = "0"
  })

  it("refuses to save a settlement for a suspended vendor", async () => {
    mockDb({ vendor: { ...vendorRow, status: "suspended" } })
    const client = fakeClient()

    await expect(
      saveSettlement(client, vendorId, {
        bank_code: "058",
        account_number: "0123456789",
        actor: "admin",
      }),
    ).rejects.toMatchObject({ code: "vendor_suspended", status: 403 })
  })

  it("does not touch Paystack when the account cannot be resolved", async () => {
    mockDb()

    const client = {
      resolveAccount: vi.fn(async () => {
        throw new Error("Could not resolve account name")
      }),
      createSubaccount: vi.fn(),
      updateSubaccount: vi.fn(),
      getBankName: vi.fn(),
    } as unknown as PaystackClient

    await expect(
      saveSettlement(client, vendorId, {
        bank_code: "058",
        account_number: "0123456789",
        actor: "admin",
      }),
    ).rejects.toMatchObject({ code: "account_resolve_failed", status: 422 })

    expect(client.createSubaccount).not.toHaveBeenCalled()
  })
})
