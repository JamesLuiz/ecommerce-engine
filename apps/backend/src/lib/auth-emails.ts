import { createHash } from "node:crypto"

/**
 * Helpers for tenant admin auth emails (owner invite + password reset).
 *
 * The Medusa admin already ships the invite-accept and reset-password pages
 * under `/app`, so these helpers only build the absolute links and the data
 * object the shared generic email template understands. Delivery happens in
 * the subscribers in `src/subscribers` through the notification module
 * (Brevo when configured).
 */

export const ADMIN_INVITE_PATH = "/app/invite"
export const ADMIN_RESET_PATH = "/app/reset-password"

/** Public origin of the tenant admin. Never a secret. */
export const adminBaseUrl = (): string => {
  const raw = process.env.MEDUSA_ADMIN_BACKEND_URL?.trim()

  if (raw) {
    return raw.replace(/\/+$/, "")
  }

  return "http://localhost:9000"
}

export const inviteLink = (token: string): string =>
  `${adminBaseUrl()}${ADMIN_INVITE_PATH}?token=${encodeURIComponent(token)}`

export const resetLink = (token: string): string =>
  `${adminBaseUrl()}${ADMIN_RESET_PATH}?token=${encodeURIComponent(token)}`

/**
 * Short hash for log lines and notification resource ids. The token itself
 * never appears in logs; the fingerprint only lets staff correlate attempts.
 */
export const tokenFingerprint = (token: string): string =>
  createHash("sha256").update(token).digest("hex").slice(0, 12)

export interface AuthEmailInput {
  storeName: string
  email: string
  actionUrl: string
  logoUrl?: string
  brandColor?: string
  storeUrl?: string
}

const baseData = (input: AuthEmailInput): Record<string, unknown> => ({
  storeName: input.storeName,
  recipientName: input.email,
  logoUrl: input.logoUrl ?? "",
  brandColor: input.brandColor ?? "",
  storeUrl: input.storeUrl ?? "",
})

/** Data for the shared generic email template (see lib/email-templates). */
export const buildPasswordResetData = (
  input: AuthEmailInput
): Record<string, unknown> => ({
  ...baseData(input),
  subject: `Reset your password - ${input.storeName}`,
  heading: "Reset your password",
  body: "We received a request to reset the password for this email address. Open the button below to choose a new password. The link expires in 15 minutes. If you did not ask for this, you can safely ignore this email.",
  ctaLabel: "Choose a new password",
  ctaUrl: input.actionUrl,
})

/** Data for the shared generic email template (see lib/email-templates). */
export const buildInviteData = (
  input: AuthEmailInput
): Record<string, unknown> => ({
  ...baseData(input),
  subject: `You are invited to manage ${input.storeName}`,
  heading: `You are invited to manage ${input.storeName}`,
  body: "Your store is ready. Accept this invite to create your admin account and set your password. The invite link expires 24 hours after it was issued; ask us for a fresh one if it lapses.",
  ctaLabel: "Accept invite",
  ctaUrl: input.actionUrl,
})
