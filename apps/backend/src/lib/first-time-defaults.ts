/**
 * Defaults applied once when a tenant store is first prepared. Merchants can
 * change every value in Admin afterwards; convergence only fills what is
 * missing, and never overwrites a valid price or an existing location.
 */
export const FIRST_TIME_REGION: {
  code: string
  name: string
  currencyCode: string
  countries: string[]
  warehouseName: string
  salesChannelName: string
} = {
  code: "ng",
  name: "Nigeria",
  currencyCode: "ngn",
  countries: ["ng"],
  warehouseName: "Nigeria Warehouse",
  salesChannelName: "Default Sales Channel",
}

/** Free shipping is the starting point. Prices remain editable in Admin. */
export const FIRST_TIME_SHIPPING_PRICES = {
  standard: 0,
  express: 0,
}

/** Marks a store whose first-time defaults have already been applied. */
export const BOOTSTRAP_COMPLETE_KEY = "flowcheq_bootstrapped"

export function hasCompletedBootstrap(metadata?: Record<string, unknown> | null) {
  const value = metadata?.[BOOTSTRAP_COMPLETE_KEY]

  return value === true || value === "true"
}
