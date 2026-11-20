/**
 * Idempotent bootstrap for one tenant's Medusa store.
 *
 * Runs from the container entrypoint after `medusa db:migrate`, before the
 * server starts. Every step checks for existing data first, so a retried
 * provisioning job or a restarted container converges instead of duplicating.
 *
 *   TENANT_CONFIG='{"slug":"acme",...}' npx medusa exec ./src/scripts/bootstrap-tenant.ts
 *
 * Configuration is read from the `TENANT_CONFIG` JSON environment variable and
 * validated with the shared `@flowcheq/tenant-config` schema. Nothing secret is
 * logged.
 */
import { TenantConfig } from "@flowcheq/tenant-config"
import {
  STOREFRONT_SETTINGS_METADATA_KEY,
  storefrontSettingsSchema,
  storefrontSettingsToMetadata,
} from "@flowcheq/storefront-config"
import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createInvitesWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createStoresWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateRegionsWorkflow,
  updateSalesChannelsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import ensureCheckoutSetup from "./ensure-checkout-setup"
import seedDemoProducts from "./seed-demo-products"

const DEFAULT_SALES_CHANNEL_NAME = "Default Sales Channel"
const STOREFRONT_API_KEY_TITLE = "storefront"
const SYSTEM_PAYMENT_PROVIDER = "pp_system_default"

const REGION_PRESETS: Record<
  "ng" | "us" | "eu",
  { name: string; countries: string[] }
> = {
  ng: { name: "Nigeria", countries: ["ng"] },
  us: { name: "United States", countries: ["us"] },
  eu: { name: "Europe", countries: ["de", "fr", "es", "it", "nl"] },
}

