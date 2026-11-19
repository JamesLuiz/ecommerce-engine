import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  STOREFRONT_SETTINGS_METADATA_KEY,
  storefrontSettingsSchema,
} from "@flowcheq/storefront-config"

import { storeSettingsHub } from "../../../lib/store-settings-hub"
import {
  getStorefrontSettings,
  getStorefrontSettingsMetadata,
} from "../../../lib/storefront-settings"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeModule = req.scope.resolve(Modules.STORE)
  const [store] = await storeModule.listStores({}, { select: ["id", "name", "metadata"] })

  if (!store) {
    res.status(404).json({ message: "No active store found" })
    return
  }

  const existingMetadata = (store.metadata ?? {}) as Record<string, unknown>
  const hasPersistedSettings = Boolean(existingMetadata[STOREFRONT_SETTINGS_METADATA_KEY])
  const settings = getStorefrontSettings(store)

  if (!hasPersistedSettings) {
    // Persist computed defaults once so the storefront is never scanty and
    // staff always have a concrete, editable settings record in the backend.
    const metadata = {
      ...existingMetadata,
      ...getStorefrontSettingsMetadata(settings),
    }

    await storeModule.updateStores(store.id, { metadata })
    res.json(getStorefrontSettings({ ...store, metadata }))
    return
  }

  res.json(settings)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as Record<string, unknown>
  const parsed = storefrontSettingsSchema.safeParse(body)

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid storefront settings",
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
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
    ...getStorefrontSettingsMetadata(parsed.data),
  }

  await storeModule.updateStores(store.id, { metadata })
  storeSettingsHub.publish(store.id, parsed.data)

  res.json(getStorefrontSettings({ ...store, metadata }))
}
