import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import PaystackGatewayPaymentProvider from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaystackGatewayPaymentProvider],
})
