import { z } from "@medusajs/framework/zod"

export const campaignKindSchema = z.enum([
  "promotion",
  "reminder",
  "newsletter",
])

export const campaignAudienceSchema = z.enum(["customers", "custom"])

export type CampaignKind = z.infer<typeof campaignKindSchema>
export type CampaignAudience = z.infer<typeof campaignAudienceSchema>

const optionalHttpUrl = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || /^https?:\/\//i.test(value), {
    message: "Enter an http(s) URL",
  })

export const campaignDraftSchema = z.object({
  kind: campaignKindSchema.default("promotion"),
  subject: z.string().trim().min(1, "Add a subject").max(160),
  heading: z.string().trim().max(160).optional(),
  body: z.string().trim().min(1, "Add a message").max(5000),
  ctaLabel: z.string().trim().max(80).optional(),
  ctaUrl: optionalHttpUrl,
  imageUrl: optionalHttpUrl,
})

export const campaignPreviewSchema = campaignDraftSchema.extend({
  previewName: z.string().trim().max(80).optional(),
})

export const campaignSendSchema = campaignDraftSchema
  .extend({
    audience: campaignAudienceSchema.default("customers"),
    recipientEmails: z
      .array(z.string().trim().email("Enter a valid email address"))
      .max(500, "Send to at most 500 recipients at a time")
      .default([]),
    campaignId: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{8,80}$/, "Invalid campaign id")
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.audience === "custom" && value.recipientEmails.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["recipientEmails"],
        message: "Add at least one recipient email",
      })
    }
  })

export type CampaignDraft = z.infer<typeof campaignDraftSchema>
export type CampaignSendInput = z.infer<typeof campaignSendSchema>

export const splitRecipientEmails = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  )
