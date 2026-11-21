import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  ensureRegionPaymentProviders,
  type RegionPaymentProviderRow,
} from "../lib/region-payment-providers"

/**
 * Migration-time convergence for deployed stores.
 *
 * Tenant bootstrap can be skipped (blank TENANT_CONFIG) or fail before it
 * reaches checkout setup, which previously left the region linked only to
 * `pp_system_default`. This script runs once with `medusa db:migrate` and adds
 * every enabled payment provider — including Paystack — to each region before
 * the server starts. The per-region marker means a later merchant edit in Admin
 * is preserved on subsequent deploys.
 */
export default async function syncPaymentProviders({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "payment_providers.id", "metadata"],
  })

  await ensureRegionPaymentProviders(
    container,
    (regions ?? []) as RegionPaymentProviderRow[],
    logger
  )
}
