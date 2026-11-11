import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

import { campaignPreviewSchema } from "../../../../lib/campaign-schema"
import { buildCampaignTemplateData } from "../../../../lib/campaign-template"
import { renderEmailTemplate } from "../../../../lib/email-templates"
import { getStorefrontSettings } from "../../../../lib/storefront-settings"

/**
 * Renders the exact HTML/plain-text the provider will send. Used by the admin
 * compose screen so the preview is always one source of truth with the send.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = campaignPreviewSchema.safeParse(req.body ?? {})

  if (!parsed.success) {
    res.status(400).json({
      type: "invalid_data",
      message: "Invalid campaign draft",
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    })
    return
  }

  const storeService = req.scope.resolve(Modules.STORE)
  const [store] = await storeService.listStores(
    {},
    { select: ["id", "name", "metadata"] }
  )
  const settings = getStorefrontSettings(store)

  const data = buildCampaignTemplateData(
    settings,
    parsed.data,
    parsed.data.previewName || "Ada"
  )

  res.json(renderEmailTemplate(`campaign-${parsed.data.kind}`, data))
}
