import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  getStoredManualSettlementAccount,
  toPublicManualAccount,
} from "../../../lib/manual-settlement"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const account = await getStoredManualSettlementAccount(req.scope, true)

  res.json({ account: account ? toPublicManualAccount(account) : null })
}
