import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import {
  ensureInventoryLevelsForItems,
  findCheckoutDefaultLocation,
} from "../../lib/checkout-defaults"

/**
 * Newly listed products are stocked into the checkout default location so they
 * are immediately selectable at checkout. A missing setup is only warned about;
 * it must never stop a merchant from saving a product.
 */
createProductsWorkflow.hooks.productsCreated(
  async ({ products }, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    try {
      const location = await findCheckoutDefaultLocation(container)

      if (!location) {
        logger.warn(
          "Skipped automatic product stocking: checkout setup has no default stock location."
        )
        return new StepResponse(undefined, [])
      }

      const productIds = products.map((product) => product.id)

      if (!productIds.length) {
        return new StepResponse(undefined, [])
      }

      const productIdSet = new Set(productIds)
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({
        entity: "product_variant",
        fields: [
          "id",
          "product_id",
          "inventory_items.inventory_item_id",
        ],
      })

      const inventoryItemIds = (data as {
        product_id?: string | null
        inventory_items?: { inventory_item_id?: string }[] | null
      }[])
        .filter(
          (variant) =>
            variant.product_id && productIdSet.has(variant.product_id)
        )
        .flatMap((variant) =>
          (variant.inventory_items ?? [])
            .map((item) => item?.inventory_item_id)
            .filter((id): id is string => Boolean(id))
        )

      const createdLevelIds = await ensureInventoryLevelsForItems(
        container,
        inventoryItemIds,
        location.id
      )

      return new StepResponse(undefined, createdLevelIds)
    } catch (error) {
      logger.warn(
        `Skipped automatic product stocking: ${(error as Error)?.message ?? String(error)}`
      )
      return new StepResponse(undefined, [])
    }
  },
  async (createdLevelIds, { container }) => {
    if (!createdLevelIds?.length) {
      return
    }

    const inventoryService = container.resolve(Modules.INVENTORY)
    await inventoryService.deleteInventoryLevels(createdLevelIds)
  }
)
