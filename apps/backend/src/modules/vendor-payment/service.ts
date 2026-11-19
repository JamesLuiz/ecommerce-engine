import { MedusaService } from "@medusajs/framework/utils"
import PaymentProviderConfig from "./models/payment-provider-config"
import SettlementAccount from "./models/settlement-account"

class VendorPaymentModuleService extends MedusaService({
  SettlementAccount,
  PaymentProviderConfig,
}) {}

export default VendorPaymentModuleService

