import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

import { STOREFRONT_ASSET_MODULE } from "../../modules/storefront-asset"

export type DeleteStorefrontAssetInput = {
  id: string
}

/**
 * Removes the database row first and the stored bytes second. A failure to
 * delete the bytes leaves an orphaned file (harmless, and the storage provider
 * can clean it up) instead of a dangling database row.
 */
const deleteStorefrontAssetStep = createStep(
  "delete-storefront-asset",
  async (input: DeleteStorefrontAssetInput, { container }) => {
    const assetModule = container.resolve(STOREFRONT_ASSET_MODULE)
    const asset = await assetModule.retrieveStorefrontAsset(input.id)

    await assetModule.deleteStorefrontAssets(input.id)

    if (asset.file_id) {
      const fileModule = container.resolve(Modules.FILE)

      try {
        await fileModule.deleteFiles(asset.file_id)
      } catch {
        // The row is already gone; an orphaned file is preferable to a failed
        // delete that leaves the asset visible in the media library.
      }
    }

    return new StepResponse({ id: input.id })
  },
)

export const deleteStorefrontAssetWorkflow = createWorkflow(
  "delete-storefront-asset",
  (input: DeleteStorefrontAssetInput) => {
    const deleted = deleteStorefrontAssetStep(input)

    return new WorkflowResponse(deleted)
  },
)
