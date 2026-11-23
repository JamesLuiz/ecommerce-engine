import { MedusaService } from "@medusajs/framework/utils"
import ManualPayment from "./models/manual-payment"
import ManualSettlementAccount from "./models/manual-settlement-account"
import PaymentProviderConfig from "./models/payment-provider-config"
import SettlementAccount from "./models/settlement-account"

class VendorPaymentModuleService extends MedusaService({
  SettlementAccount,
  PaymentProviderConfig,
  ManualSettlementAccount,
  ManualPayment,
}) {}

export default VendorPaymentModuleService

