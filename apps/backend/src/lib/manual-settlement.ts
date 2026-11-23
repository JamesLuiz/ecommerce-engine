import type { MedusaContainer } from "@medusajs/framework/types"

import { VENDOR_PAYMENT_MODULE } from "../modules/vendor-payment"
import { decryptSecret, encryptSecret } from "./payment-config-crypto"

export const MANUAL_PAYMENT_PROVIDER_ID = "pp_system_default"

export type StoredManualSettlementAccount = {
  id: string
  bank_code: string
  bank_name: string
  account_name: string
  account_number_enc: string
  account_number_last4: string
  enabled: boolean
  verified_at: Date | string
}

export type ManualSettlementAccountInput = {
  bank_code: string
  bank_name: string
  account_name: string
  account_number: string
}

function getService(container: MedusaContainer | Record<string, unknown>): any {
  return (container as any).resolve(VENDOR_PAYMENT_MODULE)
}

export async function getStoredManualSettlementAccount(
  container: MedusaContainer | Record<string, unknown>,
  enabledOnly = false,
): Promise<StoredManualSettlementAccount | null> {
  const service = getService(container)
  const accounts = await service.listManualSettlementAccounts(
    enabledOnly ? { enabled: true } : {},
    { take: 1 },
  )

  return (accounts?.[0] as StoredManualSettlementAccount) ?? null
}

export function decryptManualAccountNumber(
  account: StoredManualSettlementAccount,
): string {
  return decryptSecret(account.account_number_enc)
}

export function toAdminManualAccount(account: StoredManualSettlementAccount) {
  return {
    id: account.id,
    bank_code: account.bank_code,
    bank_name: account.bank_name,
    account_name: account.account_name,
    account_number: decryptManualAccountNumber(account),
    account_number_last4: account.account_number_last4,
    enabled: account.enabled,
    verified_at: account.verified_at,
  }
}

export function toPublicManualAccount(account: StoredManualSettlementAccount) {
  return {
    bank_name: account.bank_name,
    account_name: account.account_name,
    account_number: decryptManualAccountNumber(account),
    account_number_last4: account.account_number_last4,
  }
}

export async function upsertManualSettlementAccount(
  container: MedusaContainer | Record<string, unknown>,
  input: ManualSettlementAccountInput,
): Promise<StoredManualSettlementAccount> {
  const service = getService(container)
  const existing = await getStoredManualSettlementAccount(container)
  const data = {
    bank_code: input.bank_code,
    bank_name: input.bank_name,
    account_name: input.account_name,
    account_number_enc: encryptSecret(input.account_number),
    account_number_last4: input.account_number.slice(-4),
    enabled: true,
    verified_at: new Date(),
  }

  if (existing) {
    return (await service.updateManualSettlementAccounts({
      id: existing.id,
      ...data,
    })) as StoredManualSettlementAccount
  }

  return (await service.createManualSettlementAccounts(
    data,
  )) as StoredManualSettlementAccount
}
