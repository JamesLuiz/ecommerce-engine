import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { z } from "zod"

import {
  buildInviteData,
  inviteLink,
  tokenFingerprint,
} from "../lib/auth-emails"
import { getStorefrontSettings } from "../lib/storefront-settings"

/**
 * Emails newly invited tenant admins their accept link.
 *
 * `bootstrap-tenant` creates the owner invite on every deploy, and staff can
 * resend invites from Users in the admin. Medusa emits `invite.created` and
 * `invite.resent` with the invite ids; the accept page already exists at
 * `/app/invite?token=`, so this subscriber only delivers the link through the
 * notification module (Brevo when configured).
 */
const InvitePayload = z.union([
  z.object({ id: z.string().min(1) }),
  z.array(z.object({ id: z.string().min(1) })),
])

interface InviteRow {
  id: string
  email?: string | null
  token?: string | null
  accepted?: boolean | null
}

export default async function userInviteHandler({
  event: { data },
  container,
}: SubscriberArgs<unknown>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const parsed = InvitePayload.safeParse(data)

  if (!parsed.success) {
    logger.warn("Skipping invite email: unexpected event payload.")
    return
  }

  const ids = [
    ...new Set(
      (Array.isArray(parsed.data) ? parsed.data : [parsed.data]).map(
        (item) => item.id
      )
    ),
  ]

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const storeService = container.resolve(Modules.STORE)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  const [store] = await storeService.listStores(
    {},
    { select: ["id", "name", "metadata"] }
  )
  const settings = getStorefrontSettings(store ?? null)
  const storeName = settings.brand.name || store?.name || "your store"

  for (const id of ids) {
    const result = await query.graph({
      entity: "invite",
      filters: { id },
      fields: ["id", "email", "token", "accepted"],
    })

    const invite = (result.data as InviteRow[])[0]

    if (!invite || !invite.email || !invite.token) {
      continue
    }

    if (invite.accepted) {
      continue
    }

    const link = inviteLink(invite.token)

    try {
      await notificationService.createNotifications({
        to: invite.email,
        channel: "email",
        template: "user-invite",
        data: buildInviteData({
          storeName,
          email: invite.email,
          actionUrl: link,
          logoUrl: settings.brand.logoUrl,
          brandColor: settings.brand.primaryColor,
          storeUrl: process.env.STOREFRONT_URL,
        }),
        trigger_type: "invite",
        resource_type: "invite",
        resource_id: `invite:${id}:${tokenFingerprint(invite.token)}`,
        idempotency_key: `invite:${id}:${tokenFingerprint(invite.token)}`,
      })

      logger.info(`Invite email sent to ${invite.email} (invite ${id}).`)
    } catch (error) {
      if (
        !process.env.BREVO_API_KEY &&
        process.env.NODE_ENV !== "production"
      ) {
        logger.info(
          `Email is not configured (BREVO_API_KEY unset). Invite link for ${invite.email}: ${link}`
        )
        continue
      }

      logger.error(
        `Failed to send invite email to ${invite.email}: ${(error as Error).message}`
      )
      throw error
    }
  }
}

export const config: SubscriberConfig = {
  event: ["invite.created", "invite.resent"],
}
