/**
 * Idempotent convergence step for a storefront-ready Medusa checkout.
 *
 * Ensures the default store/region has:
 * - a tax region for the region's countries
 * - a stock location linked to the storefront sales channel
 * - a shipping fulfillment set, service zone and flat-rate options with prices
 * - every enabled payment provider selected on the region (including Paystack)
 * - a stocked inventory level for every existing inventory item
 *
 * New options start at 0.00 (free). Valid prices a merchant changed later are
 * preserved; set FLOWCHEQ_RESET_SHIPPING_PRICES=true for one run to restore the
 * free defaults. The stock location is marked with `flowcheq_checkout_default`,
 * and the `createProductsWorkflow` hook uses that marker to stock newly listed
 * products. Safe to run after every migration or container start.
 *
 *   npx medusa exec ./src/scripts/ensure-checkout-setup.ts
 */
import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  createLocationFulfillmentSetWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  deleteShippingOptionsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateRegionsWorkflow,
  updateShippingOptionsWorkflow,
  updateStockLocationsWorkflow,
} from "@medusajs/medusa/core-flows"
import { z } from "@medusajs/framework/zod"
import {
  CHECKOUT_DEFAULT_LOCATION_KEY,
  DEFAULT_STOCK_QUANTITY,
  ensureInventoryLevelsForItems,
  isCheckoutDefaultLocation,
} from "../lib/checkout-defaults"
import {
  FIRST_TIME_REGION,
  FIRST_TIME_SHIPPING_PRICES,
} from "../lib/first-time-defaults"
import { ensureRegionPaymentProviders } from "../lib/region-payment-providers"

const SYSTEM_TAX_PROVIDER = "tp_system"
const MANUAL_FULFILLMENT_PROVIDER_ID = "manual_manual"

const SHIPPING_PRICES: Record<string, { standard: number; express: number }> = {
  ngn: FIRST_TIME_SHIPPING_PRICES,
  usd: FIRST_TIME_SHIPPING_PRICES,
  eur: FIRST_TIME_SHIPPING_PRICES,
}

const CheckoutSetupContextSchema = z.object({
  storeId: z.string().optional(),
  salesChannelId: z.string().optional(),
  regionId: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  currencyCode: z.string().length(3).optional(),
  /** Explicitly reset valid prices to the free defaults. Never set by bootstrap. */
  resetShippingPrices: z.boolean().optional(),
})

export type CheckoutSetupContext = z.infer<typeof CheckoutSetupContextSchema>

type RegionRow = {
  id: string
  name?: string | null
  currency_code?: string | null
  countries?: { iso_2?: string | null }[] | null
  payment_providers?: { id?: string }[] | null
  metadata?: Record<string, unknown> | null
}

type StockLocationRow = {
  id: string
  name?: string | null
  metadata?: Record<string, unknown> | null
  sales_channels?: { id?: string }[] | null
  fulfillment_sets?: {
    id?: string
    type?: string | null
    service_zones?: { id?: string; name?: string | null }[] | null
  }[] | null
}

type ServiceZoneRow = {
  id: string
  fulfillment_set?: { id?: string } | null
  geo_zones?: { id?: string; country_code?: string | null }[] | null
}

type ShippingPriceRow = {
  id?: string
  amount?: number | string | null
  currency_code?: string | null
  region_id?: string | null
}

type ShippingOptionRow = {
  id: string
  name?: string | null
  prices?: ShippingPriceRow[] | null
  service_zone?: { id?: string } | null
  service_zone_id?: string
  shipping_profile?: { id?: string } | null
  shipping_profile_id?: string
}

function toNumber(value: ShippingPriceRow["amount"]) {
  if (value === null || value === undefined || value === "") {
    return Number.NaN
  }

  return Number(value)
}

function isValidPrice(price: ShippingPriceRow) {
  return (
    Boolean(price.currency_code || price.region_id) &&
    Number.isFinite(toNumber(price.amount))
  )
}

