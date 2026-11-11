import { ResolveAccountSchema, SettlementSchema } from "../middlewares"

describe("Payment Admin Route Middlewares & Schemas", () => {
  it("validates valid 10-digit account numbers and bank codes", () => {
    const validResolve = ResolveAccountSchema.safeParse({
      bank_code: "058",
      account_number: "0123456789",
    })
    expect(validResolve.success).toBe(true)

    const validSettlement = SettlementSchema.safeParse({
      bank_code: "058",
      account_number: "0123456789",
    })
    expect(validSettlement.success).toBe(true)
  })

  it("rejects non-10-digit account numbers", () => {
    const invalidShort = ResolveAccountSchema.safeParse({
      bank_code: "058",
      account_number: "12345",
    })
    expect(invalidShort.success).toBe(false)

    const invalidLong = ResolveAccountSchema.safeParse({
      bank_code: "058",
      account_number: "0123456789123",
    })
    expect(invalidLong.success).toBe(false)

    const invalidLetters = ResolveAccountSchema.safeParse({
      bank_code: "058",
      account_number: "012345678a",
    })
    expect(invalidLetters.success).toBe(false)
  })
})
