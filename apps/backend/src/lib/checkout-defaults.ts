import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { createInventoryLevelsWorkflow } from "@medusajs/medusa/core-flows"

/** Marks the stock location that newly created products get stocked into. */
export const CHECKOUT_DEFAULT_LOCATION_KEY = "flowcheq_checkout_default"

/** Same starting stock the existing seed data uses, so new items are sellable. */
export const DEFAULT_STOCK_QUANTITY = 1_000_000

const INVENTORY_BATCH_SIZE = 100

type StockLocationRow = {
  id: string
  metadata?: Record<string, unknown> | null
}

export function isCheckoutDefaultLocation(
  metadata?: Record<string, unknown> | null
) {
  const value = metadata?.[CHECKOUT_DEFAULT_LOCATION_KEY]

  return value === true || value === "true"
}

/** Returns the stock location marked by the checkout bootstrap, if one exists. */
export async function findCheckoutDefaultLocation(
  container: MedusaContainer
): Promise<{ id: string } | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "stock_location",
    fields: ["id", "metadata"],
  })

  const location = (data as StockLocationRow[]).find((candidate) =>
    isCheckoutDefaultLocation(candidate.metadata)
  )

  return location ? { id: location.id } : null
}

/**
 * Adds a stocked inventory level at `locationId` for every inventory item that
 * does not have one yet. Existing levels are untouched so merchant stock edits
 * are never overwritten. Returns the created level IDs for workflow rollback.
 */
export async function ensureInventoryLevelsForItems(
  container: MedusaContainer,
  inventoryItemIds: string[],
  locationId: string
): Promise<string[]> {
  const uniqueIds = Array.from(
    new Set(inventoryItemIds.filter((id): id is string => Boolean(id)))
  )

  if (!uniqueIds.length) {
    return []
  }

  const inventoryService = container.resolve(Modules.INVENTORY)
  const existingLevels = await inventoryService.listInventoryLevels(
    { location_id: locationId },
    { take: 1000 }
  )
  const existingIds = new Set(
    existingLevels.map((level: { inventory_item_id?: string }) =>
      level.inventory_item_id
    )
  )
  const missingIds = uniqueIds.filter((id) => !existingIds.has(id))
  const createdIds: string[] = []

  for (let index = 0; index < missingIds.length; index += INVENTORY_BATCH_SIZE) {
    const batch = missingIds.slice(index, index + INVENTORY_BATCH_SIZE)
    const { result } = await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: batch.map((inventory_item_id) => ({
          inventory_item_id,
          location_id: locationId,
          stocked_quantity: DEFAULT_STOCK_QUANTITY,
        })),
      },
    })

    createdIds.push(...result.map((level) => level.id))
  }

  return createdIds
}
