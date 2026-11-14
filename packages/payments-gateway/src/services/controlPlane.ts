import { logger } from "../logger.js"

/**
 * Tells the control plane that a gateway transaction succeeded so it can mark
 * the matching plan order paid and queue tenant provisioning. Tenant storefront
 * checkouts also pass through this webhook; the control plane replies with an
 * "ignored" 200 for references that are not plan orders.
 */
export async function notifyControlPlaneOrderPaid(reference: string): Promise<void> {
  const dashboardUrl = process.env.DASHBOARD_URL
  const secret = process.env.ORDER_WEBHOOK_SECRET

  if (!dashboardUrl || !secret || !reference) {
    return
  }

  const url = `${dashboardUrl.replace(/\/+$/, "")}/api/internal/orders/by-reference/${encodeURIComponent(reference)}/paid`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(5_000),
    })

    if (!response.ok) {
      logger.warn(
        { reference, status: response.status },
        "control plane order notification failed",
      )
    }
  } catch (error) {
    logger.warn({ reference, error }, "control plane order notification error")
  }
}
