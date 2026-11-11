import { MedusaService } from "@medusajs/framework/utils"
import SettlementAccount from "./models/settlement-account"

class VendorPaymentModuleService extends MedusaService({
  SettlementAccount,
}) {}

export default VendorPaymentModuleService
