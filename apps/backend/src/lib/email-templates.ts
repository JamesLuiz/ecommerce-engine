/**
 * Shared, dependency-free email templates.
 *
 * Every outgoing vendor message (promotion, reminder, newsletter) renders
 * through this file so the admin preview and the real Brevo send can never
 * drift apart. All user supplied values are HTML-escaped and links are limited
 * to http(s) so a vendor cannot inject markup or a `javascript:` URL.
 */

export type EmailTemplateKind =
  | "promotion"
  | "reminder"
  | "newsletter"
  | "generic"

export type RenderedEmail = {
  subject: string
  html: string
  text: string
}

type TemplateDefaults = {
  subject: string
  heading: string
  body: string
  ctaLabel: string
}

const BRAND_COLOR = "#5B4FF9"
const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

const DEFAULTS: Record<EmailTemplateKind, TemplateDefaults> = {
  promotion: {
    subject: "A special offer from {{store}}",
    heading: "A special offer, just for you",
    body:
      "We put together something special for you. Take a look while it is still available.",
    ctaLabel: "Shop the offer",
  },
  reminder: {
    subject: "A quick reminder from {{store}}",
    heading: "Still thinking it over?",
    body:
      "Your favourites are still waiting. Come back whenever you are ready.",
    ctaLabel: "Return to the store",
  },
  newsletter: {
    subject: "News from {{store}}",
    heading: "Here is what is new",
    body: "Fresh arrivals, stories and updates from the store.",
    ctaLabel: "Read more",
  },
  generic: {
    subject: "A message from {{store}}",
    heading: "A message from {{store}}",
    body: "Thanks for being with us.",
    ctaLabel: "Visit the store",
  },
}

const asString = (value: unknown): string =>
  typeof value === "string" ? value : ""

export const escapeHtml = (value: unknown): string =>
  asString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

export const safeUrl = (value: unknown): string | null => {
  const raw = asString(value).trim()

  if (!/^https?:\/\//i.test(raw)) {
    return null
  }

  return raw.replace(/"/g, "%22").replace(/\s/g, "")
}

const safeColor = (value: unknown): string => {
  const raw = asString(value).trim()
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : BRAND_COLOR
}

export const resolveTemplateKind = (template: string): EmailTemplateKind => {
  const value = asString(template).toLowerCase()

  if (value.includes("promotion")) return "promotion"
  if (value.includes("reminder")) return "reminder"
  if (value.includes("newsletter")) return "newsletter"

  return "generic"
}

const fillPlaceholders = (
  value: string,
  storeName: string,
  recipientName: string
): string =>
  value
    .replace(/\{\{\s*store\s*\}\}/gi, storeName)
    .replace(/\{\{\s*name\s*\}\}/gi, recipientName)

const paragraphs = (value: string): string =>
  value
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#3F3F46;">${escapeHtml(
          paragraph
        ).replace(/\n/g, "<br />")}</p>`
    )
    .join("")

const textLines = (...values: Array<string | null | undefined>): string =>
  values.filter((value) => Boolean(value && value.trim())).join("\n")

export const renderEmailTemplate = (
  template: string,
  data?: Record<string, unknown> | null
): RenderedEmail => {
  const kind = resolveTemplateKind(template)
  const defaults = DEFAULTS[kind]
  const payload = data ?? {}

  const storeName = asString(payload.storeName).trim() || "the store"
  const recipientName = asString(payload.recipientName).trim() || "there"
  const brandColor = safeColor(payload.brandColor)
  const logoUrl = safeUrl(payload.logoUrl)
  const imageUrl = safeUrl(payload.imageUrl)
  const ctaUrl = safeUrl(payload.ctaUrl)
  const unsubscribeUrl = safeUrl(payload.unsubscribeUrl)
  const storeUrl = safeUrl(payload.storeUrl)

  const subject = fillPlaceholders(
    asString(payload.subject).trim() || defaults.subject,
    storeName,
    recipientName
  )
  const heading = fillPlaceholders(
    asString(payload.heading).trim() || defaults.heading,
    storeName,
    recipientName
  )
  const body = fillPlaceholders(
    asString(payload.body).trim() || defaults.body,
    storeName,
    recipientName
  )
  const ctaLabel = fillPlaceholders(
    asString(payload.ctaLabel).trim() || defaults.ctaLabel,
    storeName,
    recipientName
  )
  const preheader = fillPlaceholders(
    asString(payload.preheader).trim() || heading,
    storeName,
    recipientName
  )

  const contactEmail = asString(payload.contactEmail).trim()
  const contactPhone = asString(payload.contactPhone).trim()
  const address = asString(payload.address).trim()

  const contactLines = [
    contactEmail,
    contactPhone,
    address.replace(/\n/g, ", "),
  ].filter(Boolean)

  const logo = logoUrl
    ? `<img src="${logoUrl}" alt="${escapeHtml(
        storeName
      )}" height="32" style="display:block;max-height:32px;width:auto;margin:0 0 10px;" />`
    : ""

  const hero = imageUrl
    ? `<img src="${imageUrl}" alt="" style="display:block;width:100%;height:auto;max-height:300px;object-fit:cover;" />`
    : ""

  const cta =
    ctaUrl && ctaLabel
      ? `<div style="margin:24px 0 4px;"><a href="${ctaUrl}" style="display:inline-block;background:${brandColor};color:#FFFFFF;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600;">${escapeHtml(
          ctaLabel
        )}</a></div>`
      : ""

  const footerContact = contactLines.length
    ? `<div style="margin-bottom:8px;">${contactLines
        .map((line) => escapeHtml(line))
        .join("<br />")}</div>`
    : ""

  const footerStore = storeUrl
    ? `<div style="margin-bottom:8px;"><a href="${storeUrl}" style="color:#71717A;text-decoration:underline;">${escapeHtml(
        storeName
      )}</a></div>`
    : ""

  const footerUnsubscribe = unsubscribeUrl
    ? `<div style="margin-top:8px;"><a href="${unsubscribeUrl}" style="color:#71717A;text-decoration:underline;">Unsubscribe</a></div>`
    : `<div style="margin-top:8px;">You are receiving this email because you are a customer of ${escapeHtml(
        storeName
      )}.</div>`

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F4F4F5;font-family:${FONT_STACK};color:#18181B;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(
      preheader
    )}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E4E4E7;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #E4E4E7;">
                ${logo}
                <div style="font-size:18px;font-weight:700;color:#18181B;">${escapeHtml(
                  storeName
                )}</div>
              </td>
            </tr>
            ${
              hero
                ? `<tr><td style="padding:0;">${hero}</td></tr>`
                : ""
            }
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#18181B;">${escapeHtml(
                  heading
                )}</h1>
                ${paragraphs(body)}
                ${cta}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#FAFAFA;border-top:1px solid #E4E4E7;font-size:12px;line-height:1.6;color:#71717A;">
                ${footerContact}
                ${footerStore}
                <div>Powered by Flowcheq Commerce</div>
                ${footerUnsubscribe}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = textLines(
    heading,
    "",
    body,
    ctaUrl && ctaLabel ? "" : null,
    ctaUrl && ctaLabel ? `${ctaLabel}: ${ctaUrl}` : null,
    "",
    "--",
    storeName,
    ...contactLines,
    "Powered by Flowcheq Commerce",
    unsubscribeUrl
      ? `Unsubscribe: ${unsubscribeUrl}`
      : `You are receiving this email because you are a customer of ${storeName}.`
  )

  return { subject, html, text }
}
