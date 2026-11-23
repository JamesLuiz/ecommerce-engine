export const SALES_PLAN_IDS = ["starter-6m", "starter"] as const

export type SalesPlanId = (typeof SALES_PLAN_IDS)[number]

export interface SalesPlan {
  id: SalesPlanId
  name: string
  priceMinor: number
  currency: "NGN"
  /** Stored in plans.interval and shown in the admin plan picker. */
  interval: "six-months" | "yearly"
  /** Human-readable duration used on the sales page. */
  periodLabel: string
  badge: string
  /** Tenant tier written to the provisioning config. */
  tenantPlan: "starter"
  referralBonusMinor: number
}

export const SIX_MONTH_PLAN: SalesPlan = {
  id: "starter-6m",
  name: "Starter setup - 6 months",
  priceMinor: 9_580_000,
  currency: "NGN",
  interval: "six-months",
  periodLabel: "6 months",
  badge: "Flexible start",
  tenantPlan: "starter",
  referralBonusMinor: 900_000,
}

export const YEARLY_PLAN: SalesPlan = {
  id: "starter",
  name: "Starter setup - yearly",
  priceMinor: 15_490_000,
  currency: "NGN",
  interval: "yearly",
  periodLabel: "12 months",
  badge: "Best value",
  tenantPlan: "starter",
  referralBonusMinor: 1_800_000,
}

export const SALES_PLANS: readonly SalesPlan[] = [SIX_MONTH_PLAN, YEARLY_PLAN]
export const DEFAULT_SALES_PLAN = SIX_MONTH_PLAN

export function isSalesPlanId(value: unknown): value is SalesPlanId {
  return typeof value === "string" && SALES_PLAN_IDS.includes(value as SalesPlanId)
}

export function getSalesPlan(planId: unknown): SalesPlan | null {
  return SALES_PLANS.find((plan) => plan.id === planId) ?? null
}
