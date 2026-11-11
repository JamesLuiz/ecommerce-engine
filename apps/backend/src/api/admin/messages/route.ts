import { randomUUID } from "crypto"

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

import { campaignSendSchema } from "../../../lib/campaign-schema"
import { getStorefrontSettings } from "../../../lib/storefront-settings"
import { sendCampaignWorkflow } from "../../../workflows/campaign/send-campaign"

const MAX_RECENT = 20

const brevoConfigured = (): boolean =>
  Boolean(process.env.BREVO_API_KEY && process.env.BREVO_FROM_EMAIL)

/**
 * Campaign inbox status: provider configuration, audience size and the last
 * sends. Never exposes the Brevo API key.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeService = req.scope.resolve(Modules.STORE)
  const customerService = req.scope.resolve(Modules.CUSTOMER)
  const notificationService = req.scope.resolve(Modules.NOTIFICATION)

  const [store] = await storeService.listStores(
    {},
    { select: ["id", "name", "metadata"] }
  )
  const settings = getStorefrontSettings(store)

  const [, customerCount] = await customerService.listAndCountCustomers(
    {},
    { select: ["id"] }
  )

  let recent: Awaited<
    ReturnType<typeof notificationService.listNotifications>
  > = []

  try {
    recent = await notificationService.listNotifications(
      { channel: "email", trigger_type: "campaign" },
      {
        select: [
          "id",
          "to",
          "template",
          "status",
          "created_at",
          "resource_id",
        ],
        take: MAX_RECENT,
        order: { created_at: "DESC" },
      }
    )
  } catch {
    // Notification history is optional: an unconfigured provider or an empty
    // table should not break the compose screen.
  }

  res.json({
    configured: brevoConfigured(),
    fromEmail: process.env.BREVO_FROM_EMAIL ?? "",
    fromName: process.env.BREVO_FROM_NAME ?? "",
    storeName: settings.brand.name,
    audience: { customers: customerCount },
    recent: recent.map((notification) => ({
      id: notification.id,
      to: notification.to,
      template: notification.template ?? "",
      status: notification.status,
      createdAt: notification.created_at,
      campaignId: notification.resource_id ?? null,
    })),
  })
}

/**
 * Sends a campaign to the chosen audience.
 *
 * The optional `campaignId` lets the dashboard retry a failed send without
 * emailing addresses that already succeeded (per-recipient idempotency keys).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!brevoConfigured()) {
    res.status(400).json({
      type: "not_configured",
      message:
        "Brevo is not configured. Set BREVO_API_KEY and BREVO_FROM_EMAIL, then restart the backend.",
    })
    return
  }

  const parsed = campaignSendSchema.safeParse(req.body ?? {})

  if (!parsed.success) {
    res.status(400).json({
      type: "invalid_data",
      message: "Invalid campaign",
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    })
    return
  }

  const campaignId = parsed.data.campaignId ?? randomUUID()

  try {
    const { result } = await sendCampaignWorkflow(req.scope).run({
      input: { ...parsed.data, campaignId },
    })

    res.json({
      campaignId: result.campaignId,
      recipients: result.recipients,
      truncated: result.truncated,
      sent: result.delivery.sent,
      failed: result.delivery.failed,
      total: result.delivery.total,
      failures: result.delivery.failures,
    })
  } catch (error) {
    res.status(500).json({
      type: "send_failed",
      message: (error as Error).message,
    })
  }
}
