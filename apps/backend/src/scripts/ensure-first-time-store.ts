/**
 * Final step of first-time setup on a fresh Medusa database.
 *
 * The migration seed creates the Nigeria region, warehouse, sales channel,
 * publishable key and free shipping options. This script ties the remaining
 * defaults together, links the storefront key to the exact sales channel, and
 * hands off to checkout convergence. It is idempotent and never overwrites a
 * setting a merchant has already changed.
 *
 *   npx medusa exec ./src/scripts/ensure-first-time-store.ts
 */
import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  BOOTSTRAP_COMPLETE_KEY,
  FIRST_TIME_REGION,
  FIRST_TIME_SHIPPING_PRICES,
  hasCompletedBootstrap,
} from "../lib/first-time-defaults"
import { withDefaultRegionPolicies } from "../lib/region-store-policies"
import ensureCheckoutSetup from "./ensure-checkout-setup"
import ensurePublishableKey from "./ensure-publishable-key"

const SYSTEM_PAYMENT_PROVIDER = "pp_system_default"

type RegionRow = {
  id: string
  name?: string | null
  currency_code?: string | null
  countries?: { iso_2?: string | null }[] | null
  metadata?: Record<string, unknown> | null
}

type StoreRow = {
  id: string
  default_region_id?: string | null
  default_sales_channel_id?: string | null
  supported_currencies?: {
    currency_code?: string | null
    is_default?: boolean | null
  }[] | null
  metadata?: Record<string, unknown> | null
}

type SalesChannelRow = {
  id: string
  name?: string | null
}

export default async function ensureFirstTimeStore({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: stores } = await query.graph({
    entity: "store",
    fields: [
      "id",
      "default_region_id",
      "default_sales_channel_id",
      "supported_currencies.currency_code",
      "supported_currencies.is_default",
      "metadata",
    ],
  })

  const store = stores[0] as StoreRow | undefined

  if (!store) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No store found. Run the database migrations first."
    )
  }

  const alreadyBootstrapped = hasCompletedBootstrap(store.metadata)

  // --- Nigeria region ---------------------------------------------------------
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2", "metadata"],
  })

  const markedRegion = (regions as RegionRow[]).find(
    (candidate) => candidate.metadata?.flowcheq_region === FIRST_TIME_REGION.code
  )
  const storedRegion = (regions as RegionRow[]).find(
    (candidate) => candidate.id === store.default_region_id
  )

  // First run uses Nigeria. Later runs follow the merchant's current default.
  let region = alreadyBootstrapped ? storedRegion ?? markedRegion : markedRegion

  if (!region) {
    region = (regions as RegionRow[]).find((candidate) =>
      (candidate.countries ?? []).some(
        (country) => (country.iso_2 ?? "").toLowerCase() === FIRST_TIME_REGION.code
      )
    )
  }

  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: FIRST_TIME_REGION.name,
            currency_code: FIRST_TIME_REGION.currencyCode,
            countries: [...FIRST_TIME_REGION.countries],
            payment_providers: [SYSTEM_PAYMENT_PROVIDER],
            metadata: {
              ...withDefaultRegionPolicies(),
              flowcheq_region: FIRST_TIME_REGION.code,
            },
          },
        ],
      },
    })

    region = result[0] as RegionRow
    logger.info(`Created the ${FIRST_TIME_REGION.name} region.`)
  }

  // --- Storefront sales channel ----------------------------------------------
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })

  let salesChannel = (salesChannels as SalesChannelRow[]).find(
    (candidate) => candidate.id === store.default_sales_channel_id
  )

  if (!salesChannel) {
    salesChannel = (salesChannels as SalesChannelRow[]).find(
      (candidate) => candidate.name === FIRST_TIME_REGION.salesChannelName
    )
  }

  if (!salesChannel) {
    salesChannel = (salesChannels as SalesChannelRow[])[0]
  }

  if (!salesChannel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: FIRST_TIME_REGION.salesChannelName,
            description: "Created by Flowcheq Commerce",
          },
        ],
      },
    })

    salesChannel = result[0] as SalesChannelRow
    logger.info(`Created the ${FIRST_TIME_REGION.salesChannelName}.`)
  }

  // --- Store defaults --------------------------------------------------------
  const supportedCurrencies = store.supported_currencies ?? []
  const currencyCodes = new Set(
    supportedCurrencies
      .map((currency) => currency.currency_code?.toLowerCase())
      .filter((code): code is string => Boolean(code))
  )
  currencyCodes.add(FIRST_TIME_REGION.currencyCode)

  const supportedCurrenciesUpdate = [...currencyCodes].map((currency_code) => ({
    currency_code,
    is_default: currency_code === FIRST_TIME_REGION.currencyCode,
  }))

  const needsDefaults =
    !alreadyBootstrapped &&
    (store.default_region_id !== region.id ||
      store.default_sales_channel_id !== salesChannel.id ||
      !supportedCurrencies.some(
        (currency) =>
          currency.currency_code?.toLowerCase() ===
            FIRST_TIME_REGION.currencyCode && currency.is_default
      ))

  if (needsDefaults || !alreadyBootstrapped) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          ...(needsDefaults
            ? {
                default_region_id: region.id,
                default_sales_channel_id: salesChannel.id,
                supported_currencies: supportedCurrenciesUpdate,
              }
            : {}),
          metadata: {
            ...(store.metadata ?? {}),
            [BOOTSTRAP_COMPLETE_KEY]: "true",
          },
        },
      },
    })

    logger.info("Tied the store to the Nigeria region and storefront sales channel.")
  }

  // --- Storefront key and checkout -------------------------------------------
  const activeCurrencyCode = (
    alreadyBootstrapped
      ? region.currency_code ?? FIRST_TIME_REGION.currencyCode
      : FIRST_TIME_REGION.currencyCode
  ).toLowerCase()
  const activeCountryCode = (
    alreadyBootstrapped
      ? region.countries?.find((country) =>
          /^[a-z]{2}$/.test(country.iso_2 ?? "")
        )?.iso_2 ?? FIRST_TIME_REGION.countries[0]
      : FIRST_TIME_REGION.countries[0]
  ).toLowerCase()

  await ensurePublishableKey({ container, args }, { salesChannelId: salesChannel.id })

  await ensureCheckoutSetup({ container, args }, {
    storeId: store.id,
    salesChannelId: salesChannel.id,
    regionId: region.id,
    countryCode: activeCountryCode,
    currencyCode: activeCurrencyCode,
    // This path is first-time setup, never the one-off price reset.
    resetShippingPrices: false,
  })

  logger.info(
    alreadyBootstrapped
      ? "Store already bootstrapped; existing settings were preserved."
      : `First-time store setup complete. Shipping starts free (${FIRST_TIME_SHIPPING_PRICES.standard.toFixed(2)}).`
  )
}
