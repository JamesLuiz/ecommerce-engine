import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

import { STOREFRONT_ASSET_MODULE } from "../../../modules/storefront-asset"
import { createStorefrontAssetsWorkflow } from "../../../workflows/storefront-asset/create-storefront-assets"

type UploadedFile = {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeModule = req.scope.resolve(Modules.STORE)
  const [store] = await storeModule.listStores({}, { select: ["id"] })

  if (!store) {
    res.status(404).json({ message: "No active store found" })
    return
  }

  const assetModule = req.scope.resolve(STOREFRONT_ASSET_MODULE)
  const assets = await assetModule.listStorefrontAssets(
    { store_id: store.id },
    { order: { created_at: "DESC" } },
  )

  res.json({ assets })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const files = (req as MedusaRequest & { files?: UploadedFile[] }).files

  if (!files?.length) {
    res.status(400).json({ message: "No files were uploaded" })
    return
  }

  const storeModule = req.scope.resolve(Modules.STORE)
  const [store] = await storeModule.listStores({}, { select: ["id"] })

  if (!store) {
    res.status(404).json({ message: "No active store found" })
    return
  }

  const body = (req.body ?? {}) as { kind?: string; alt?: string }

  const { result } = await createStorefrontAssetsWorkflow(req.scope).run({
    input: {
      storeId: store.id,
      files: files.map((file) => ({
        filename: file.originalname,
        mimeType: file.mimetype,
        content: file.buffer.toString("base64"),
        size: file.size,
        kind: body.kind || "general",
        alt: body.alt,
      })),
    },
  })

  res.status(201).json({ files: result, assets: result })
}
