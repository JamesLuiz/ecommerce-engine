import { describe, expect, it } from "vitest"

import {
  REFERRAL_BONUS_MINOR,
  enrollmentSchema,
  formatNaira,
  periodStarts,
  referralCodeSchema,
  settlementRequestSchema,
} from "../referral-rules"

describe("referral rules", () => {
  it("accepts generated codes and rejects ambiguous characters", () => {
    expect(referralCodeSchema.safeParse("A2B3C4D5").success).toBe(true)
    expect(referralCodeSchema.safeParse("A2B3C4O5").success).toBe(false)
    expect(referralCodeSchema.safeParse("a2b3c4d5").success).toBe(false)
    expect(referralCodeSchema.safeParse("SHORT").success).toBe(false)
  })

  it("normalises enrolment emails and validates account numbers", () => {
    const parsed = enrollmentSchema.safeParse({
      name: " Adaeze Okafor ",
      email: " Adaeze@Example.COM ",
      bankName: "Access Bank",
      accountNumber: "0123456789",
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.email).toBe("adaeze@example.com")
      expect(parsed.data.name).toBe("Adaeze Okafor")
    }

    expect(
      enrollmentSchema.safeParse({
        name: "Adaeze Okafor",
        email: "adaeze@example.com",
        bankName: "Access Bank",
        accountNumber: "1234",
      }).success
    ).toBe(false)
  })

  it("turns blank settlement references into null", () => {
    const parsed = settlementRequestSchema.safeParse({
      enrollmentId: "1b4e28ba-2fa1-4a1b-8a3c-9f6a1b2c3d4e",
      paymentReference: "   ",
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.paymentReference).toBeNull()
      expect(parsed.data.notes).toBeNull()
    }
  })

  it("uses UTC Monday for weekly totals", () => {
    const starts = periodStarts(new Date("2026-11-20T14:37:00.000Z"))

    expect(starts.day.toISOString()).toBe("2026-11-20T00:00:00.000Z")
    expect(starts.week.toISOString()).toBe("2026-11-16T00:00:00.000Z")
    expect(starts.month.toISOString()).toBe("2026-11-01T00:00:00.000Z")
    expect(starts.year.toISOString()).toBe("2026-01-01T00:00:00.000Z")
  })

  it("formats the NGN 18,000 bonus in whole naira", () => {
    expect(REFERRAL_BONUS_MINOR).toBe(1_800_000)
    expect(formatNaira(REFERRAL_BONUS_MINOR)).toContain("18,000")
  })
})
