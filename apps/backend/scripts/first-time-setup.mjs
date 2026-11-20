#!/usr/bin/env node
/**
 * First-time Medusa backend setup for a fresh database.
 *
 * 1. Runs database migrations (`medusa db:migrate`)
 * 2. Prompts for admin email and password and creates the user (`medusa user`)
 * 3. Applies Nigeria/NGN first-time defaults, free 0.00 shipping, the storefront
 *    sales channel and warehouse links, and prints the publishable key token
 *
 * Run from apps/backend (or via npm script) with DATABASE_URL and other required
 * env vars set (see .env.template).
 *
 *   npm run setup:first
 */

import { spawnSync } from "node:child_process"
import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.resolve(__dirname, "..")

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: backendRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  })

  if (result.error) {
    throw result.error
  }

  return result.status ?? 1
}

function fail(message) {
  console.error(`\n[first-time-setup] ${message}`)
  process.exit(1)
}

async function promptNonEmpty(rl, label) {
  while (true) {
    const value = (await rl.question(label)).trim()
    if (value) return value
    console.log("Value cannot be empty.")
  }
}

async function main() {
  console.log("[first-time-setup] Medusa backend first-time setup")
  console.log(`[first-time-setup] Working directory: ${backendRoot}`)
  console.log("")

  if (!process.env.DATABASE_URL) {
    console.warn(
      "[first-time-setup] Warning: DATABASE_URL is not set in the environment. " +
        "Migrations/user creation will fail without a valid database connection. " +
        "Set env vars (see apps/backend/.env.template) or run with --env-file."
    )
    console.log("")
  }

  // 1) Migrations
  console.log("[first-time-setup] Step 1/3: Running database migrations...")
  const migrateStatus = run("npx", ["--no-install", "medusa", "db:migrate"])
  if (migrateStatus !== 0) {
    fail(`Migrations failed (exit code ${migrateStatus}).`)
  }

  // 2) Create admin user
  console.log("")
  console.log("[first-time-setup] Step 2/3: Create admin user")
  const rl = createInterface({ input, output })
  let email
  let password
  try {
    email = await promptNonEmpty(rl, "Admin email: ")
    password = await promptNonEmpty(rl, "Admin password: ")
  } finally {
    rl.close()
  }

  console.log(`[first-time-setup] Creating user ${email}...`)
  const userStatus = run("npx", [
    "--no-install",
    "medusa",
    "user",
    "-e",
    email,
    "-p",
    password,
  ])
  if (userStatus !== 0) {
    fail(
      `User creation failed (exit code ${userStatus}). If the user already exists, you can rerun and continue; check the output above.`
    )
  }

  // 3) Nigeria store defaults, checkout setup and publishable key
  console.log("")
  console.log(
    "[first-time-setup] Step 3/3: Applying Nigeria store defaults and checkout setup..."
  )
  const setupStatus = run("npx", [
    "--no-install",
    "medusa",
    "exec",
    "./src/scripts/ensure-first-time-store.ts",
  ])
  if (setupStatus !== 0) {
    fail(
      `Store setup failed (exit code ${setupStatus}). You can rerun just this step with: npx medusa exec ./src/scripts/ensure-first-time-store.ts`
    )
  }

  console.log("")
  console.log("[first-time-setup] Done.")
  console.log(
    "[first-time-setup] Store is ready: Nigeria region, Nigeria Warehouse, storefront sales channel, free 0.00 shipping and Paystack are connected."
  )
  console.log(
    "[first-time-setup] Next: start the backend (npm run dev/start), sign in to /app with the admin user, and set MEDUSA_PUBLISHABLE_KEY in the storefront env if needed."
  )
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err))
})
