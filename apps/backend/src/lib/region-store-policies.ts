/**
 * Store policy values kept in each region's `metadata`. The storefront renders
 * the shipping/returns pages and structured data from these keys, and merchants
 * can change them in Settings → Regions → Metadata.
 */
export type RegionStorePolicies = {
  return_window_days: number;
  free_returns: boolean;
  shipping_rate: number;
  handling_days_min: number;
  handling_days_max: number;
  transit_days_min: number;
  transit_days_max: number;
};

export const DEFAULT_REGION_STORE_POLICIES: RegionStorePolicies = {
  return_window_days: 30,
  free_returns: false,
  shipping_rate: 0,
  handling_days_min: 0,
  handling_days_max: 1,
  transit_days_min: 2,
  transit_days_max: 3,
}

/**
 * Adds missing default policies to existing region metadata. Values a merchant
 * already changed are preserved, so this is safe to run on every start.
 */
export function withDefaultRegionPolicies(
  metadata?: Record<string, unknown> | null
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(metadata ?? {}) }

  for (const [key, value] of Object.entries(DEFAULT_REGION_STORE_POLICIES)) {
    if (next[key] === undefined) {
      next[key] = value
    }
  }

  return next
}
