import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

import { storeSettingsHub } from "../../../lib/store-settings-hub"
import {
  getStorefrontSettings,
  getStorefrontSettingsMetadata,
} from "../../../lib/storefront-settings"
import { storefrontSettingsSchema } from "@flowcheq/storefront-config"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeModule = req.scope.resolve(Modules.STORE)
  const [store] = await storeModule.listStores({}, { select: ["id", "name", "metadata"] })

  if (!store) {
    res.status(404).json({ message: "No active store found" })
    return
  }

  res.json(getStorefrontSettings(store))
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as Record<string, unknown>
  const parsed = storefrontSettingsSchema.safeParse(body)

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid storefront settings",
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    })
    return
  }

  const storeModule = req.scope.resolve(Modules.STORE)
  const [store] = await storeModule.listStores({}, { select: ["id", "name", "metadata"] })

  if (!store) {
    res.status(404).json({ message: "No active store found" })
    return
  }

  const metadata = {
    ...(store.metadata ?? {}),
    storefront: getStorefrontSettingsMetadata(parsed.data),
  }

  await storeModule.updateStores(store.id, {
    metadata,
  })

  storeSettingsHub.publish(store.id, parsed.data)

  res.json(getStorefrontSettings({ ...store, metadata }))
}
