import { createProvisionWorker, PROVISION_QUEUE_NAME } from "./index"

async function main() {
  const worker = await createProvisionWorker()

  console.log(
    JSON.stringify({
      level: "info",
      message: "provisioning worker started",
      queue: PROVISION_QUEUE_NAME,
      concurrency: worker.opts.concurrency,
    })
  )

  const shutdown = async (signal: string) => {
    console.log(JSON.stringify({ level: "info", message: "shutting down", signal }))

    try {
      await worker.close()
      process.exit(0)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(JSON.stringify({ level: "error", message: "shutdown failed", error: message }))
      process.exit(1)
    }
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"))
  process.on("SIGINT", () => void shutdown("SIGINT"))
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(JSON.stringify({ level: "error", message: "worker crashed", error: message }))
  process.exit(1)
})
