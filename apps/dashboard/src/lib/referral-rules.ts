import { z } from "zod"

import { getSalesPlan, YEARLY_PLAN } from "./sales-plans"

/** Default earning for legacy orders whose plan is not in the sales catalog. */
export const REFERRAL_BONUS_MINOR = YEARLY_PLAN.referralBonusMinor
export const REFERRAL_CURRENCY = "NGN"

export function referralBonusMinorForPlan(planId: string | null | undefined): number {
  return getSalesPlan(planId)?.referralBonusMinor ?? REFERRAL_BONUS_MINOR
}

/** Set by middleware when a visitor opens /?ref=CODE. */
export const REFERRAL_COOKIE = "flowcheq_referral"

/** Ambiguous characters (0/O, 1/I) are left out so codes survive copy/paste. */
export const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
export const REFERRAL_CODE_LENGTH = 8

export const referralCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-HJ-NP-Z2-9]{8}$/, "Invalid referral code")

export const enrollmentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  bankName: z.string().trim().min(2).max(80),
  accountNumber: z.string().trim().regex(/^\d{10,16}$/, "Enter a 10-16 digit account number"),
})

export type EnrollmentInput = z.infer<typeof enrollmentSchema>

export const settlementRequestSchema = z.object({
  enrollmentId: z.string().uuid(),
  paymentReference: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || null),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => value || null),
})

export type SettlementRequest = z.infer<typeof settlementRequestSchema>

export interface PeriodStarts {
  day: Date
  week: Date
  month: Date
  year: Date
}

/** UTC boundaries: weeks start on Monday, so daily/weekly figures never drift. */
export function periodStarts(now: Date = new Date()): PeriodStarts {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const daysSinceMonday = (day.getUTCDay() + 6) % 7
  const week = new Date(day)
  week.setUTCDate(day.getUTCDate() - daysSinceMonday)

  return {
    day,
    week,
    month: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    year: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
  }
}

export function formatNaira(amountMinor: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: REFERRAL_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100)
}
