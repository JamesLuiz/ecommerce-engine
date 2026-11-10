import { MedusaService } from "@medusajs/framework/utils"

import StorefrontAsset from "./models/storefront-asset"

class StorefrontAssetModuleService extends MedusaService({
  StorefrontAsset,
}) {}

export default StorefrontAssetModuleService
