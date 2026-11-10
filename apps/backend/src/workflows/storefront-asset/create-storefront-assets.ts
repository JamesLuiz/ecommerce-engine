import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

import { STOREFRONT_ASSET_MODULE } from "../../modules/storefront-asset"

export type StorefrontAssetUpload = {
  filename: string
  mimeType: string
  content: string
  size?: number
  kind?: string
  alt?: string
}

export type CreateStorefrontAssetsInput = {
  storeId: string
  files: StorefrontAssetUpload[]
}

type UploadedFile = {
  filename: string
  mimeType: string
  size?: number
  kind?: string
  alt?: string
  fileId: string
  url: string
}

/**
 * Sends the bytes to the configured File Module provider and keeps only the
 * resulting id/url in the workflow output. The base64 payload never reaches the
 * database or the workflow transaction log.
 */
const uploadStorefrontFilesStep = createStep(
  "upload-storefront-files",
  async (input: CreateStorefrontAssetsInput, { container }) => {
    const fileModule = container.resolve(Modules.FILE)
    const uploaded: UploadedFile[] = []

    for (const file of input.files) {
      const created = await fileModule.createFiles({
        filename: file.filename,
        mimeType: file.mimeType,
        content: file.content,
        access: "public",
      })

      uploaded.push({
        filename: file.filename,
        mimeType: file.mimeType,
        size: file.size,
        kind: file.kind,
        alt: file.alt,
        fileId: created.id,
        url: created.url,
      })
    }

    return new StepResponse(
      uploaded,
      uploaded.map((file) => file.fileId),
    )
  },
  async (fileIds, { container }) => {
    if (!fileIds?.length) {
      return
    }

    const fileModule = container.resolve(Modules.FILE)
    await fileModule.deleteFiles(fileIds)
  },
)

/**
 * Writes the durable row the admin media library reads from. The File Module
 * itself stores nothing in the database, so without this step an upload can
 * never be listed again.
 */
const createStorefrontAssetRecordsStep = createStep(
  "create-storefront-asset-records",
  async (input: { storeId: string; files: UploadedFile[] }, { container }) => {
    const assetModule = container.resolve(STOREFRONT_ASSET_MODULE)

    const assets = await assetModule.createStorefrontAssets(
      input.files.map((file) => ({
        store_id: input.storeId,
        file_id: file.fileId,
        url: file.url,
        filename: file.filename,
        mime_type: file.mimeType,
        size: file.size ?? null,
        kind: file.kind || "general",
        alt: file.alt ?? null,
      })),
    )

    return new StepResponse(
      assets,
      assets.map((asset) => asset.id),
    )
  },
  async (assetIds, { container }) => {
    if (!assetIds?.length) {
      return
    }

    const assetModule = container.resolve(STOREFRONT_ASSET_MODULE)
    await assetModule.deleteStorefrontAssets(assetIds)
  },
)

export const createStorefrontAssetsWorkflow = createWorkflow(
  "create-storefront-assets",
  (input: CreateStorefrontAssetsInput) => {
    const uploaded = uploadStorefrontFilesStep(input)
    const assets = createStorefrontAssetRecordsStep({
      storeId: input.storeId,
      files: uploaded,
    })

    return new WorkflowResponse(assets)
  },
)
