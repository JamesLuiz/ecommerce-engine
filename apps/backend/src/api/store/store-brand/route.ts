import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

import { getStoreBrandSettings } from "../../../lib/store-brand"
import { getStorefrontSettings } from "../../../lib/storefront-settings"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeModule = req.scope.resolve(Modules.STORE)
  const [store] = await storeModule.listStores({}, { select: ["id", "name", "metadata"] })

  if (!store) {
    res.status(404).json({ message: "No active store found" })
    return
  }

  res.json({
    brand: getStoreBrandSettings(store),
    settings: getStorefrontSettings(store),
  })
}
