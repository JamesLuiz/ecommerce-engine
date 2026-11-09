import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

import { getStoreBrandSettings } from "../../../lib/store-brand"

const pickBodyValue = (
  body: Record<string, unknown>,
  key: string,
  fallback = ""
) => {
  const value = body[key]

  return typeof value === "string" ? value : fallback
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeModule = req.scope.resolve(Modules.STORE)
  const [store] = await storeModule.listStores({}, { select: ["id", "name", "metadata"] })

  if (!store) {
    res.status(404).json({ message: "No active store found" })
    return
  }

  res.json(getStoreBrandSettings(store))
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as Record<string, unknown>
  const storeModule = req.scope.resolve(Modules.STORE)
  const [store] = await storeModule.listStores({}, { select: ["id", "name", "metadata"] })

  if (!store) {
    res.status(404).json({ message: "No active store found" })
    return
  }

  const metadata = (store.metadata ?? {}) as Record<string, unknown>

  const nextMetadata = {
    ...metadata,
    store_name: pickBodyValue(body, "name", String(store.name || "Flowcheq")),
    store_handle: pickBodyValue(body, "handle"),
    store_description: pickBodyValue(body, "description"),
    vendor_name: pickBodyValue(body, "vendorName"),
    brand_logo_url: pickBodyValue(body, "logoUrl"),
    brand_primary_color: pickBodyValue(body, "primaryColor", "#5B4FF9"),
  }

  await storeModule.updateStores(store.id, {
    metadata: nextMetadata,
  })

  res.json(getStoreBrandSettings({ ...store, metadata: nextMetadata }))
}
