import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { z } from "zod"

import {
  buildPasswordResetData,
  resetLink,
  tokenFingerprint,
} from "../lib/auth-emails"
import { getStorefrontSettings } from "../lib/storefront-settings"

/**
 * Emails the tenant owner their password-reset link.
 *
 * Medusa emits `auth.password_reset` from the generate-reset-password-token
 * workflow when someone calls
 * `POST /auth/user/emailpass/reset-password` with `{ "identifier": email }`.
 * The admin reset page already exists at `/app/reset-password?token=`, so
 * this subscriber only delivers the link through the notification module
 * (Brevo when configured).
 *
 * Without Brevo there is no email channel: in non-production the link is
 * written to the server log so local development still works. Production
 * tenants must set BREVO_API_KEY and BREVO_FROM_EMAIL.
 */
const ResetEventData = z.object({
  entity_id: z.string().min(1),
  actor_type: z.string().min(1),
  token: z.string().min(1),
  metadata: z.unknown().optional(),
})

export default async function authPasswordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<unknown>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const parsed = ResetEventData.safeParse(data)

  if (!parsed.success) {
    logger.warn("Skipping password-reset email: unexpected event payload.")
    return
  }

  const { entity_id: email, actor_type: actorType, token } = parsed.data

  if (actorType !== "user") {
    logger.info(
      `Skipping password-reset email for actor type "${actorType}".`
    )
    return
  }

  const storeService = container.resolve(Modules.STORE)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  const [store] = await storeService.listStores(
    {},
    { select: ["id", "name", "metadata"] }
  )
  const settings = getStorefrontSettings(store ?? null)
  const storeName = settings.brand.name || store?.name || "your store"
  const link = resetLink(token)

  try {
    await notificationService.createNotifications({
      to: email,
      channel: "email",
      template: "auth-password-reset",
      data: buildPasswordResetData({
        storeName,
        email,
        actionUrl: link,
        logoUrl: settings.brand.logoUrl,
        brandColor: settings.brand.primaryColor,
        storeUrl: process.env.STOREFRONT_URL,
      }),
      trigger_type: "auth",
      resource_type: "auth",
      resource_id: `password-reset:${tokenFingerprint(token)}`,
      idempotency_key: `password-reset:${tokenFingerprint(token)}`,
    })

    logger.info(`Password-reset email sent to ${email}.`)
  } catch (error) {
    if (
      !process.env.BREVO_API_KEY &&
      process.env.NODE_ENV !== "production"
    ) {
      logger.info(
        `Email is not configured (BREVO_API_KEY unset). Password-reset link for ${email}: ${link}`
      )
      return
    }

    logger.error(
      `Failed to send password-reset email to ${email}: ${(error as Error).message}`
    )
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
