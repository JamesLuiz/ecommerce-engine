import type { MedusaContainer, PricingTypes } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type VariantPriceSetLink = {
  variant_id?: string | null
  price_set_id?: string | null
}

/**
 * Adds a default currency price to variants that are missing one.
 *
 * `updateProductVariantsWorkflow` with a `prices` array replaces every default
 * price in the price set, which deletes other currencies, region rules and
 * quantity tiers. Use the pricing module's `addPrices` so convergence only
 * fills a genuine gap and never destroys merchant-edited prices.
 */
export async function ensureDefaultCurrencyPrices(
  container: MedusaContainer,
  currencyCode: string,
  amount: number
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const pricingModuleService = container.resolve(
    Modules.PRICING
  ) as PricingTypes.IPricingModuleService

  const { data: links } = await query.graph({
    entity: "product_variant_price_set",
    fields: ["variant_id", "price_set_id"],
  })

  const priceLists = await pricingModuleService.listPriceLists(
    {},
    { relations: ["prices"] }
  )
  const priceListPriceIds = new Set(
    priceLists.flatMap((priceList) =>
      (priceList.prices ?? []).map((price) => price.id)
    )
  )
  const zeroPriceListPrices = priceLists
    .filter((priceList) => priceList.status === "active")
    .flatMap((priceList) => priceList.prices ?? [])
    .filter(
      (price) =>
        (price.currency_code ?? "").toLowerCase() ===
          currencyCode.toLowerCase() &&
        Number(price.amount ?? 0) <= 0
    ).length

  const variantPriceSetLinks = (links ?? []) as VariantPriceSetLink[]
  let added = 0

  for (const link of variantPriceSetLinks) {
    const priceSetId = link.price_set_id

    if (!priceSetId) {
      continue
    }

    const priceSet = await pricingModuleService.retrievePriceSet(priceSetId, {
      relations: ["prices"],
    })

    const hasDefaultPrice = (priceSet.prices ?? []).some(
      (price) =>
        (price.currency_code ?? "").toLowerCase() ===
          currencyCode.toLowerCase() &&
        !priceListPriceIds.has(price.id) &&
        (price.rules_count ?? 0) === 0
    )

    if (hasDefaultPrice) {
      continue
    }

    await pricingModuleService.addPrices({
      priceSetId,
      prices: [{ amount, currency_code: currencyCode }],
    })

    added += 1
  }

  return { variants: variantPriceSetLinks.length, added, zeroPriceListPrices }
}
