import { Client } from "pg"
import { and, eq } from "drizzle-orm"

import { decrypt, encrypt, generateSecret } from "@flowcheq/db"
import { TenantConfig } from "@flowcheq/tenant-config"
import { tenant_secrets, tenants } from "@flowcheq/db"
import { createTenantDatabase, generateTenantPassword, tenantConnectionUrl } from "./tenant-db"
import { waitForDeployment } from "./coolify"
import type {
  AppDb,
  ProvisionStepContext,
  ProvisionStepDefinition,
} from "./types"

export const SECRET_KEYS = ["jwt_secret", "cookie_secret", "db_password"] as const

export const BACKEND_IMAGE = process.env.BACKEND_IMAGE ?? "ghcr.io/flowcheq/backend"
export const STOREFRONT_IMAGE = process.env.STOREFRONT_IMAGE ?? "ghcr.io/flowcheq/storefront"

const STOREFRONT_API_KEY_TITLE = "storefront"

async function findSecretRow(database: AppDb, tenantId: string, key: string) {
  const rows = await database
    .select()
    .from(tenant_secrets)
    .where(
      and(
        eq(tenant_secrets.tenant_id, tenantId),
        eq(tenant_secrets.key, key)
      )
    )

  const row = rows[0]

  if (!row) {
    return null
  }

  return {
    key: row.key,
    value_enc: row.value_enc,
  }
}

async function storeSecret(database: AppDb, tenantId: string, key: string, value: string): Promise<void> {
  await database
    .insert(tenant_secrets)
    .values({
      tenant_id: tenantId,
      key,
      value_enc: encrypt(value),
    })
    .onConflictDoNothing()
}

async function upsertSecret(database: AppDb, tenantId: string, key: string, value: string): Promise<void> {
  const valueEnc = encrypt(value)

  await database
    .insert(tenant_secrets)
    .values({
      tenant_id: tenantId,
      key,
      value_enc: valueEnc,
    })
    .onConflictDoUpdate({
      target: [tenant_secrets.tenant_id, tenant_secrets.key],
      set: { value_enc: valueEnc },
    })
}

async function readSecretOrNull(database: AppDb, tenantId: string, key: string): Promise<string | null> {
  const row = await findSecretRow(database, tenantId, key)

  if (!row) {
    return null
  }

  return decrypt(row.value_enc)
}

export function tenantHosts(slug: string): { storeUrl: string; adminUrl: string } {
  const domain = process.env.STORE_BASE_DOMAIN

  if (!domain) {
    return { storeUrl: "", adminUrl: "" }
  }

  return {
    storeUrl: `https://${slug}.${domain}`,
    adminUrl: `https://admin-${slug}.${domain}`,
  }
}

function buildBackendEnv(ctx: ProvisionStepContext, tenantConfig: TenantConfig): Record<string, string> {
  const dbName = ctx.tenant.db_name ?? ctx.apps?.database
  const dbPassword = ctx.secrets?.dbPassword
  const jwtSecret = ctx.secrets?.jwtSecret
  const cookieSecret = ctx.secrets?.cookieSecret

  if (!dbName) {
    throw new Error("Tenant database name was not resolved")
  }

  if (!dbPassword) {
    throw new Error("Tenant database password was not resolved")
  }

  if (!jwtSecret || !cookieSecret) {
    throw new Error("Tenant signing secrets were not resolved")
  }

  const dbHost = process.env.TENANT_PG_HOST ?? "localhost"
  const dbPort = process.env.TENANT_PG_PORT ?? "5432"
  const { storeUrl, adminUrl } = tenantHosts(ctx.tenant.slug)

  const env: Record<string, string> = {
    DATABASE_URL: `postgres://${dbName}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`,
    REDIS_URL: process.env.TENANT_REDIS_URL ?? "redis://localhost:6379",
    JWT_SECRET: jwtSecret,
    COOKIE_SECRET: cookieSecret,
    STORE_CORS: storeUrl,
    ADMIN_CORS: adminUrl,
    AUTH_CORS: `${storeUrl},${adminUrl}`,
    TENANT_CONFIG: JSON.stringify(tenantConfig),
    DB_POOL_MAX: "5",
    NODE_ENV: "production",
    MEDUSA_ADMIN_BACKEND_URL: adminUrl,
    STOREFRONT_URL: storeUrl,
  }

  if (process.env.GATEWAY_URL) {
    env.GATEWAY_URL = process.env.GATEWAY_URL
  }

  if (ctx.secrets?.gatewayToken) {
    env.GATEWAY_TOKEN = ctx.secrets.gatewayToken
  }

  if (ctx.secrets?.gatewayWebhookSecret) {
    env.GATEWAY_WEBHOOK_SECRET = ctx.secrets.gatewayWebhookSecret
  }

  if (process.env.BREVO_API_KEY) {
    env.BREVO_API_KEY = process.env.BREVO_API_KEY
    env.BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL ?? ""
    env.BREVO_FROM_NAME = process.env.BREVO_FROM_NAME ?? ""
  }

  return env
}

