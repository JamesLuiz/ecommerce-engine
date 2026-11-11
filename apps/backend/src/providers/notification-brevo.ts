import type { Logger, NotificationTypes } from "@medusajs/framework/types"
import {
  AbstractNotificationProviderService,
  MedusaError,
  ModuleProvider,
  Modules,
} from "@medusajs/framework/utils"

import { renderEmailTemplate } from "../lib/email-templates"

type BrevoOptions = {
  apiKey: string
  fromEmail: string
  fromName?: string
  channels?: string[]
}

type InjectedDependencies = {
  logger: Logger
}

type BrevoPayload = {
  messageId?: string
  message?: string
  code?: string
}

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email"

/**
 * Brevo transactional email provider.
 *
 * Uses Brevo's REST API directly (no SDK) so the only moving part is `fetch`.
 * The email body is rendered from the shared template library, which keeps the
 * admin preview and the real send identical.
 */
export class BrevoNotificationService extends AbstractNotificationProviderService {
  static identifier = "brevo"

  protected config_: {
    apiKey: string
    fromEmail: string
    fromName: string
  }

  protected logger_: Logger

  constructor({ logger }: InjectedDependencies, options: BrevoOptions) {
    super()
    this.logger_ = logger
    this.config_ = {
      apiKey: options.apiKey,
      fromEmail: options.fromEmail,
      fromName: options.fromName ?? "",
    }
  }

  static validateOptions(options: Record<string, unknown>): void {
    if (!options?.apiKey || typeof options.apiKey !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Brevo notification provider requires BREVO_API_KEY"
      )
    }

    if (
      !options?.fromEmail ||
      typeof options.fromEmail !== "string" ||
      !options.fromEmail.includes("@")
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Brevo notification provider requires BREVO_FROM_EMAIL"
      )
    }
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (!notification) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No notification information provided"
      )
    }

    if (!notification.to || !notification.to.includes("@")) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Brevo notification provider requires a valid recipient email"
      )
    }

    const rendered = notification.content?.html
      ? {
          subject:
            notification.content.subject ??
            notification.template ??
            "A message from the store",
          html: notification.content.html,
          text: notification.content.text ?? "",
        }
      : renderEmailTemplate(
          notification.template ?? "campaign-generic",
          notification.data
        )

    const senderEmail =
      notification.from && notification.from.includes("@")
        ? notification.from.trim()
        : this.config_.fromEmail

    const sender: { email: string; name?: string } = { email: senderEmail }

    if (this.config_.fromName) {
      sender.name = this.config_.fromName
    }

    const body: Record<string, unknown> = {
      sender,
      to: [{ email: notification.to }],
      subject: rendered.subject,
      htmlContent: rendered.html,
      textContent: rendered.text,
    }

    const providerData = notification.provider_data ?? {}

    if (
      typeof providerData.cc === "string" &&
      providerData.cc.includes("@")
    ) {
      body.cc = [{ email: providerData.cc }]
    }

    if (Array.isArray(providerData.bcc)) {
      const bcc = providerData.bcc
        .filter(
          (value): value is string =>
            typeof value === "string" && value.includes("@")
        )
        .map((email) => ({ email }))

      if (bcc.length) {
        body.bcc = bcc
      }
    }

    if (
      typeof providerData.replyTo === "string" &&
      providerData.replyTo.includes("@")
    ) {
      body.replyTo = { email: providerData.replyTo }
    }

    if (Array.isArray(providerData.tags)) {
      const tags = providerData.tags.filter(
        (value): value is string => typeof value === "string" && value.length > 0
      )

      if (tags.length) {
        body.tags = tags
      }
    }

    let response: Response

    try {
      response = await fetch(BREVO_ENDPOINT, {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": this.config_.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      })
    } catch (error) {
      this.logger_.error(
        `Brevo request failed for ${notification.to}: ${
          (error as Error).message
        }`
      )
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to reach Brevo: ${(error as Error).message}`
      )
    }

    const payload = (await response.json().catch(() => null)) as
      | BrevoPayload
      | null

    if (!response.ok) {
      const detail = payload?.message ?? `HTTP ${response.status}`
      this.logger_.error(
        `Brevo rejected the email for ${notification.to}: ${detail}`
      )
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to send email via Brevo: ${detail}`
      )
    }

    return payload?.messageId ? { id: payload.messageId } : {}
  }
}

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [BrevoNotificationService],
})
