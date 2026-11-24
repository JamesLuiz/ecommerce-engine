/**
 * Idempotent convergence script for Nigeria/Naira setup on existing databases.
 *
 * Ensures:
 * - a Nigeria (ng) region exists with NGN currency
 * - a Nigeria tax region exists
 * - the store supports NGN as default currency and points to the Nigeria region
 * - all existing product variants have a default NGN (₦100) price so products
 *   remain purchasable after switching from legacy regions/currencies. Existing
 *   prices are preserved; only missing default prices are added.
 *
 * Run after migrations on existing environments:
 *   npx medusa exec ./src/scripts/ensure-nigeria-pricing.ts
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createTaxRegionsWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import { ensureDefaultCurrencyPrices } from "../lib/ensure-default-prices"
import { DEFAULT_REGION_STORE_POLICIES } from "../lib/region-store-policies"

const SYSTEM_PAYMENT_PROVIDER = "pp_system_default"
const SYSTEM_TAX_PROVIDER = "tp_system"
const NGN_PRICE_AMOUNT = 100

export default async function ensureNigeriaPricing({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2", "metadata"],
  })

  type RegionRow = {
    id: string
    name?: string | null
    currency_code?: string | null
    countries?: { iso_2?: string | null }[] | null
    metadata?: Record<string, unknown> | null
  }

  const countryCodes = (region: RegionRow) =>
    ((region.countries ?? []) as { iso_2?: string | null }[]).map((country) =>
      (country.iso_2 ?? "").toLowerCase()
    )

  let nigeria = (regions as RegionRow[]).find((region) =>
    countryCodes(region).includes("ng")
  )

  if (nigeria && (nigeria.currency_code ?? "").toLowerCase() !== "ngn") {
    const { result } = await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: nigeria.id },
        update: { currency_code: "ngn" },
      },
    })
    nigeria = (result[0] as RegionRow) ?? nigeria
    logger.info(`Set region "${nigeria.name}" currency to NGN.`)
  }

  if (!nigeria) {
    const legacy = (regions as RegionRow[]).find(
      (region) =>
        region.name === "Europe" || countryCodes(region).includes("dk")
    )

    if (legacy) {
      const { result } = await updateRegionsWorkflow(container).run({
        input: {
          selector: { id: legacy.id },
          update: {
            name: "Nigeria",
            currency_code: "ngn",
            countries: ["ng"],
            metadata: {
              ...(legacy.metadata ?? {}),
              ...DEFAULT_REGION_STORE_POLICIES,
              flowcheq_region: "ng",
            },
          },
        },
      })
      nigeria = result[0] as RegionRow
      logger.info("Repurposed the starter region as Nigeria (NGN).")
    } else {
      const { result } = await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: "Nigeria",
              currency_code: "ngn",
              countries: ["ng"],
              payment_providers: [SYSTEM_PAYMENT_PROVIDER],
              metadata: {
                ...DEFAULT_REGION_STORE_POLICIES,
                flowcheq_region: "ng",
              },
            },
          ],
        },
      })
      nigeria = result[0] as RegionRow
      logger.info("Created the Nigeria region (NGN).")
    }
  }

  try {
    const { data: taxRegions } = await query.graph({
      entity: "tax_region",
      fields: ["id", "country_code"],
    })

    const hasNigeria = (taxRegions as { country_code?: string | null }[]).some(
      (taxRegion) => (taxRegion.country_code ?? "").toLowerCase() === "ng"
    )

    if (!hasNigeria) {
      await createTaxRegionsWorkflow(container).run({
        input: [{ country_code: "ng", provider_id: SYSTEM_TAX_PROVIDER }],
      })
      logger.info("Created the Nigeria tax region.")
    } else {
      logger.info("Nigeria tax region already exists.")
    }
  } catch (error) {
    logger.warn(
      `Skipped Nigeria tax region check: ${(error as Error)?.message ?? error}`
    )
  }

  const storeService = container.resolve(Modules.STORE)
  const [store] = await storeService.listStores({}, { take: 1 })

  if (store) {
    const supported = (store.supported_currencies ?? []) as {
      currency_code?: string | null
    }[]
    const codes = new Set(
      supported
        .map((currency) => (currency.currency_code ?? "").toLowerCase())
        .filter(Boolean)
    )
    codes.add("ngn")

    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: [...codes].map((currency_code) => ({
            currency_code,
            is_default: currency_code === "ngn",
          })),
          default_region_id: nigeria.id,
        },
      },
    })
    logger.info(
      "Set the store default currency to NGN and the default region to Nigeria."
    )
  } else {
    logger.warn("No store found; skipped store currency/region update.")
  }

  try {
    const { variants, added, zeroPriceListPrices } =
      await ensureDefaultCurrencyPrices(container, "ngn", NGN_PRICE_AMOUNT)

    logger.info(
      `Ensured NGN (₦${NGN_PRICE_AMOUNT}) default prices for ${variants} product variant(s); added ${added}.`
    )

    if (zeroPriceListPrices > 0) {
      logger.warn(
        `Found ${zeroPriceListPrices} active NGN price-list price(s) with a zero amount. These override default prices in the cart; review them in Admin.`
      )
    }
  } catch (error) {
    logger.warn(
      `Skipped NGN price backfill for existing variants: ${(error as Error)?.message ?? error}`
    )
  }

  logger.info("Nigeria/Naira pricing convergence complete.")
}