function buildStorefrontEnv(ctx: ProvisionStepContext, tenantConfig: TenantConfig): Record<string, string> {
  const { storeUrl, adminUrl } = tenantHosts(ctx.tenant.slug)

  return {
    MEDUSA_BACKEND_URL: adminUrl,
    MEDUSA_PUBLISHABLE_KEY: ctx.bootstrap?.publishableKey ?? "",
    STORE_NAME: tenantConfig.businessName,
    BRAND_PRIMARY_COLOR: tenantConfig.brand.primaryColor,
    BRAND_LOGO_URL: tenantConfig.brand.logoUrl ?? "",
    STORE_BASE_URL: storeUrl,
  }
}

function parseTenantConfig(ctx: ProvisionStepContext): TenantConfig {
  const parsed = TenantConfig.safeParse(ctx.tenant.config)

  if (!parsed.success) {
    throw new Error(`Invalid tenant config: ${JSON.stringify(parsed.error)}`)
  }

  return parsed.data
}

export const DEFAULT_STEPS: ProvisionStepDefinition[] = [
  {
    key: "validate",
    run: async (ctx) => {
      parseTenantConfig(ctx)
    },
  },
  {
    key: "secrets",
    run: async (ctx) => {
      const database = ctx.db

      if (!database) {
        throw new Error("Control plane database is required for the secrets step")
      }

      const tenantId = ctx.tenant.id

      // Reuse values that were persisted by an earlier attempt. Only missing
      // secrets are generated so a retry keeps existing tenant containers valid.
      const jwtSecret = (await readSecretOrNull(database, tenantId, "jwt_secret")) ?? generateSecret()
      const cookieSecret =
        (await readSecretOrNull(database, tenantId, "cookie_secret")) ?? generateSecret()
      const dbPassword =
        (await readSecretOrNull(database, tenantId, "db_password")) ?? generateTenantPassword()

      await storeSecret(database, tenantId, "jwt_secret", jwtSecret)
      await storeSecret(database, tenantId, "cookie_secret", cookieSecret)
      await storeSecret(database, tenantId, "db_password", dbPassword)

      let gatewayToken = await readSecretOrNull(database, tenantId, "gateway_token")
      let gatewayWebhookSecret = await readSecretOrNull(database, tenantId, "gateway_webhook_secret")

      // Provision vendor in payments gateway if gateway is configured
      const gatewayUrl = process.env.GATEWAY_URL
      const adminToken = process.env.PAYMENTS_GATEWAY_ADMIN_TOKEN || process.env.ADMIN_TOKEN

      if (gatewayUrl && adminToken && (!gatewayToken || !gatewayWebhookSecret)) {
        try {
          const config = parseTenantConfig(ctx)
          const { storeUrl, adminUrl } = tenantHosts(ctx.tenant.slug)
          const webhookUrl = `${adminUrl}/hooks/payment/paystack-gateway_paystack-gateway`
          const res = await fetch(`${gatewayUrl.replace(/\/+$/, "")}/admin/vendors`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${adminToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              slug: ctx.tenant.slug,
              name: (config as any)?.brand?.name || ctx.tenant.slug,
              webhook_url: webhookUrl,
              allowed_origins: [storeUrl, adminUrl],
            }),
          })

          if (res.ok) {
            const data = (await res.json()) as { token: string; webhook_signing_secret: string }
            gatewayToken = data.token
            gatewayWebhookSecret = data.webhook_signing_secret
            await storeSecret(database, tenantId, "gateway_token", gatewayToken)
            await storeSecret(database, tenantId, "gateway_webhook_secret", gatewayWebhookSecret)
          }
        } catch (err) {
          console.warn("Failed to register vendor on payments gateway:", err)
        }
      }

      ctx.secrets = {
        jwtSecret,
        cookieSecret,
        dbPassword,
        gatewayToken: gatewayToken || undefined,
        gatewayWebhookSecret: gatewayWebhookSecret || undefined,
      }
    },
  },
  {
    key: "database",
    run: async (ctx) => {
      const database = ctx.db

      if (!database) {
        throw new Error("Control plane database is required for the database step")
      }

      const secrets = ctx.secrets

      if (!secrets) {
        throw new Error("Tenant secrets are required for the database step")
      }

      if (!secrets.dbPassword) {
        throw new Error("Tenant database password was not resolved")
      }

      const credentials = await createTenantDatabase(ctx.tenant.slug, secrets.dbPassword)

      ctx.apps = { ...ctx.apps, database: credentials.name }
      ctx.tenant = { ...ctx.tenant, db_name: credentials.name }

      // Persist the database name so later steps and resumed jobs can build the
      // connection URL without relying on in-memory state.
      await database
        .update(tenants)
        .set({ db_name: credentials.name })
        .where(eq(tenants.id, ctx.tenant.id))
    },
  },
  {
    key: "backend_app",
    run: async (ctx) => {
      const coolify = ctx.coolify

      if (!coolify) {
        throw new Error("Coolify client is required for the backend_app step")
      }

      const tenantConfig = parseTenantConfig(ctx)
      const env = buildBackendEnv(ctx, tenantConfig)
      const version = ctx.tenant.version ?? "latest"
      const name = `backend-${ctx.tenant.slug}`
      const existing = (await coolify.listApplications()).find((app) => app.name === name)
      let backendUuid: string

      if (existing) {
        await coolify.updateApplication(existing.uuid, {
          dockerRegistryImageTag: version,
          portsExposes: "9000",
        })
        backendUuid = existing.uuid
      } else {
        const created = await coolify.createApplication({
          projectUuid: process.env.COOLIFY_PROJECT_UUID ?? "",
          serverUuid: process.env.COOLIFY_SERVER_UUID ?? "",
          environmentName: process.env.COOLIFY_ENVIRONMENT_NAME ?? "production",
          name,
          dockerRegistryImageName: BACKEND_IMAGE,
          dockerRegistryImageTag: version,
          portsExposes: "9000",
          domains: tenantHosts(ctx.tenant.slug).adminUrl,
          healthCheckPath: "/health",
          instantDeploy: false,
        })
        backendUuid = created.uuid
      }

      ctx.apps = { ...ctx.apps, backend: backendUuid }

      for (const [key, value] of Object.entries(env)) {
        await coolify.setEnvironmentVariable(backendUuid, key, value)
      }
    },
  },
  {
    key: "storefront_app",
    run: async (ctx) => {
      const coolify = ctx.coolify

      if (!coolify) {
        throw new Error("Coolify client is required for the storefront_app step")
      }

      const tenantConfig = parseTenantConfig(ctx)
      const env = buildStorefrontEnv(ctx, tenantConfig)
      const version = ctx.tenant.version ?? "latest"
      const name = `storefront-${ctx.tenant.slug}`
      const existing = (await coolify.listApplications()).find((app) => app.name === name)
      let storefrontUuid: string

      if (existing) {
        await coolify.updateApplication(existing.uuid, {
          dockerRegistryImageTag: version,
          portsExposes: "3000",
        })
        storefrontUuid = existing.uuid
      } else {
        const created = await coolify.createApplication({
          projectUuid: process.env.COOLIFY_PROJECT_UUID ?? "",
          serverUuid: process.env.COOLIFY_SERVER_UUID ?? "",
          environmentName: process.env.COOLIFY_ENVIRONMENT_NAME ?? "production",
          name,
          dockerRegistryImageName: STOREFRONT_IMAGE,
          dockerRegistryImageTag: version,
          portsExposes: "3000",
          domains: tenantHosts(ctx.tenant.slug).storeUrl,
          healthCheckPath: "/health",
          instantDeploy: false,
        })
        storefrontUuid = created.uuid
      }

      ctx.apps = { ...ctx.apps, storefront: storefrontUuid }

      for (const [key, value] of Object.entries(env)) {
        await coolify.setEnvironmentVariable(storefrontUuid, key, value)
      }
    },
  },
  {
    key: "dns",
    run: async () => {
      // Wildcard DNS records are handled in Phase 9; nothing to do while they are pending.
    },
  },
  {
    key: "deploy_backend",
    run: async (ctx) => {
      const coolify = ctx.coolify

      if (!coolify) {
        throw new Error("Coolify client is required for the deploy_backend step")
      }

      const backendUuid = ctx.apps?.backend

      if (!backendUuid) {
        throw new Error("Backend Coolify application uuid was not resolved")
      }

      const deploy = await coolify.deploy({ uuid: backendUuid, force: true })
      const deployment = await waitForDeployment(coolify, deploy.deploymentUuid)

      if (deployment.status !== "success") {
        throw new Error(`Backend deployment ${deploy.deploymentUuid} did not succeed: ${deployment.status}`)
      }
    },
  },
  {
    key: "read_bootstrap",
    run: async (ctx) => {
      const database = ctx.db

      if (!database) {
        throw new Error("Control plane database is required for the read_bootstrap step")
      }

      const tenantConfig = parseTenantConfig(ctx)
      const dbName = ctx.apps?.database ?? ctx.tenant.db_name
      const dbPassword = ctx.secrets?.dbPassword

      if (!dbName) {
        throw new Error("Tenant database was not created")
      }

      if (!dbPassword) {
        throw new Error("Tenant database password was not resolved")
      }

      const client = new Client({ connectionString: tenantConnectionUrl(dbName, dbPassword) })
      await client.connect()

      try {
        const keyResult = await client.query<{ token: string }>(
          `select token from api_key
           where type = 'publishable'
             and title = $1
             and deleted_at is null
             and revoked_at is null
           order by created_at asc
           limit 1`,
          [STOREFRONT_API_KEY_TITLE]
        )

        const publishableKey = keyResult.rows[0]?.token

        if (!publishableKey) {
          throw new Error("Storefront publishable key was not found in the tenant database")
        }

        const inviteResult = await client.query<{ token: string }>(
          `select token from invite
           where email = $1
             and accepted = false
             and deleted_at is null
           order by created_at desc
           limit 1`,
          [tenantConfig.ownerEmail]
        )

        const inviteToken = inviteResult.rows[0]?.token

        ctx.bootstrap = { publishableKey, inviteToken }

        // Bootstrap values can change on a redeploy, so they are upserted
        // instead of only inserted once.
        await upsertSecret(database, ctx.tenant.id, "publishable_key", publishableKey)

        if (inviteToken) {
          await upsertSecret(database, ctx.tenant.id, "invite_token", inviteToken)
        }
      } finally {
        await client.end()
      }

      // The storefront is deployed after this step, so push the key it needs
      // into its environment now.
      const coolify = ctx.coolify
      const storefrontUuid = ctx.apps?.storefront

      if (coolify && storefrontUuid && ctx.bootstrap?.publishableKey) {
        await coolify.setEnvironmentVariable(
          storefrontUuid,
          "MEDUSA_PUBLISHABLE_KEY",
          ctx.bootstrap.publishableKey
        )
      }
    },
  },
  {
    key: "deploy_storefront",
    run: async (ctx) => {
      const coolify = ctx.coolify

      if (!coolify) {
        throw new Error("Coolify client is required for the deploy_storefront step")
      }

      const storefrontUuid = ctx.apps?.storefront

      if (!storefrontUuid) {
        throw new Error("Storefront Coolify application uuid was not resolved")
      }

      const deploy = await coolify.deploy({ uuid: storefrontUuid, force: true })
      const deployment = await waitForDeployment(coolify, deploy.deploymentUuid)

      if (deployment.status !== "success") {
        throw new Error(
          `Storefront deployment ${deploy.deploymentUuid} did not succeed: ${deployment.status}`
        )
      }
    },
  },
  {
    key: "finalize",
    run: async (ctx) => {
      const database = ctx.db

      if (!database) {
        throw new Error("Control plane database is required for the finalize step")
      }

      const { storeUrl, adminUrl } = tenantHosts(ctx.tenant.slug)
      const backendUuid = ctx.apps?.backend
      const storefrontUuid = ctx.apps?.storefront

      await database
        .update(tenants)
        .set({
          status: "active",
          version: ctx.tenant.version ?? null,
          db_name: ctx.tenant.db_name ?? ctx.apps?.database ?? null,
          coolify_backend_uuid: backendUuid ?? ctx.tenant.coolify_backend_uuid ?? null,
          coolify_storefront_uuid: storefrontUuid ?? ctx.tenant.coolify_storefront_uuid ?? null,
          store_url: storeUrl || null,
          admin_url: adminUrl || null,
        })
        .where(eq(tenants.id, ctx.tenant.id))

      ctx.tenant = {
        ...ctx.tenant,
        status: "active",
        coolify_backend_uuid: backendUuid ?? ctx.tenant.coolify_backend_uuid ?? null,
        coolify_storefront_uuid: storefrontUuid ?? ctx.tenant.coolify_storefront_uuid ?? null,
        store_url: storeUrl || null,
        admin_url: adminUrl || null,
      }
    },
  },
]
