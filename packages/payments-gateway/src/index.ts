import { serve } from "@hono/node-server"
import { app } from "./app.js"
import { loadConfig } from "./config.js"
import { logger } from "./logger.js"

const config = loadConfig(process.env)

const server = serve({
  fetch: app.fetch,
  port: config.PORT,
})

const shutdown = (signal: string): void => {
  logger.info({ signal }, "shutting down the payments gateway")

  server.close(() => {
    process.exit(0)
  })
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM")
})

process.on("SIGINT", () => {
  shutdown("SIGINT")
})

logger.info(`payments gateway listening on port ${config.PORT}`)
