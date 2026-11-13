import { describe, expect, it } from "vitest"
import { countryForCurrency, isPaystackTestKey } from "../src/services/banks"

describe("bank helpers", () => {
  it("maps a vendor currency to a Paystack country", () => {
    expect(countryForCurrency("NGN")).toBe("nigeria")
    expect(countryForCurrency("ghs")).toBe("ghana")
    expect(countryForCurrency("KES")).toBe("kenya")
    expect(countryForCurrency("ZAR")).toBe("south africa")
    expect(countryForCurrency("EUR")).toBe("nigeria")
  })

  it("detects Paystack test keys", () => {
    expect(isPaystackTestKey("sk_test_abc")).toBe(true)
    expect(isPaystackTestKey("sk_live_abc")).toBe(false)
  })
})
