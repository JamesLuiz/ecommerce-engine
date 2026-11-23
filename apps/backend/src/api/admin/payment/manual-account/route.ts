import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  getStoredManualSettlementAccount,
  toAdminManualAccount,
} from "../../../../lib/manual-settlement"
import { upsertManualAccountWorkflow } from "../../../../workflows/manual-payment/upsert-manual-account"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const account = await getStoredManualSettlementAccount(req.scope)

  res.json({ account: account ? toAdminManualAccount(account) : null })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as {
    bank_code: string
    account_number: string
  }

  const { result } = await upsertManualAccountWorkflow(req.scope).run({
    input: body,
  })

  res.json({ account: result })
}
