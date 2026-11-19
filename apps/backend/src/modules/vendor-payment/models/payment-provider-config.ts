import { model } from "@medusajs/framework/utils"

export const PaymentProviderConfig = model.define("payment_provider_config", {
  id: model.id({ prefix: "paycfg" }).primaryKey(),
  provider: model.text().default("paystack"),
  mode: model.text().default("platform"),
  public_key: model.text().nullable(),
  secret_key_enc: model.text().nullable(),
  webhook_secret_enc: model.text().nullable(),
  enabled: model.boolean().default(true),
})

export default PaymentProviderConfig
