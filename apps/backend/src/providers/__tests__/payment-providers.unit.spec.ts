import { Modules } from "@medusajs/framework/utils"

import FlutterwaveModule from "../payment-flutterwave"
import PaystackModule from "../payment-paystack"

const { FlutterwavePaymentProvider } = require("../payment-flutterwave")
const { PaystackPaymentProvider } = require("../payment-paystack")

describe("custom payment providers", () => {
  it("exports the Medusa ModuleProvider shape expected by the loader", () => {
    expect(FlutterwaveModule.module).toBe(Modules.PAYMENT)
    expect(PaystackModule.module).toBe(Modules.PAYMENT)
    expect(Array.isArray(FlutterwaveModule.services)).toBe(true)
    expect(Array.isArray(PaystackModule.services)).toBe(true)
  })

  it("registers the expected provider identifiers", () => {
    expect(PaystackPaymentProvider.identifier).toBe("paystack")
    expect(FlutterwavePaymentProvider.identifier).toBe("flutterwave")
  })

  it("requires required gateway credentials", () => {
    expect(() =>
      PaystackPaymentProvider.validateOptions({ publicKey: "", secretKey: "" })
    ).toThrow("Paystack requires a public key and secret key")

    expect(() =>
      FlutterwavePaymentProvider.validateOptions({ publicKey: "", secretKey: "" })
    ).toThrow("Flutterwave requires a public key and secret key")
  })
})
