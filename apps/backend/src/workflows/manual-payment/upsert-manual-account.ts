import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"

import {
  getStoredManualSettlementAccount,
  toAdminManualAccount,
  upsertManualSettlementAccount,
} from "../../lib/manual-settlement"
import { VENDOR_PAYMENT_MODULE } from "../../modules/vendor-payment"
import { resolveGatewayClient } from "../../lib/payment-provider-config"

export type UpsertManualAccountInput = {
  bank_code: string
  account_number: string
}

const verifyAndSaveManualAccountStep = createStep(
  "verify-and-save-manual-account",
  async (input: UpsertManualAccountInput, { container }) => {
    const client = await resolveGatewayClient(container)

    const [resolved, banks] = await Promise.all([
      client.resolveAccount(input.bank_code, input.account_number),
      client.getBanks(),
    ])

    const accountName = (resolved.account_name ?? "").trim()
    const bankName = banks.data?.find((bank) => bank.code === input.bank_code)?.name

    if (!accountName) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Paystack could not verify this account number.",
      )
    }

    if (!bankName) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The selected bank could not be found.",
      )
    }

    const previous = await getStoredManualSettlementAccount(container)

    const saved = await upsertManualSettlementAccount(container, {
      bank_code: input.bank_code,
      bank_name: bankName,
      account_name: accountName,
      account_number: input.account_number,
    })

    return new StepResponse(toAdminManualAccount(saved), {
      previous,
      savedId: saved.id,
    })
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return
    }

    const { previous, savedId } = compensation

    const service = container.resolve(VENDOR_PAYMENT_MODULE)

    if (!previous) {
      await service.deleteManualSettlementAccounts(savedId)
      return
    }

    await service.updateManualSettlementAccounts({
      id: previous.id,
      bank_code: previous.bank_code,
      bank_name: previous.bank_name,
      account_name: previous.account_name,
      account_number_enc: previous.account_number_enc,
      account_number_last4: previous.account_number_last4,
      enabled: previous.enabled,
      verified_at: new Date(previous.verified_at),
    })
  },
)

export const upsertManualAccountWorkflow = createWorkflow(
  "upsert-manual-account",
  (input: UpsertManualAccountInput) => {
    const account = verifyAndSaveManualAccountStep(input)
    return new WorkflowResponse(account)
  },
)
