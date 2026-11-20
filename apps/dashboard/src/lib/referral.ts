import "server-only"

import { randomBytes } from "node:crypto"

import { and, desc, eq, inArray, isNull } from "drizzle-orm"
import { cookies, headers } from "next/headers"

import {
  customers,
  decrypt,
  encrypt,
  orders,
  referral_earnings,
  referral_enrollments,
  referral_settlements,
  type Order,
  type ReferralEnrollment,
} from "@flowcheq/db"
import { recordAudit } from "@lib/audit"
import { db } from "@lib/db"
import {
  REFERRAL_BONUS_MINOR,
  REFERRAL_CODE_ALPHABET,
  REFERRAL_CODE_LENGTH,
  REFERRAL_COOKIE,
  REFERRAL_CURRENCY,
  periodStarts,
  referralCodeSchema,
  type EnrollmentInput,
  type SettlementRequest,
} from "./referral-rules"

function createReferralCode(): string {
  const bytes = randomBytes(REFERRAL_CODE_LENGTH)
  let code = ""
  for (let index = 0; index < REFERRAL_CODE_LENGTH; index += 1) {
    code += REFERRAL_CODE_ALPHABET[(bytes[index] ?? 0) % REFERRAL_CODE_ALPHABET.length]
  }
  return code
}

async function getPublicOrigin(request?: Request): Promise<string> {
  const configured = process.env.DASHBOARD_PUBLIC_URL?.trim().replace(/\/+$/, "")
  if (configured) return configured

  const requestHeaders = request ? request.headers : await headers()
  const host =
    requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    requestHeaders.get("host")?.trim()
  const protocol =
    requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (request ? new URL(request.url).protocol.replace(/:$/, "") : "https")

  return host ? `${protocol}://${host}` : "http://localhost:3000"
}

function linksFor(enrollment: ReferralEnrollment, origin: string) {
  return {
    referralUrl: `${origin}/?ref=${encodeURIComponent(enrollment.code)}`,
    meUrl: `${origin}/me?access=${encodeURIComponent(enrollment.access_token)}`,
  }
}

export interface EnrollmentResult {
  enrollment: ReferralEnrollment
  referralUrl: string
  meUrl: string
  alreadyEnrolled: boolean
}

/** Idempotent per email: a repeat submission returns the original links. */
export async function enrollReferral(
  input: EnrollmentInput,
  request?: Request
): Promise<EnrollmentResult> {
  const origin = await getPublicOrigin(request)

  const findByEmail = async () =>
    (
      await db
        .select()
        .from(referral_enrollments)
        .where(eq(referral_enrollments.email, input.email))
        .limit(1)
    )[0]

  const existing = await findByEmail()
  if (existing) {
    return { ...linksFor(existing, origin), enrollment: existing, alreadyEnrolled: true }
  }

  const accountNumberEnc = encrypt(input.accountNumber)

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [created] = await db
      .insert(referral_enrollments)
      .values({
        name: input.name,
        email: input.email,
        bank_name: input.bankName,
        account_number_enc: accountNumberEnc,
        code: createReferralCode(),
        access_token: randomBytes(32).toString("hex"),
        status: "active",
      })
      .onConflictDoNothing()
      .returning()

    if (created) {
      await recordAudit({
        actor: "public-referral",
        action: "referral.enrolled",
        meta: { enrollmentId: created.id, email: created.email },
      })
      return { ...linksFor(created, origin), enrollment: created, alreadyEnrolled: false }
    }

    const raced = await findByEmail()
    if (raced) {
      return { ...linksFor(raced, origin), enrollment: raced, alreadyEnrolled: true }
    }
  }

  throw new Error("Could not allocate a unique referral code")
}

export async function findReferralByCode(rawCode: string): Promise<ReferralEnrollment | null> {
  const parsed = referralCodeSchema.safeParse(rawCode)
  if (!parsed.success) return null

  const rows = await db
    .select()
    .from(referral_enrollments)
    .where(
      and(
        eq(referral_enrollments.code, parsed.data),
        eq(referral_enrollments.status, "active")
      )
    )
    .limit(1)

  return rows[0] ?? null
}

