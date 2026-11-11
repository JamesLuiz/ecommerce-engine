import { model } from "@medusajs/framework/utils"

export const SettlementAccount = model.define("settlement_account", {
  id: model.id({ prefix: "stacc" }).primaryKey(),
  bank_code: model.text(),
  bank_name: model.text(),
  account_number_last4: model.text(),
  account_name: model.text(),
  status: model.text().default("active"),
  verified_at: model.dateTime(),
})

export default SettlementAccount
