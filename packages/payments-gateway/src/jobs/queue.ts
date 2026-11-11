import { Queue } from "bullmq"
import { redis } from "../redis.js"

export const webhookForwardQueue = new Queue("gateway-webhook-forward", {
  connection: redis,
})

export const reconcileQueue = new Queue("gateway-reconcile-transactions", {
  connection: redis,
})
