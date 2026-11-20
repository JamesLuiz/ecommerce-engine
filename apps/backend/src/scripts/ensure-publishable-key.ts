/**
 * Ensure a storefront publishable API key exists and print its token.
 *
 * Idempotent: reuses a publishable key titled "storefront" if present,
 * creates one if missing, and links it to a sales channel when available.
 *
 *   npx medusa exec ./src/scripts/ensure-publishable-key.ts
 */
import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"

const TITLE = "storefront"

export type PublishableKeyContext = {
  salesChannelId?: string
}

export default async function ensurePublishableKey(
  { container }: ExecArgs,
  context: PublishableKeyContext = {}
) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const pgConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL)

  // Pick a sales channel to link the key to (if any exist).
  const salesChannels = await salesChannelService.listSalesChannels(
    {},
    { take: 1, order: { created_at: "ASC" } }
  )
  const salesChannelId = (context.salesChannelId ??
    salesChannels[0]?.id) as string | undefined

  // Find or create the publishable key.
  const { data: publishableKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "type", "sales_channels.id"],
    filters: { type: "publishable" },
  })

  const existing = publishableKeys.find((key) => key.title === TITLE)
  let publishableKeyId = existing?.id as string | undefined
  let linkedSalesChannelIds = ((existing?.sales_channels ?? []) as { id?: string }[])
    .map((sc) => sc?.id)
    .filter((id): id is string => typeof id === "string")

  if (!publishableKeyId) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: TITLE,
            type: "publishable",
            created_by: "",
          },
        ],
      },
    })

    publishableKeyId = result[0]?.id
    linkedSalesChannelIds = []
    logger.info(`Created publishable API key "${TITLE}".`)
  } else {
    logger.info(`Publishable API key "${TITLE}" already exists.`)
  }

  if (!publishableKeyId) {
    throw new Error("Failed to resolve publishable API key id.")
  }

  // Link to a sales channel when available and not yet linked.
  if (salesChannelId && !linkedSalesChannelIds.includes(salesChannelId)) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: publishableKeyId, add: [salesChannelId] },
    })
    logger.info(`Linked publishable key to sales channel ${salesChannelId}.`)
  } else if (salesChannelId) {
    logger.info("Publishable key already linked to a sales channel.")
  } else {
    logger.warn(
      "No sales channel found; publishable key created but not linked to a sales channel."
    )
  }

  // Fetch and print the token.
  let token: string | undefined
  try {
    const row = await (pgConnection as any)("api_key")
      .select("token")
      .where({ id: publishableKeyId })
      .first()
    token = row?.token
  } catch {
    // fall through to generic message
  }

  if (token) {
    logger.info(`Publishable API key token: ${token}`)
    // Also print plainly so it is easy to copy from terminal output.
    console.log("")
    console.log("=== Publishable API key ===")
    console.log(`id:    ${publishableKeyId}`)
    console.log(`title: ${TITLE}`)
    console.log(`token: ${token}`)
    console.log("===========================")
    console.log("")
    console.log(
      "Use this token as MEDUSA_PUBLISHABLE_KEY (e.g. in apps/storefront/.env.local)."
    )
  } else {
    logger.warn(
      `Could not read token for publishable key ${publishableKeyId}. Check the api_key table.`
    )
    console.log(`Publishable key id: ${publishableKeyId} (token lookup failed)`)
  }
}
