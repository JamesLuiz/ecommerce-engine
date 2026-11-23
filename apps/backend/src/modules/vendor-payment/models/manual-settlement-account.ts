import { model } from "@medusajs/framework/utils"

export const ManualSettlementAccount = model.define("manual_settlement_account", {
  id: model.id({ prefix: "mnacc" }).primaryKey(),
  bank_code: model.text(),
  bank_name: model.text(),
  account_name: model.text(),
  account_number_enc: model.text(),
  account_number_last4: model.text(),
  enabled: model.boolean().default(true),
  verified_at: model.dateTime(),
})

export default ManualSettlementAccount
