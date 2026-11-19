#!/usr/bin/env node
/**
 * Clears the LOCAL control-plane database and Redis so a developer starts
 * from an empty Flowcheq Commerce.
 *
 * Safety (all must hold, otherwise the script refuses to run):
 * 1. `CONTROL_PLANE_DATABASE_URL` must point at a local Postgres host
 *    (localhost / 127.0.0.1 / ::1). Anything else aborts.
 * 2. `REDIS_URL`, when set, must also point at a local host.
 * 3. `NODE_ENV=production` aborts, always.
 * 4. The `--yes` flag is required: no accidental wipes.
 *
 * Secrets are read from the environment (or the repo-root .env file) and are
 * never printed: log lines use the redacted URL only.
 *
 * Usage: node scripts/reset-local.mjs --yes
 */
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { Client } from "pg"
import Redis from "ioredis"

import { isLocalHost, loadEnvFile, redactUrl, urlHost } from "./env-file.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
loadEnvFile(join(root, ".env"))

const CONTROL_PLANE_TABLES = [
 "audit_log",
 "provision_steps",
 "tenant_secrets",
 "tenants",
 "orders",
 "sessions",
 "customers",
 "plans",
 "releases",
]

function fail(message) {
 console.error(`reset-local: ${message}`)
 process.exit(1)
}

async function main() {
 const args = new Set(process.argv.slice(2))

 if (process.env.NODE_ENV === "production") {
 fail("refusing to run with NODE_ENV=production.")
 }

 if (!args.has("--yes")) {
 fail("pass --yes to confirm wiping the LOCAL control-plane database and Redis.")
 }

 const databaseUrl = process.env.CONTROL_PLANE_DATABASE_URL

 if (!databaseUrl) {
 fail("CONTROL_PLANE_DATABASE_URL is not set (env or repo-root .env).")
 }

 if (!isLocalHost(urlHost(databaseUrl))) {
 fail(`refusing: CONTROL_PLANE_DATABASE_URL is not local (${redactUrl(databaseUrl)}).`)
 }

 console.log(`reset-local: wiping control-plane database ${redactUrl(databaseUrl)}`)
 const client = new Client({ connectionString: databaseUrl })

 try {
 await client.connect()

 for (const table of CONTROL_PLANE_TABLES) {
 await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`)
 console.log(`reset-local: truncated ${table}`)
 }
 } finally {
 await client.end().catch(() => {})
 }

 const redisUrl = process.env.REDIS_URL

 if (redisUrl) {
 if (!isLocalHost(urlHost(redisUrl))) {
 fail(`refusing: REDIS_URL is not local (${redactUrl(redisUrl)}).`)
 }

 console.log(`reset-local: flushing redis ${redactUrl(redisUrl)}`)
 const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 })

 try {
 await redis.connect()
 await redis.flushdb()
 console.log("reset-local: redis flushed")
 } finally {
 redis.disconnect()
 }
 } else {
 console.log("reset-local: REDIS_URL unset, skipping redis flush")
 }

 console.log("reset-local: done. Run `npm run load:local` to load a fresh local dataset.")
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)))
