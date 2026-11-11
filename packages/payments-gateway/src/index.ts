import { serve } from "@hono/node-server"
import { app } from "./app.js"
import { loadConfig } from "./config.js"
import { logger } from "./logger.js"
import { scheduleReconciliation } from "./jobs/scheduler.js"
import "./jobs/forwardWebhook.js"
import "./jobs/reconcile.js"

const config = loadConfig(process.env)

serve({
  fetch: app.fetch,
  port: config.PORT,
})

scheduleReconciliation()

logger.info(`payments gateway listening on port ${config.PORT}`)
