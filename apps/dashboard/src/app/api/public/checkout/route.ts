import { randomBytes } from "node:crypto"

import { hash } from "@node-rs/argon2"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

import { customers, orders, plans } from "@flowcheq/db"
import { TenantConfig } from "@flowcheq/tenant-config"
import { recordAudit } from "@lib/audit"
import { db } from "@lib/db"
import { getStoredReferralCode, resolveReferralForCheckout } from "@lib/referral"

export const dynamic = "force-dynamic"

const CheckoutBody = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  businessName: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(3).max(32).optional(),
  planId: z.string().min(1).max(64).optional(),
  currency: z.string().length(3).optional(),
  region: z.enum(["ng", "us", "eu"]).optional(),
  referralCode: z.string().trim().max(16).optional(),
})

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
}

function randomReference() {
  return `fc_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`
}

async function ensurePlan(planId: string, currency: string) {
  // Current price: NGN 154,900/yr = 15,490,000 kobo. Existing installs may
  // already have a `starter` row at the old price, so sync it on the way
  // through instead of only seeding fresh databases.
  const defaults: Record<string, { name: string; price_minor: number; currency: string; interval: string }> = {
    starter: { name: "Starter setup", price_minor: 15490000, currency: "NGN", interval: "yearly" },
  }
  const plan = defaults[planId] ?? {
    name: planId,
    price_minor: 15490000,
    currency,
    interval: "yearly",
  }

  const existing = await db.select().from(plans).where(eq(plans.id, planId)).limit(1)
  if (existing[0]) {
    if (existing[0].price_minor !== plan.price_minor || existing[0].interval !== plan.interval) {
      const [synced] = await db
        .update(plans)
        .set({ price_minor: plan.price_minor, currency: plan.currency, interval: plan.interval })
        .where(eq(plans.id, planId))
        .returning()
      return synced ?? existing[0]
    }
    return existing[0]
  }

  const [created] = await db
    .insert(plans)
    .values({ id: planId, ...plan })
    .onConflictDoNothing()
    .returning()

  if (created) return created
  const [after] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1)
  return after
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = CheckoutBody.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid checkout details", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    )
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json(
      { error: "Payments are not configured yet. Please contact us to complete your order." },
      { status: 503 }
    )
  }

  const { name, email, businessName } = parsed.data
  const slug = (parsed.data.slug ? slugify(parsed.data.slug) : slugify(businessName)) || "store"
  const planId = parsed.data.planId ?? "starter"
  const currency = (parsed.data.currency ?? "NGN").toUpperCase()
  const region = parsed.data.region ?? "ng"

  // Body value wins when the sales page was opened with ?ref=CODE; the
  // httpOnly cookie covers a later checkout from the same browser.
  const referralCode = parsed.data.referralCode?.trim() || (await getStoredReferralCode())
  const referralEnrollment = await resolveReferralForCheckout(referralCode)

  const signupPayload = TenantConfig.safeParse({
    slug,
    businessName,
    ownerEmail: email,
    plan: planId === "growth" || planId === "scale" ? planId : "starter",
    currency,
    region,
  })

  if (!signupPayload.success) {
    return NextResponse.json(
      {
        error: "Invalid store details",
        issues: signupPayload.error.issues.map(
          (issue) => `${issue.path.join(".") || "details"}: ${issue.message}`
        ),
      },
      { status: 400 }
    )
  }

  try {
    // Find or create customer
    let customer = (
      await db.select().from(customers).where(eq(customers.email, email)).limit(1)
    )[0]

    if (!customer) {
      const passwordHash = await hash(randomBytes(24).toString("hex"))
      const [created] = await db
        .insert(customers)
        .values({
          email,
          password_hash: passwordHash,
          name,
          role: "customer",
        })
        .returning()
      customer = created
    }

    const plan = await ensurePlan(signupPayload.data.plan, currency)
    const amountMinor = plan?.price_minor ?? 15490000
    const orderCurrency = plan?.currency ?? currency
    const providerReference = randomReference()

    const [order] = await db
      .insert(orders)
      .values({
        customer_id: customer.id,
        plan_id: signupPayload.data.plan,
        provider: "paystack",
        provider_reference: providerReference,
        amount_minor: amountMinor,
        currency: orderCurrency,
        status: "pending",
        signup_payload: signupPayload.data,
        referral_enrollment_id: referralEnrollment?.id ?? null,
      })
      .returning({ id: orders.id })

    await recordAudit({
      actor: "public-checkout",
      action: "order.created",
      meta: {
        orderId: order.id,
        email,
        planId: signupPayload.data.plan,
        referralApplied: Boolean(referralEnrollment),
      },
    })

    const configuredOrigin = process.env.DASHBOARD_PUBLIC_URL?.trim().replace(/\/+$/, "")
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
    const host = forwardedHost || request.headers.get("host")?.trim()
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      new URL(request.url).protocol.replace(/:$/, "")
    const origin = configuredOrigin || (host ? `${proto}://${host}` : new URL(request.url).origin)
    const callbackUrl = `${origin}/checkout/complete?reference=${encodeURIComponent(providerReference)}`

    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountMinor,
        currency: orderCurrency,
        reference: providerReference,
        callback_url: callbackUrl,
        metadata: {
          order_id: order.id,
          customer_name: name,
          business_name: businessName,
          slug,
        },
      }),
    })

    const initData = (await initRes.json().catch(() => ({}))) as {
      status?: boolean
      message?: string
      data?: { authorization_url?: string; reference?: string }
    }

    if (!initRes.ok || !initData.status || !initData.data?.authorization_url) {
      return NextResponse.json(
        {
          error: "Could not start payment. Please try again.",
          detail: initData.message,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      reference: providerReference,
      referralApplied: Boolean(referralEnrollment),
      authorization_url: initData.data.authorization_url,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Checkout failed: ${message}` }, { status: 500 })
  }
}
