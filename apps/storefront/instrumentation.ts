/**
 * Runs once when the storefront server starts (not during `next build`).
 * Fail fast with a clear message instead of serving a store with a broken
 * backend connection.
 */
const getEnv = (runtimeKey: string, publicKey?: string) => {
  return process.env[runtimeKey] || (publicKey ? process.env[publicKey] : undefined)
}

export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return
  }

  const missing: string[] = []

  if (!getEnv("MEDUSA_BACKEND_URL", "NEXT_PUBLIC_MEDUSA_BACKEND_URL")) {
    missing.push("MEDUSA_BACKEND_URL")
  }
  if (!getEnv("MEDUSA_PUBLISHABLE_KEY", "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY")) {
    missing.push("MEDUSA_PUBLISHABLE_KEY")
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required storefront environment variables: ${missing.join(", ")}`
    )
  }
}
