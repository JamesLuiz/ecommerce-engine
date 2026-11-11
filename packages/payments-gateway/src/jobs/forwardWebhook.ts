import { Worker } from "bullmq"
import { redis } from "../redis.js"
import { forwardVendorWebhook } from "../services/webhookForwarder.js"

export const webhookForwardWorker = new Worker(
  "gateway-webhook-forward",
  async (job) => forwardVendorWebhook(job.data),
  { connection: redis, concurrency: 5 },
)