function normalizeOptionName(name?: string | null) {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * Replaces missing/invalid prices and removes duplicate prices for this
 * currency while preserving valid prices for other currencies and regions.
 */
function buildPrices(
  prices: ShippingPriceRow[],
  currencyCode: string,
  targetAmount: number
) {
  const next: Array<{
    id?: string
    currency_code?: string
    region_id?: string
    amount: number
  }> = []
  let targetSeen = false

  for (const price of prices) {
    if (!isValidPrice(price)) {
      continue
    }

    const amount = toNumber(price.amount)
    const record = price.id ? { id: price.id } : {}

    if (price.currency_code?.toLowerCase() === currencyCode) {
      if (targetSeen) {
        continue
      }
      targetSeen = true
      next.push({ ...record, currency_code: currencyCode, amount: targetAmount })
      continue
    }

    if (price.currency_code) {
      next.push({
        ...record,
        currency_code: price.currency_code.toLowerCase(),
        amount,
      })
      continue
    }

    if (price.region_id) {
      next.push({ ...record, region_id: price.region_id, amount })
    }
  }

  if (!targetSeen) {
    next.push({ currency_code: currencyCode, amount: targetAmount })
  }

  return next
}

function needsPriceRepair(
  prices: ShippingPriceRow[],
  currencyCode: string,
  targetAmount: number,
  enforceDefault: boolean
) {
  const targetPrices = prices.filter(
    (price) =>
      price.currency_code?.toLowerCase() === currencyCode &&
      Number.isFinite(toNumber(price.amount))
  )

  return (
    prices.length === 0 ||
    prices.some((price) => !isValidPrice(price)) ||
    targetPrices.length !== 1 ||
    (enforceDefault && toNumber(targetPrices[0]?.amount) !== targetAmount)
  )
}

export default async function ensureCheckoutSetup(
  { container }: ExecArgs,
  rawContext: CheckoutSetupContext = {}
) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const context = CheckoutSetupContextSchema.parse(rawContext)
  const resetShippingPrices =
    context.resetShippingPrices ??
    process.env.FLOWCHEQ_RESET_SHIPPING_PRICES === "true"

  const { data: stores } = await query.graph({
    entity: "store",
    fields: [
      "id",
      "name",
      "default_sales_channel_id",
      "default_region_id",
      "supported_currencies.currency_code",
    ],
  })

  const store = context.storeId
    ? stores.find((candidate) => candidate.id === context.storeId)
    : stores.find(
        (candidate) =>
          candidate.default_region_id && candidate.default_sales_channel_id
      ) ?? stores[0]

  if (!store) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No store found for checkout setup."
    )
  }

  const { data: regions } = await query.graph({
    entity: "region",
    fields: [
      "id",
      "name",
      "currency_code",
      "countries.iso_2",
      "payment_providers.id",
      "metadata",
    ],
  })

  const regionId = context.regionId ?? store.default_region_id
  const region = (regions as RegionRow[]).find((candidate) => candidate.id === regionId)

  if (!region) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Region "${regionId ?? "(none)"}" not found for checkout setup.`
    )
  }

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const salesChannelId =
    context.salesChannelId ?? store.default_sales_channel_id ?? salesChannels[0]?.id

  if (!salesChannelId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No sales channel found for checkout setup."
    )
  }

  const countryCodes = Array.from(
    new Set(
      (context.countryCode
        ? [context.countryCode]
        : (region.countries ?? []).map((country) => country.iso_2 ?? "")
      )
        .map((code) => code.toLowerCase())
        .filter((code) => /^[a-z]{2}$/.test(code))
    )
  )
  const currencyCode = (
    context.currencyCode ??
    region.currency_code ??
    store.supported_currencies?.[0]?.currency_code ??
    "usd"
  ).toLowerCase()

  if (!countryCodes.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Checkout setup needs at least one region country code."
    )
  }

  if (!/^[a-z]{3}$/.test(currencyCode)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Checkout setup needs a valid three-letter currency code."
    )
  }

  const regionName = region.name || countryCodes[0].toUpperCase()
  const amounts = SHIPPING_PRICES[currencyCode] ?? SHIPPING_PRICES.usd

  logger.info(
    `Configuring checkout for store "${store.name}" (${regionName}, ${currencyCode}).`
  )

  if (resetShippingPrices && currencyCode === FIRST_TIME_REGION.currencyCode) {
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: {
          metadata: { ...(region.metadata ?? {}), shipping_rate: 0 },
        },
      },
    })
    logger.info("Reset the region shipping rate metadata to 0.00.")
  }

  // --- Tax region -------------------------------------------------------------
  try {
    const { data: taxRegions } = await query.graph({
      entity: "tax_region",
      fields: ["id", "country_code"],
    })
    const missingCountries = countryCodes.filter(
      (code) =>
        !(taxRegions as { country_code?: string | null }[]).some(
          (taxRegion) => taxRegion.country_code?.toLowerCase() === code
        )
    )

    if (missingCountries.length) {
      await createTaxRegionsWorkflow(container).run({
        input: missingCountries.map((country_code) => ({
          country_code,
          provider_id: SYSTEM_TAX_PROVIDER,
        })),
      })
      logger.info(`Created tax regions for: ${missingCountries.join(", ")}.`)
    } else {
      logger.info("Tax regions already cover the storefront region.")
    }
  } catch (error) {
    logger.warn(
      `Skipped tax region check: ${(error as Error)?.message ?? String(error)}`
    )
  }

  // --- Stock location and sales channel link ---------------------------------
  const loadStockLocations = async () => {
    const result = await query.graph({
      entity: "stock_location",
      fields: [
        "id",
        "name",
        "metadata",
        "sales_channels.id",
        "fulfillment_sets.id",
        "fulfillment_sets.type",
        "fulfillment_sets.service_zones.id",
        "fulfillment_sets.service_zones.name",
      ],
    })

    return result.data as StockLocationRow[]
  }

  let stockLocations = await loadStockLocations()
  let stockLocation = stockLocations.find((candidate) =>
    isCheckoutDefaultLocation(candidate.metadata)
  )

  if (!stockLocation) {
    const normalizedRegionName = normalizeOptionName(regionName)
    stockLocation = stockLocations.find((candidate) => {
      const name = normalizeOptionName(candidate.name)
      return (
        name.includes(normalizedRegionName) ||
        countryCodes.some((code) => name.includes(code))
      )
    })
  }

  if (!stockLocation) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: `${regionName} Warehouse`,
            address: {
              address_1: `${regionName} Warehouse`,
              country_code: countryCodes[0],
            },
            metadata: { [CHECKOUT_DEFAULT_LOCATION_KEY]: "true" },
          },
        ],
      },
    })

    stockLocations = await loadStockLocations()
    stockLocation = stockLocations.find(
      (candidate) => candidate.id === result[0]?.id
    )
    logger.info(`Created stock location "${regionName} Warehouse".`)
  }

  if (!stockLocation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Failed to resolve the checkout stock location."
    )
  }

  const stockLocationId = stockLocation.id

  if (!isCheckoutDefaultLocation(stockLocation.metadata)) {
    await updateStockLocationsWorkflow(container).run({
      input: {
        selector: { id: stockLocationId },
        update: {
          metadata: {
            ...(stockLocation.metadata ?? {}),
            [CHECKOUT_DEFAULT_LOCATION_KEY]: "true",
          },
        },
      },
    })
    stockLocations = await loadStockLocations()
    stockLocation =
      stockLocations.find((candidate) => candidate.id === stockLocationId) ??
      stockLocation
    logger.info(`Marked "${stockLocation.name}" as the checkout stock location.`)
  }

  const linkedChannelIds = (stockLocation.sales_channels ?? [])
    .map((channel) => channel?.id)
    .filter((id): id is string => Boolean(id))

  if (!linkedChannelIds.includes(salesChannelId)) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocationId, add: [salesChannelId] },
    })
    logger.info("Linked the checkout stock location to the storefront sales channel.")
  } else {
    logger.info("Checkout stock location is already linked to the sales channel.")
  }

  // --- Fulfillment set and service zone --------------------------------------
  let shippingFulfillmentSet = (stockLocation.fulfillment_sets ?? []).find(
    (set) => set.type === "shipping"
  )

  if (!shippingFulfillmentSet) {
    await createLocationFulfillmentSetWorkflow(container).run({
      input: {
        location_id: stockLocationId,
        fulfillment_set_data: { name: "Shipping", type: "shipping" },
      },
    })

    stockLocations = await loadStockLocations()
    stockLocation =
      stockLocations.find((candidate) => candidate.id === stockLocationId) ??
      stockLocation
    shippingFulfillmentSet = (stockLocation.fulfillment_sets ?? []).find(
      (set) => set.type === "shipping"
    )
    logger.info("Created the shipping fulfillment set.")
  }

  const fulfillmentSetId = shippingFulfillmentSet?.id

  if (!fulfillmentSetId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Failed to resolve the shipping fulfillment set."
    )
  }

  const { data: serviceZones } = await query.graph({
    entity: "service_zone",
    fields: [
      "id",
      "name",
      "fulfillment_set.id",
      "geo_zones.id",
      "geo_zones.country_code",
    ],
  })

  const serviceZone = (serviceZones as ServiceZoneRow[]).find(
    (zone) =>
      zone.fulfillment_set?.id === fulfillmentSetId &&
      (zone.geo_zones ?? []).some((geoZone) =>
        countryCodes.includes((geoZone.country_code ?? "").toLowerCase())
      )
  )

  let serviceZoneId: string | undefined

  if (serviceZone) {
    serviceZoneId = serviceZone.id
    const coveredCodes = new Set(
      (serviceZone.geo_zones ?? []).map((geoZone) =>
        (geoZone.country_code ?? "").toLowerCase()
      )
    )
    const missingCodes = countryCodes.filter((code) => !coveredCodes.has(code))

    if (missingCodes.length) {
      const fulfillmentService = container.resolve(Modules.FULFILLMENT)
      await fulfillmentService.createGeoZones(
        missingCodes.map((country_code) => ({
          service_zone_id: serviceZoneId as string,
          type: "country",
          country_code,
        }))
      )
      logger.info(`Added missing geo zones: ${missingCodes.join(", ")}.`)
    }
  } else {
    const { result } = await createServiceZonesWorkflow(container).run({
      input: {
        data: [
          {
            name: regionName,
            fulfillment_set_id: fulfillmentSetId,
            geo_zones: countryCodes.map((country_code) => ({
              type: "country",
              country_code,
            })),
          },
        ],
      },
    })
    serviceZoneId = result[0]?.id
    logger.info(`Created service zone "${regionName}".`)
  }

  if (!serviceZoneId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Failed to resolve the checkout service zone."
    )
  }

  // --- Shipping profile and options ------------------------------------------
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
  })
  let shippingProfileId = shippingProfiles[0]?.id

  if (!shippingProfileId) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default Shipping Profile", type: "standard" }] },
    })
    shippingProfileId = result[0]?.id
    logger.info("Created the default shipping profile.")
  }

  const { data: shippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: [
      "id",
      "name",
      "price_type",
      "provider_id",
      "service_zone.id",
      "shipping_profile.id",
      "prices.id",
      "prices.amount",
      "prices.currency_code",
      "prices.region_id",
    ],
  })

  const zoneOptions = (shippingOptions as ShippingOptionRow[]).filter(
    (option) =>
      (option.service_zone?.id ?? option.service_zone_id) === serviceZoneId
  )
  const duplicateOptionIds: string[] = []

  for (const desired of [
    { name: "Standard Shipping", amount: amounts.standard },
    { name: "Express Shipping", amount: amounts.express },
  ]) {
    const normalizedName = normalizeOptionName(desired.name)
    const matches = zoneOptions.filter(
      (option) => normalizeOptionName(option.name) === normalizedName
    )
    const keeper =
      matches.find(
        (option) =>
          !needsPriceRepair(
            option.prices ?? [],
            currencyCode,
            desired.amount,
            resetShippingPrices
          )
      ) ?? matches[0]

    if (keeper) {
      for (const duplicate of matches) {
        if (duplicate.id !== keeper.id) {
          duplicateOptionIds.push(duplicate.id)
        }
      }

      const prices = keeper.prices ?? []

      if (
        needsPriceRepair(
          prices,
          currencyCode,
          desired.amount,
          resetShippingPrices
        )
      ) {
        await updateShippingOptionsWorkflow(container).run({
          input: [
            {
              id: keeper.id,
              price_type: "flat",
              prices: buildPrices(prices, currencyCode, desired.amount),
            },
          ],
        })
        logger.info(`Repaired prices for shipping option "${keeper.name}".`)
      }
    } else {
      await createShippingOptionsWorkflow(container).run({
        input: [
          {
            name: desired.name,
            service_zone_id: serviceZoneId,
            shipping_profile_id: shippingProfileId as string,
            provider_id: MANUAL_FULFILLMENT_PROVIDER_ID,
            price_type: "flat",
            prices: [{ currency_code: currencyCode, amount: desired.amount }],
          },
        ],
      })
      logger.info(`Created shipping option "${desired.name}".`)
    }
  }

  if (duplicateOptionIds.length) {
    await deleteShippingOptionsWorkflow(container).run({
      input: { ids: duplicateOptionIds },
    })
    logger.info(`Removed ${duplicateOptionIds.length} duplicate shipping option(s).`)
  }

  // --- Payment providers -----------------------------------------------------
  const paymentResults = await ensureRegionPaymentProviders(container, [region])
  const paymentResult = paymentResults[0]

  if (!paymentResult?.alreadyConverged) {
    logger.info(
      paymentResult?.updated
        ? `Enabled payment providers for ${regionName}: ${paymentResult.providerIds.join(", ")}.`
        : "Region already has all enabled payment providers."
    )
  } else {
    logger.info(
      "Region payment providers were already seeded; merchant selection preserved."
    )
  }

  // --- Inventory -------------------------------------------------------------
  const inventoryService = container.resolve(Modules.INVENTORY)
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  })
  const createdLevels = await ensureInventoryLevelsForItems(
    container,
    (inventoryItems as { id: string }[]).map((item) => item.id),
    stockLocationId
  )

  logger.info(
    createdLevels.length
      ? `Stocked ${createdLevels.length} inventory item(s) at "${stockLocation.name}".`
      : `All inventory items already have stock at "${stockLocation.name}".`
  )

  logger.info(
    `Checkout setup complete. Default stock quantity: ${DEFAULT_STOCK_QUANTITY}.`
  )
}
