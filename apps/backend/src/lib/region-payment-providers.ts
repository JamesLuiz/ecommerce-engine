import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Marks a region whose payment providers were seeded by Flowcheq. Once set,
 * later convergence runs leave the merchant's own Admin changes alone.
 */
export const PAYMENT_PROVIDERS_CONVERGED_KEY = "flowcheq_payment_providers_converged"

export type RegionPaymentProviderRow = {
  id: string
  name?: string | null
  payment_providers?: { id?: string | null }[] | null
  metadata?: Record<string, unknown> | null
}

type PaymentProviderRow = {
  id?: string | null
  is_enabled?: boolean | null
}

export type RegionPaymentProviderResult = {
  regionId: string
  providerIds: string[]
  updated: boolean
  alreadyConverged: boolean
}

type LoggerLike = {
  info: (message: string) => void
  warn?: (message: string) => void
}

export function hasPaymentProvidersConverged(
  metadata?: Record<string, unknown> | null
): boolean {
  const value = metadata?.[PAYMENT_PROVIDERS_CONVERGED_KEY]
  return value === true || value === "true"
}

export function mergePaymentProviderIds(
  existingIds: string[],
  enabledIds: string[]
): string[] {
  return Array.from(new Set([...existingIds, ...enabledIds]))
}

/**
 * Adds every enabled payment provider (including Paystack) to each region once.
 * Existing selections are preserved, so a merchant can later remove a provider
 * in Admin without a restart silently adding it back.
 */
export async function ensureRegionPaymentProviders(
  container: MedusaContainer,
  regions: RegionPaymentProviderRow[],
  logger?: LoggerLike
): Promise<RegionPaymentProviderResult[]> {
  if (!regions.length) {
    return []
  }

  const activeLogger =
    logger ??
    (container.resolve(ContainerRegistrationKeys.LOGGER) as LoggerLike)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: paymentProviders } = await query.graph({
    entity: "payment_provider",
    fields: ["id", "is_enabled"],
  })

  const enabledProviderIds = (paymentProviders as PaymentProviderRow[])
    .filter((provider) => provider.is_enabled && provider.id)
    .map((provider) => provider.id as string)

  if (!enabledProviderIds.length) {
    activeLogger.warn?.(
      "No enabled payment providers were found; skipping region payment setup."
    )
    return []
  }

  const results: RegionPaymentProviderResult[] = []

  for (const region of regions) {
    const existingProviderIds = (region.payment_providers ?? [])
      .map((provider) => provider?.id)
      .filter((id): id is string => Boolean(id))

    if (hasPaymentProvidersConverged(region.metadata)) {
      results.push({
        regionId: region.id,
        providerIds: existingProviderIds,
        updated: false,
        alreadyConverged: true,
      })
      continue
    }

    const providerIds = mergePaymentProviderIds(
      existingProviderIds,
      enabledProviderIds
    )
    const alreadyHasAllProviders =
      providerIds.length === existingProviderIds.length &&
      providerIds.every((id) => existingProviderIds.includes(id))
    const metadata = {
      ...(region.metadata ?? {}),
      [PAYMENT_PROVIDERS_CONVERGED_KEY]: "true",
    }

    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: {
          ...(alreadyHasAllProviders ? {} : { payment_providers: providerIds }),
          metadata,
        },
      },
    })

    const label = region.name || region.id
    activeLogger.info(
      alreadyHasAllProviders
        ? `Marked payment providers for region "${label}" as configured.`
        : `Enabled payment providers for region "${label}": ${providerIds.join(", ")}.`
    )

    results.push({
      regionId: region.id,
      providerIds,
      updated: !alreadyHasAllProviders,
      alreadyConverged: false,
    })
  }

  return results
}
