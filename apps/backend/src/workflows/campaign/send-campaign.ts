import type { StorefrontSettings } from "@flowcheq/storefront-config"
import { Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import type {
  CampaignAudience,
  CampaignKind,
} from "../../lib/campaign-schema"
import { buildCampaignTemplateData } from "../../lib/campaign-template"
import { getStorefrontSettings } from "../../lib/storefront-settings"

export type CampaignRecipient = {
  email: string
  name: string
}

export type SendCampaignInput = {
  campaignId: string
  kind: CampaignKind
  subject: string
  heading?: string
  body: string
  ctaLabel?: string
  ctaUrl?: string
  imageUrl?: string
  audience: CampaignAudience
  recipientEmails: string[]
}

type ResolveRecipientsInput = {
  audience: CampaignAudience
  recipientEmails: string[]
}

type ResolveRecipientsResult = {
  recipients: CampaignRecipient[]
  truncated: boolean
}

type SendCampaignStepInput = {
  campaignId: string
  kind: CampaignKind
  subject: string
  heading?: string
  body: string
  ctaLabel?: string
  ctaUrl?: string
  imageUrl?: string
  recipients: CampaignRecipient[]
}

const CUSTOMER_PAGE_SIZE = 500
const MAX_CUSTOMERS = 10000
const SEND_CONCURRENCY = 5

const runWithConcurrency = async <T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>
): Promise<void> => {
  let cursor = 0

  const workers = Array.from(
    { length: Math.min(Math.max(1, limit), items.length) },
    async () => {
      while (true) {
        const index = cursor
        cursor += 1

        if (index >= items.length) {
          return
        }

        await task(items[index])
      }
    }
  )

  await Promise.all(workers)
}

/**
 * Resolves the audience for a campaign.
 *
 * Customers are de-duplicated by lower-cased email so one person never gets
 * the same campaign twice. A hard cap keeps a single request from loading an
 * unbounded customer list into memory.
 */
export const resolveCampaignRecipientsStep = createStep(
  "resolve-campaign-recipients",
  async (
    input: ResolveRecipientsInput,
    { container }
  ) => {
    if (input.audience === "custom") {
      const seen = new Set<string>()
      const recipients: CampaignRecipient[] = []

      for (const value of input.recipientEmails) {
        const email = value.trim().toLowerCase()

        if (!email.includes("@") || seen.has(email)) {
          continue
        }

        seen.add(email)
        recipients.push({ email, name: "" })
      }

      return new StepResponse<ResolveRecipientsResult>({
        recipients,
        truncated: false,
      })
    }

    const customerService = container.resolve(Modules.CUSTOMER)
    const seen = new Set<string>()
    const recipients: CampaignRecipient[] = []
    let truncated = false
    let skip = 0

    while (true) {
      const page = await customerService.listCustomers(
        {},
        {
          select: ["id", "email", "first_name", "last_name"],
          take: CUSTOMER_PAGE_SIZE,
          skip,
        }
      )

      for (const customer of page) {
        const email = (customer.email ?? "").trim().toLowerCase()

        if (!email.includes("@") || seen.has(email)) {
          continue
        }

        seen.add(email)
        recipients.push({
          email,
          name: [customer.first_name, customer.last_name]
            .filter(Boolean)
            .join(" ")
            .trim(),
        })
      }

      if (page.length < CUSTOMER_PAGE_SIZE) {
        break
      }

      skip += CUSTOMER_PAGE_SIZE

      if (skip >= MAX_CUSTOMERS) {
        truncated = true
        break
      }
    }

    return new StepResponse<ResolveRecipientsResult>({
      recipients,
      truncated,
    })
  }
)

/**
 * Sends one notification per recipient.
 *
 * Each recipient gets its own `idempotency_key`, so retrying the same campaign
 * id skips addresses that already succeeded. A failure for one address is
 * recorded and does not stop the rest of the audience.
 */
export const sendCampaignStep = createStep(
  "send-campaign",
  async (input: SendCampaignStepInput, { container }) => {
    const notificationService = container.resolve(Modules.NOTIFICATION)
    const storeService = container.resolve(Modules.STORE)

    const [store] = await storeService.listStores(
      {},
      { select: ["id", "name", "metadata"] }
    )

    const settings = getStorefrontSettings(store) as StorefrontSettings
    const template = `campaign-${input.kind}`
    const failures: Array<{ email: string; message: string }> = []
    let sent = 0

    await runWithConcurrency(
      input.recipients,
      SEND_CONCURRENCY,
      async (recipient) => {
        const data = buildCampaignTemplateData(
          settings,
          {
            kind: input.kind,
            subject: input.subject,
            heading: input.heading,
            body: input.body,
            ctaLabel: input.ctaLabel,
            ctaUrl: input.ctaUrl,
            imageUrl: input.imageUrl,
          },
          recipient.name || undefined
        )

        try {
          await notificationService.createNotifications({
            to: recipient.email,
            channel: "email",
            template,
            data,
            trigger_type: "campaign",
            resource_type: "campaign",
            resource_id: input.campaignId,
            idempotency_key: `campaign:${input.campaignId}:${recipient.email}`,
          })

          sent += 1
        } catch (error) {
          failures.push({
            email: recipient.email,
            message: (error as Error).message,
          })
        }
      }
    )

    return new StepResponse({
      sent,
      failed: failures.length,
      total: input.recipients.length,
      failures: failures.slice(0, 20),
    })
  }
)

export const sendCampaignWorkflow = createWorkflow(
  "send-campaign",
  (input: SendCampaignInput) => {
    const resolved = resolveCampaignRecipientsStep({
      audience: input.audience,
      recipientEmails: input.recipientEmails,
    })

    const delivery = sendCampaignStep({
      campaignId: input.campaignId,
      kind: input.kind,
      subject: input.subject,
      heading: input.heading,
      body: input.body,
      ctaLabel: input.ctaLabel,
      ctaUrl: input.ctaUrl,
      imageUrl: input.imageUrl,
      recipients: resolved.recipients,
    })

    return new WorkflowResponse({
      campaignId: input.campaignId,
      recipients: resolved.recipients.length,
      truncated: resolved.truncated,
      delivery,
    })
  }
)
