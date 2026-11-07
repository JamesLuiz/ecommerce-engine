import "server-only"

import { Queue, type JobsOptions } from "bullmq"
import Redis from "ioredis"

export const PROVISION_QUEUE_NAME = "provision"

export const PROVISION_JOB_OPTIONS: JobsOptions = {
  attempts: 4,
  backoff: { type: "exponential", delay: 30_000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: false,
}

type QueueJobName = "provision" | "deprovision"

let queue: Queue | null = null

function getQueue(): Queue {
  if (queue) {
    return queue
  }

  const url = process.env.REDIS_URL

  if (!url) {
    throw new Error("REDIS_URL is required to queue provisioning jobs")
  }

  const connection = new Redis(url, { maxRetriesPerRequest: null })
  queue = new Queue(PROVISION_QUEUE_NAME, { connection })

  return queue
}

/**
 * Adds a job with a deterministic id so repeat clicks and duplicate webhooks
 * do not create parallel provisioning runs. Finished or failed jobs are
 * removed first so staff can retry them.
 */
async function addUniqueJob(name: QueueJobName, jobId: string, tenantId: string) {
  const instance = getQueue()
  const existing = await instance.getJob(jobId)

  if (existing) {
    const state = await existing.getState()

    if (["waiting", "active", "delayed", "prioritized", "paused", "waiting-children"].includes(state)) {
      return existing.id
    }

    await existing.remove()
  }

  const job = await instance.add(name, { tenantId }, { ...PROVISION_JOB_OPTIONS, jobId })

  return job.id
}

export function enqueueProvision(tenantId: string): Promise<string | undefined> {
  return addUniqueJob("provision", `provision:${tenantId}`, tenantId)
}

export function enqueueDeprovision(tenantId: string): Promise<string | undefined> {
  return addUniqueJob("deprovision", `deprovision:${tenantId}`, tenantId)
}

export interface FailedJobSummary {
  id: string | undefined
  name: string
  tenantId: string | null
  failedReason: string
  attemptsMade: number
  timestamp: number
}

export interface QueueSnapshot {
  counts: Record<string, number>
  failed: FailedJobSummary[]
}

export async function getQueueSnapshot(): Promise<QueueSnapshot> {
  const instance = getQueue()
  const counts = await instance.getJobCounts(
    "waiting",
    "active",
    "delayed",
    "completed",
    "failed",
    "paused"
  )
  const failed = await instance.getFailed(0, 25)

  return {
    counts,
    failed: failed.map((job) => ({
      id: job.id,
      name: job.name,
      tenantId: (job.data as { tenantId?: string }).tenantId ?? null,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    })),
  }
}
