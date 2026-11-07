import { Worker, type Job, type JobsOptions } from "bullmq"
import Redis from "ioredis"

import { eq } from "drizzle-orm"
import { db, tenants } from "@flowcheq/db"
import { createCoolifyClient, deprovisionTenant, runProvisioning } from "@flowcheq/provisioner"
import type { CoolifyClient } from "@flowcheq/provisioner"

export const PROVISION_QUEUE_NAME = "provision"

export type ProvisionJobName = "provision" | "deprovision"

export interface ProvisionJobData {
  tenantId: string
}

/**
 * Retries are exponential (30s, 60s, 120s). Completed jobs are trimmed, failed
 * jobs are kept so staff can inspect them from the dashboard and retry.
 */
export const PROVISION_JOB_OPTIONS: JobsOptions = {
  attempts: 4,
  backoff: { type: "exponential", delay: 30_000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: false,
}

export interface CreateProvisionWorkerParams {
  queueName?: string
  connection?: Redis
  concurrency?: number
  runProvisioningJob?: (tenantId: string) => Promise<unknown>
  runDeprovisioningJob?: (tenantId: string) => Promise<unknown>
}

export function createWorkerCoolifyClient(): CoolifyClient {
  return createCoolifyClient({
    baseUrl: process.env.COOLIFY_URL ?? "",
    token: process.env.COOLIFY_TOKEN ?? "",
  })
}

async function defaultProvisionRunner(tenantId: string) {
  const rows = await db.select().from(tenants).where(eq(tenants.id, tenantId))
  const tenant = rows[0]

  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`)
  }

  const outcome = await runProvisioning({
    tenantId,
    tenant,
    deps: {
      coolify: createWorkerCoolifyClient(),
      db,
    },
  })

  return outcome
}

async function defaultDeprovisionRunner(tenantId: string) {
  await deprovisionTenant({
    tenantId,
    db,
    coolify: createWorkerCoolifyClient(),
  })
}

export async function createProvisionWorker(
  params: CreateProvisionWorkerParams = {}
): Promise<Worker<ProvisionJobData>> {
  const queueName = params.queueName ?? PROVISION_QUEUE_NAME
  const connection = params.connection ?? new Redis(process.env.REDIS_URL ?? "redis://localhost:6379")
  const provisionProcessor = params.runProvisioningJob ?? defaultProvisionRunner
  const deprovisionProcessor = params.runDeprovisioningJob ?? defaultDeprovisionRunner

  const worker = new Worker<ProvisionJobData>(
    queueName,
    async (job: Job<ProvisionJobData>) => {
      if (job.name === "deprovision") {
        return deprovisionProcessor(job.data.tenantId)
      }

      return provisionProcessor(job.data.tenantId)
    },
    {
      connection,
      concurrency: params.concurrency ?? 1,
    }
  )

  worker.on("failed", (job, error) => {
    console.error(
      JSON.stringify({
        level: "error",
        message: "provisioning job failed",
        jobId: job?.id,
        jobName: job?.name,
        tenantId: job?.data?.tenantId,
        attempt: job?.attemptsMade,
        error: error.message,
      })
    )
  })

  return worker
}
