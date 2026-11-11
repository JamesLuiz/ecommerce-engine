import { Module } from "@medusajs/framework/utils"
import VendorPaymentModuleService from "./service"

export const VENDOR_PAYMENT_MODULE = "vendorPayment"

export default Module(VENDOR_PAYMENT_MODULE, {
  service: VendorPaymentModuleService,
})