export async function findReferralByAccessToken(token: string): Promise<ReferralEnrollment | null> {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null

  const rows = await db
    .select()
    .from(referral_enrollments)
    .where(
      and(
        eq(referral_enrollments.access_token, token),
        eq(referral_enrollments.status, "active")
      )
    )
    .limit(1)

  return rows[0] ?? null
}

/** Middleware stores the code in an httpOnly cookie when /?ref=CODE is opened. */
export async function getStoredReferralCode(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(REFERRAL_COOKIE)?.value ?? null
}

export async function resolveReferralForCheckout(
  rawCode: string | null | undefined
): Promise<ReferralEnrollment | null> {
  const code = rawCode?.trim()
  if (!code) return null
  return findReferralByCode(code)
}

export interface CreditReferralResult {
  credited: boolean
  reason?: string
  earningId?: string
}

/**
 * Credits one bonus for a paid referred order. Safe to call on every paid-path
 * invocation: the unique order constraint absorbs duplicate webhooks.
 */
export async function creditReferralForOrder(
  order: Order,
  options: { actor?: string } = {}
): Promise<CreditReferralResult> {
  if (order.status !== "paid") return { credited: false, reason: "order_not_paid" }
  if (!order.referral_enrollment_id) return { credited: false, reason: "no_referral" }

  const rows = await db
    .select({
      enrollmentEmail: referral_enrollments.email,
      customerEmail: customers.email,
    })
    .from(orders)
    .innerJoin(
      referral_enrollments,
      eq(orders.referral_enrollment_id, referral_enrollments.id)
    )
    .innerJoin(customers, eq(orders.customer_id, customers.id))
    .where(eq(orders.id, order.id))
    .limit(1)

  const link = rows[0]
  if (!link) return { credited: false, reason: "enrollment_missing" }

  if (link.enrollmentEmail.toLowerCase() === link.customerEmail.toLowerCase()) {
    await recordAudit({
      actor: options.actor ?? "referral-credit",
      action: "referral.skipped_self",
      meta: { orderId: order.id },
    })
    return { credited: false, reason: "self_referral" }
  }

  const [earning] = await db
    .insert(referral_earnings)
    .values({
      enrollment_id: order.referral_enrollment_id,
      order_id: order.id,
      customer_id: order.customer_id,
      amount_minor: REFERRAL_BONUS_MINOR,
      currency: REFERRAL_CURRENCY,
    })
    .onConflictDoNothing()
    .returning({ id: referral_earnings.id })

  if (!earning) return { credited: false, reason: "already_credited" }

  await recordAudit({
    actor: options.actor ?? "payment-webhook",
    action: "referral.credited",
    meta: {
      orderId: order.id,
      enrollmentId: order.referral_enrollment_id,
      amountMinor: REFERRAL_BONUS_MINOR,
    },
  })

  return { credited: true, earningId: earning.id }
}

interface EarningWithOrder {
  id: string
  amountMinor: number
  createdAt: Date
  settled: boolean
  paymentReference: string
  customerName: string | null
  customerEmail: string
}

async function listEarnings(enrollmentId: string): Promise<EarningWithOrder[]> {
  const rows = await db
    .select({
      id: referral_earnings.id,
      amountMinor: referral_earnings.amount_minor,
      createdAt: referral_earnings.created_at,
      settled: referral_earnings.settlement_id,
      paymentReference: orders.provider_reference,
      customerName: customers.name,
      customerEmail: customers.email,
    })
    .from(referral_earnings)
    .innerJoin(orders, eq(referral_earnings.order_id, orders.id))
    .innerJoin(customers, eq(referral_earnings.customer_id, customers.id))
    .where(eq(referral_earnings.enrollment_id, enrollmentId))
    .orderBy(desc(referral_earnings.created_at))

  return rows.map((row) => ({ ...row, settled: row.settled !== null }))
}

