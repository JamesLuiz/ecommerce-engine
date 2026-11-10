import { Module } from "@medusajs/framework/utils"

import StorefrontAssetModuleService from "./service"

export const STOREFRONT_ASSET_MODULE = "storefrontAsset"

export default Module(STOREFRONT_ASSET_MODULE, {
  service: StorefrontAssetModuleService,
})
