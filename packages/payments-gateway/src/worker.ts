import { loadConfig } from "./config.js"
import { logger } from "./logger.js"
import { redis } from "./redis.js"
import { scheduleReconciliation } from "./jobs/scheduler.js"
import { webhookForwardWorker } from "./jobs/forwardWebhook.js"
import { reconciliationWorker } from "./jobs/reconcile.js"

const config = loadConfig(process.env)

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, "shutting down the payments gateway worker")

  await Promise.all([webhookForwardWorker.close(), reconciliationWorker.close()])
  await redis.quit()

  process.exit(0)
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM")
})

process.on("SIGINT", () => {
  void shutdown("SIGINT")
})

void scheduleReconciliation()

logger.info({ env: config.NODE_ENV }, "payments gateway worker started")