export interface ReferralDashboard {
  referralUrl: string
  meUrl: string
  joinedAt: Date
  totalReferrals: number
  totalEarnedMinor: number
  settledMinor: number
  unsettledMinor: number
  periods: Array<{ key: "day" | "week" | "month" | "year"; label: string; amountMinor: number }>
  recent: EarningWithOrder[]
  settlements: Array<{
    id: string
    amountMinor: number
    paymentReference: string | null
    createdAt: Date
    settledBy: string
  }>
}

export async function getReferralDashboard(
  enrollment: ReferralEnrollment
): Promise<ReferralDashboard> {
  const origin = await getPublicOrigin()
  const earnings = await listEarnings(enrollment.id)

  const settlements = await db
    .select({
      id: referral_settlements.id,
      amountMinor: referral_settlements.amount_minor,
      paymentReference: referral_settlements.payment_reference,
      createdAt: referral_settlements.created_at,
      settledBy: referral_settlements.settled_by,
    })
    .from(referral_settlements)
    .where(eq(referral_settlements.enrollment_id, enrollment.id))
    .orderBy(desc(referral_settlements.created_at))

  const starts = periodStarts()
  const periodLabels = {
    day: "Today",
    week: "This week",
    month: "This month",
    year: "This year",
  } as const

  return {
    ...linksFor(enrollment, origin),
    joinedAt: enrollment.created_at,
    totalReferrals: earnings.length,
    totalEarnedMinor: earnings.reduce((total, row) => total + row.amountMinor, 0),
    settledMinor: earnings.filter((row) => row.settled).reduce((total, row) => total + row.amountMinor, 0),
    unsettledMinor: earnings.filter((row) => !row.settled).reduce((total, row) => total + row.amountMinor, 0),
    periods: (Object.keys(starts) as Array<keyof typeof starts>).map((key) => ({
      key,
      label: periodLabels[key],
      amountMinor: earnings
        .filter((row) => row.createdAt >= starts[key])
        .reduce((total, row) => total + row.amountMinor, 0),
    })),
    recent: earnings.slice(0, 10),
    settlements: settlements.slice(0, 10),
  }
}

export interface SettlementRow {
  enrollmentId: string
  name: string
  email: string
  bankName: string
  accountNumber: string
  joinedAt: Date
  totalReferrals: number
  unsettledReferrals: number
  totalEarnedMinor: number
  unsettledMinor: number
  settledMinor: number
  earnings: EarningWithOrder[]
  settlements: Array<{
    id: string
    amountMinor: number
    paymentReference: string | null
    notes: string | null
    settledBy: string
    createdAt: Date
  }>
}

export interface SettlementOverview {
  enrolledCount: number
  totalUnsettledMinor: number
  totalSettledMinor: number
  rows: SettlementRow[]
}

function readableAccountNumber(ciphertext: string): string {
  try {
    return decrypt(ciphertext)
  } catch {
    return "Unavailable"
  }
}

