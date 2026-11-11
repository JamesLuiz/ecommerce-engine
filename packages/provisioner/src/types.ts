import { db } from "@flowcheq/db"
import type { Tenant } from "@flowcheq/db"
import type { CoolifyClient } from "./coolify"

export const PROVISION_STEP_KEYS = [
  "validate",
  "secrets",
  "database",
  "backend_app",
  "storefront_app",
  "dns",
  "deploy_backend",
  "read_bootstrap",
  "deploy_storefront",
  "finalize",
] as const

export type ProvisionStepKey = (typeof PROVISION_STEP_KEYS)[number]
export type ProvisionStepStatus = "pending" | "running" | "done" | "failed"

export interface ProvisionStepRecord {
  tenantId: string
  step: ProvisionStepKey
  status: ProvisionStepStatus
  attempts: number
  log: string | null
}

export interface ProvisionAppUuids {
  backend?: string
  storefront?: string
  database?: string
}

export interface ProvisionSecrets {
  jwtSecret?: string
  cookieSecret?: string
  dbPassword?: string
  gatewayToken?: string
  gatewayWebhookSecret?: string
}

export interface ProvisionBootstrap {
  publishableKey?: string
  inviteToken?: string
}

export interface ProvisionStepContext {
  tenant: Tenant
  coolify?: CoolifyClient
  db?: AppDb
  now: () => Date
  apps?: ProvisionAppUuids
  secrets?: ProvisionSecrets
  bootstrap?: ProvisionBootstrap
}

export interface ProvisionDeps {
  coolify: CoolifyClient
  db?: AppDb
  now?: () => Date
}

export interface ProvisionOutcome {
  ok: boolean
  tenantId: string
  steps: ProvisionStepRecord[]
  error?: string
}

export type AppDb = typeof db

export interface ProvisionStepDefinition {
  key: ProvisionStepKey
  run: (ctx: ProvisionStepContext) => Promise<void>
}
