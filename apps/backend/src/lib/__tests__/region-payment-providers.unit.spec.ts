import {
  hasPaymentProvidersConverged,
  mergePaymentProviderIds,
  PAYMENT_PROVIDERS_CONVERGED_KEY,
} from "../region-payment-providers"

describe("region payment provider convergence", () => {
  it("recognizes the convergence marker in both boolean and string form", () => {
    expect(hasPaymentProvidersConverged({ [PAYMENT_PROVIDERS_CONVERGED_KEY]: true })).toBe(true)
    expect(hasPaymentProvidersConverged({ [PAYMENT_PROVIDERS_CONVERGED_KEY]: "true" })).toBe(true)
    expect(hasPaymentProvidersConverged({ [PAYMENT_PROVIDERS_CONVERGED_KEY]: false })).toBe(false)
    expect(hasPaymentProvidersConverged(null)).toBe(false)
  })

  it("adds enabled providers without dropping a merchant selection", () => {
    expect(
      mergePaymentProviderIds(
        ["pp_system_default", "pp_custom"],
        ["pp_system_default", "pp_paystack-gateway_paystack-gateway"]
      )
    ).toEqual([
      "pp_system_default",
      "pp_custom",
      "pp_paystack-gateway_paystack-gateway",
    ])
  })

  it("does not duplicate providers that are already selected", () => {
    const providers = ["pp_system_default", "pp_paystack-gateway_paystack-gateway"]

    expect(mergePaymentProviderIds(providers, providers)).toEqual(providers)
  })
})
