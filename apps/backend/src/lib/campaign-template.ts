import type { StorefrontSettings } from "@flowcheq/storefront-config"

import type { CampaignDraft } from "./campaign-schema"

/**
 * Maps storefront settings + a campaign draft onto the flat data object the
 * shared email templates understand. Used by both the preview endpoint and the
 * real send so the two can never drift apart.
 */
export const buildCampaignTemplateData = (
  settings: StorefrontSettings,
  draft: CampaignDraft,
  recipientName?: string
): Record<string, unknown> => ({
  storeName: settings.brand.name,
  logoUrl: settings.brand.logoUrl,
  brandColor: settings.brand.accentColor,
  contactEmail: settings.footer.contact.email,
  contactPhone: settings.footer.contact.phone,
  address: settings.footer.contact.address,
  storeUrl: process.env.STOREFRONT_URL,
  subject: draft.subject,
  heading: draft.heading,
  body: draft.body,
  ctaLabel: draft.ctaLabel,
  ctaUrl: draft.ctaUrl,
  imageUrl: draft.imageUrl,
  recipientName,
})