function readTenantConfig(): TenantConfig | null {
  const raw = process.env.TENANT_CONFIG

  if (!raw || !raw.trim()) {
    return null
  }

  let value: unknown

  try {
    value = JSON.parse(raw)
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "TENANT_CONFIG must be valid JSON."
    )
  }

  const parsed = TenantConfig.safeParse(value)

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ")

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid TENANT_CONFIG: ${details}`
    )
  }

  return parsed.data
}

export default async function bootstrapTenant({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const config = readTenantConfig()

    if (!config) {
      logger.info(
        "TENANT_CONFIG not provided; skipping tenant bootstrap. The server will start and can be set up manually."
      )
      return
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const regionService = container.resolve(Modules.REGION)
    const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
    const storeService = container.resolve(Modules.STORE)
    const userService = container.resolve(Modules.USER)

  const currencyCode = config.currency.toLowerCase()
  const regionPreset = REGION_PRESETS[config.region]

  logger.info(`Bootstrapping tenant "${config.slug}".`)

  // --- Region -----------------------------------------------------------------
  const regions = await regionService.listRegions({})
  const existingRegion = regions.find(
    (candidate) => candidate.metadata?.flowcheq_region === config.region
  )
  let regionId: string

  if (existingRegion) {
    logger.info(`Region for "${config.region}" already exists.`)
    regionId = existingRegion.id
  } else {
    const existingWithOverlap = regions.find((candidate) =>
      (candidate.countries ?? []).some((country) =>
        regionPreset.countries.includes(country.iso_2 ?? "")
      )
    )

    if (existingWithOverlap) {
      // A country can only belong to one region. When the starter data already
      // assigned the same countries (the Europe region covers these codes), the
      // tenant reuses that region instead of creating a conflicting one.
      const countries = Array.from(
        new Set([
          ...(existingWithOverlap.countries ?? []).map((country) => country.iso_2 ?? ""),
          ...regionPreset.countries,
        ])
      )

      const { result } = await updateRegionsWorkflow(container).run({
        input: {
          selector: { id: existingWithOverlap.id },
          update: {
            name: regionPreset.name,
            currency_code: currencyCode,
            countries,
            metadata: {
              ...existingWithOverlap.metadata,
              flowcheq_region: config.region,
            },
          },
        },
      })

      regionId = result[0].id
      logger.info(
        `Reused the existing region "${regionPreset.name}" for "${config.region}".`
      )
    } else {
      const { result } = await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: regionPreset.name,
              currency_code: currencyCode,
              countries: regionPreset.countries,
              payment_providers: [SYSTEM_PAYMENT_PROVIDER],
              metadata: { flowcheq_region: config.region },
            },
          ],
        },
      })

      regionId = result[0].id
      logger.info(`Created region "${regionPreset.name}".`)
    }
  }

  // --- Sales channel ----------------------------------------------------------
  const salesChannels = await salesChannelService.listSalesChannels({})
  let salesChannel = salesChannels.find(
    (candidate) => candidate.name === config.businessName
  )

  if (!salesChannel) {
    const defaultSalesChannel = salesChannels.find(
      (candidate) =>
        candidate.name === DEFAULT_SALES_CHANNEL_NAME
    )

    if (defaultSalesChannel) {
      const { result } = await updateSalesChannelsWorkflow(container).run({
        input: {
          selector: { id: defaultSalesChannel.id },
          update: { name: config.businessName },
        },
      })

      salesChannel = result[0]
      logger.info("Renamed the default sales channel for this tenant.")
    } else {
      const { result } = await createSalesChannelsWorkflow(container).run({
        input: {
          salesChannelsData: [
            {
              name: config.businessName,
              description: "Created by Flowcheq Commerce",
            },
          ],
        },
      })

      salesChannel = result[0]
      logger.info(`Created sales channel "${config.businessName}".`)
    }
  } else {
    logger.info(`Sales channel "${config.businessName}" already exists.`)
  }

  // --- Store ------------------------------------------------------------------
  const [store] = await storeService.listStores({}, { take: 1 })

  const buildDefaultStorefrontMetadata = () => {
    const brandName = config.businessName
    const primaryColor = config.brand?.primaryColor || "#111111"
    const logoUrl = config.brand?.logoUrl || ""

    const defaults = storefrontSettingsSchema.parse({
      brand: {
        name: brandName,
        tagline: `Quality products from ${brandName}`,
        description: `${brandName} brings you a curated selection of products. Shop online, pay securely, and get your order delivered.`,
        vendorName: brandName,
        logoUrl,
        faviconUrl: "",
        primaryColor,
        accentColor: "#111111",
        fontFamily: "sans",
        cornerRadius: "md",
      },
      theme: { mode: "light", preset: "minimal" },
      layout: {
        headerStyle: "centered",
        footerStyle: "compact",
        homepageHeroEnabled: true,
        homepageFeaturedEnabled: true,
      },
      homepage: {
        hero: {
          enabled: true,
          eyebrow: "Welcome",
          title: brandName,
          heading: `Shop ${brandName}`,
          description:
            "Discover our latest products, add your favourites to cart, and check out securely. New arrivals and bestsellers are just a click away.",
          primaryCta: "Shop now",
          secondaryCta: "Browse all",
          imageUrl: "",
        },
        showcase: {
          enabled: true,
          label: "Featured",
          badge: "New",
          eyebrow: "Handpicked for you",
          title: "Popular picks",
          price: "",
          imageUrl: "",
          href: "/store",
        },
        featuredEnabled: true,
        stats: [],
      },
      navigation: {
        links: [
          { label: "Home", href: "/" },
          { label: "Shop", href: "/store" },
          { label: "Account", href: "/account" },
        ],
      },
      features: {
        announcementBarEnabled: true,
        announcementBarText: `Welcome to ${brandName}. Shop our latest products online.`,
        announcementBarCtaLabel: "Shop now",
        announcementBarCtaHref: "/store",
        showSearch: true,
        showAccount: true,
        showLocaleSelector: true,
        showCountrySelector: true,
        whatsappEnabled: false,
        whatsappNumber: "",
        newsletterEnabled: false,
      },
      footer: {
        contact: {
          email: config.ownerEmail || "",
          phone: "",
          address: "",
          hours: "",
        },
        socials: [],
        legal: [],
        copyright: `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`,
        poweredBy: true,
      },
      seo: {
        defaultTitle: brandName,
        titleTemplate: `%s | ${brandName}`,
        description: `Shop ${brandName} online. Browse products, place orders, and pay securely.`,
        keywords: [brandName, "online store", "shop", "ecommerce"],
        ogImageUrl: logoUrl,
      },
    })

    return storefrontSettingsToMetadata(defaults)
  }

  let activeStore = store

  if (!store) {
    const { result } = await createStoresWorkflow(container).run({
      input: {
        stores: [
          {
            name: config.businessName,
            supported_currencies: [
              { currency_code: currencyCode, is_default: true },
            ],
            default_sales_channel_id: salesChannel.id,
            default_region_id: regionId,
            metadata: buildDefaultStorefrontMetadata(),
          },
        ],
      },
    })

    activeStore = result[0]
    logger.info(`Created store "${config.businessName}" with default storefront settings.`)
  } else {
    const existingMetadata = (store.metadata ?? {}) as Record<string, unknown>
    const hasStorefrontSettings = Boolean(existingMetadata[STOREFRONT_SETTINGS_METADATA_KEY])
    const nextMetadata = hasStorefrontSettings
      ? existingMetadata
      : { ...existingMetadata, ...buildDefaultStorefrontMetadata() }

    const { result } = await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          name: config.businessName,
          supported_currencies: [
            { currency_code: currencyCode, is_default: true },
          ],
          default_sales_channel_id: salesChannel.id,
          default_region_id: regionId,
          ...(hasStorefrontSettings ? {} : { metadata: nextMetadata }),
        },
      },
    })

    activeStore = result[0] ?? store
    if (hasStorefrontSettings) {
      logger.info(`Updated store "${config.businessName}" (kept existing storefront settings).`)
    } else {
      logger.info(`Updated store "${config.businessName}" and seeded default storefront settings.`)
    }
  }

  // --- Publishable API key ----------------------------------------------------
  const { data: publishableKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "type", "sales_channels.id"],
    filters: { type: "publishable" },
  })

  const existingPublishableKey = publishableKeys.find(
    (candidate) => candidate.title === STOREFRONT_API_KEY_TITLE
  )
  let publishableKeyId = existingPublishableKey?.id
  let linkedSalesChannelIds = (existingPublishableKey?.sales_channels ?? [])
    .map((linked) => linked?.id)
    .filter((id): id is string => typeof id === "string")

  if (!publishableKeyId) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: STOREFRONT_API_KEY_TITLE,
            type: "publishable",
            created_by: "",
          },
        ],
      },
    })

    publishableKeyId = result[0].id
    linkedSalesChannelIds = []
    logger.info(`Created publishable API key "${STOREFRONT_API_KEY_TITLE}".`)
  } else {
    logger.info(
      `Publishable API key "${STOREFRONT_API_KEY_TITLE}" already exists.`
    )
  }

  if (!linkedSalesChannelIds.includes(salesChannel.id)) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: publishableKeyId, add: [salesChannel.id] },
    })

    logger.info("Linked the storefront publishable key to the sales channel.")
  } else {
    logger.info("Publishable key is already linked to the sales channel.")
  }

  // --- Checkout defaults -----------------------------------------------------
  // Must run before demo products so the productsCreated hook can stock them.
  try {
    await ensureCheckoutSetup({ container, args }, {
      storeId: activeStore.id,
      salesChannelId: salesChannel.id,
      regionId,
      countryCode: regionPreset.countries[0],
      currencyCode,
    })
  } catch (error) {
    logger.warn(
      `Checkout setup will retry on the next start: ${
        (error as Error)?.message ?? String(error)
      }`
    )
  }

  // --- Admin invite -----------------------------------------------------------
  const users = await userService.listUsers({ email: config.ownerEmail })

  if (users.length > 0) {
    logger.info("Admin user already exists; skipping invite.")
  } else {
    const invites = await userService.listInvites({ email: config.ownerEmail })

    if (invites.length > 0) {
      logger.info("Admin invite already exists; skipping invite.")
    } else {
      await createInvitesWorkflow(container).run({
        input: { invites: [{ email: config.ownerEmail }] },
      })

      logger.info(`Created admin invite for ${config.ownerEmail}.`)
    }
  }

  // --- Optional demo data -----------------------------------------------------
  if (process.env.SEED_DEMO === "true") {
    await seedDemoProducts({ container, args })

    logger.info("Seeded demo products.")
  } else {
    logger.info("SEED_DEMO is not \"true\"; skipped demo products.")
  }

    logger.info(`Tenant "${config.slug}" bootstrap complete.`)
  } catch (error) {
    logger.error(
      `Tenant bootstrap failed but will not block deployment: ${(error as Error)?.message ?? error}`
    )
  }
}