export async function getSettlementOverview(): Promise<SettlementOverview> {
  const enrollments = await db
    .select()
    .from(referral_enrollments)
    .orderBy(desc(referral_enrollments.created_at))

  const earningRows = await db
    .select({
      enrollmentId: referral_earnings.enrollment_id,
      id: referral_earnings.id,
      amountMinor: referral_earnings.amount_minor,
      createdAt: referral_earnings.created_at,
      settled: referral_earnings.settlement_id,
      paymentReference: orders.provider_reference,
      customerName: customers.name,
      customerEmail: customers.email,
    })
    .from(referral_earnings)
    .innerJoin(orders, eq(referral_earnings.order_id, orders.id))
    .innerJoin(customers, eq(referral_earnings.customer_id, customers.id))
    .orderBy(desc(referral_earnings.created_at))

  const settlementRows = await db
    .select()
    .from(referral_settlements)
    .orderBy(desc(referral_settlements.created_at))

  const earningsByEnrollment = new Map<string, EarningWithOrder[]>()
  for (const row of earningRows) {
    const list = earningsByEnrollment.get(row.enrollmentId) ?? []
    list.push({
      id: row.id,
      amountMinor: row.amountMinor,
      createdAt: row.createdAt,
      settled: row.settled !== null,
      paymentReference: row.paymentReference,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
    })
    earningsByEnrollment.set(row.enrollmentId, list)
  }

  const settlementsByEnrollment = new Map<string, SettlementRow["settlements"]>()
  for (const row of settlementRows) {
    const list = settlementsByEnrollment.get(row.enrollment_id) ?? []
    list.push({
      id: row.id,
      amountMinor: row.amount_minor,
      paymentReference: row.payment_reference,
      notes: row.notes,
      settledBy: row.settled_by,
      createdAt: row.created_at,
    })
    settlementsByEnrollment.set(row.enrollment_id, list)
  }

  const rows = enrollments.map((enrollment) => {
    const earnings = earningsByEnrollment.get(enrollment.id) ?? []
    const unsettled = earnings.filter((row) => !row.settled)
    const totalEarnedMinor = earnings.reduce((total, row) => total + row.amountMinor, 0)
    const unsettledMinor = unsettled.reduce((total, row) => total + row.amountMinor, 0)

    return {
      enrollmentId: enrollment.id,
      name: enrollment.name,
      email: enrollment.email,
      bankName: enrollment.bank_name,
      accountNumber: readableAccountNumber(enrollment.account_number_enc),
      joinedAt: enrollment.created_at,
      totalReferrals: earnings.length,
      unsettledReferrals: unsettled.length,
      totalEarnedMinor,
      unsettledMinor,
      settledMinor: totalEarnedMinor - unsettledMinor,
      earnings,
      settlements: settlementsByEnrollment.get(enrollment.id) ?? [],
    }
  })

  return {
    enrolledCount: rows.length,
    totalUnsettledMinor: rows.reduce((total, row) => total + row.unsettledMinor, 0),
    totalSettledMinor: rows.reduce((total, row) => total + row.settledMinor, 0),
    rows,
  }
}

export type SettleReferralResult =
  | { ok: true; settlementId: string; amountMinor: number; referralCount: number }
  | { ok: false; error: string }

/** Settles every currently unsettled earning for one enrollee in one run. */
export async function settleReferralEarnings(
  input: SettlementRequest,
  staffEmail: string
): Promise<SettleReferralResult> {
  const result = await db.transaction(async (tx) => {
    const enrollmentRows = await tx
      .select({ id: referral_enrollments.id })
      .from(referral_enrollments)
      .where(eq(referral_enrollments.id, input.enrollmentId))
      .limit(1)

    if (!enrollmentRows[0]) {
      return { ok: false as const, error: "Referral enrollee not found" }
    }

    const pending = await tx
      .select()
      .from(referral_earnings)
      .where(
        and(
          eq(referral_earnings.enrollment_id, input.enrollmentId),
          isNull(referral_earnings.settlement_id)
        )
      )
      .for("update")

    if (pending.length === 0) {
      return { ok: false as const, error: "This enrollee has no unsettled bonuses" }
    }

    const amountMinor = pending.reduce((total, row) => total + row.amount_minor, 0)
    const [settlement] = await tx
      .insert(referral_settlements)
      .values({
        enrollment_id: input.enrollmentId,
        amount_minor: amountMinor,
        currency: REFERRAL_CURRENCY,
        payment_reference: input.paymentReference,
        notes: input.notes,
        settled_by: staffEmail,
      })
      .returning({ id: referral_settlements.id })

    await tx
      .update(referral_earnings)
      .set({ settlement_id: settlement.id, settled_at: new Date() })
      .where(
        and(
          inArray(
            referral_earnings.id,
            pending.map((row) => row.id)
          ),
          isNull(referral_earnings.settlement_id)
        )
      )

    return {
      ok: true as const,
      settlementId: settlement.id,
      amountMinor,
      referralCount: pending.length,
    }
  })

  if (result.ok) {
    await recordAudit({
      actor: staffEmail,
      action: "referral.settled",
      meta: {
        settlementId: result.settlementId,
        enrollmentId: input.enrollmentId,
        amountMinor: result.amountMinor,
        paymentReference: input.paymentReference,
      },
    })
  }

  return result
}
