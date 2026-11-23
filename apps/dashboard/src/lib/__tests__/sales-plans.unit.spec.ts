import { describe, expect, it } from "vitest"

import {
  DEFAULT_SALES_PLAN,
  getSalesPlan,
  isSalesPlanId,
  SALES_PLANS,
  SIX_MONTH_PLAN,
  YEARLY_PLAN,
} from "../sales-plans"

describe("sales plans", () => {
  it("offers the two NGN plans", () => {
    expect(SALES_PLANS).toEqual([SIX_MONTH_PLAN, YEARLY_PLAN])
    expect(SIX_MONTH_PLAN.priceMinor).toBe(9_580_000)
    expect(SIX_MONTH_PLAN.referralBonusMinor).toBe(900_000)
    expect(YEARLY_PLAN.priceMinor).toBe(15_490_000)
    expect(YEARLY_PLAN.referralBonusMinor).toBe(1_800_000)
  })

  it("maps both plans to the starter tenant tier", () => {
    expect(SIX_MONTH_PLAN.tenantPlan).toBe("starter")
    expect(YEARLY_PLAN.tenantPlan).toBe("starter")
  })

  it("resolves valid plan ids and rejects unknown ones", () => {
    expect(isSalesPlanId("starter-6m")).toBe(true)
    expect(isSalesPlanId("starter")).toBe(true)
    expect(isSalesPlanId("growth")).toBe(false)
    expect(getSalesPlan("starter-6m")).toBe(SIX_MONTH_PLAN)
    expect(getSalesPlan("growth")).toBeNull()
    expect(DEFAULT_SALES_PLAN).toBe(SIX_MONTH_PLAN)
  })
})
