#!/usr/bin/env node
/**
 * Loads the LOCAL control-plane database for development: runs the drizzle
 * migrations, ensures the starter plan, and ensures one demo customer
 * (plus `--staff-email` for a staff row, `--seed-demo-order` for a pending
 * demo order).
 *
 * Everything is idempotent: safe to run after `reset-local` or on top of an
 * existing local database. Nothing here touches Coolify or production; both
 * URLs must resolve to local hosts (same guard as reset-local).
 *
 * Secrets come from the environment (or the repo-root .env file) and are
 * never printed: log lines use the redacted URL only.
 *
 * Demo credentials are local-only placeholders. Change them with flags:
 * npm run load:local -- --customer-email you@example.com
 *
 * Usage: node scripts/load-local.mjs [--seed-demo-order] [--customer-email ... --customer-name ... --staff-email ...]
 */
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { randomBytes } from "node:crypto"

import { isLocalHost, loadEnvFile, redactUrl, urlHost } from "./env-file.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
loadEnvFile(join(root, ".env"))

function fail(message) {
 console.error(`load-local: ${message}`)
 process.exit(1)
}

function parseArgs(argv) {
 const args = {}

 for (let index = 0; index < argv.length; index += 1) {
 const arg = argv[index]

 if (!arg.startsWith("--")) {
 continue
 }

 const [key, inline] = arg.slice(2).split("=")
 const value = inline ?? argv[index + 1]

 if (inline === undefined && value !== undefined && !value.startsWith("--")) {
 index += 1
 args[key] = value
 } else if (inline !== undefined) {
 args[key] = value
 } else {
 args[key] = true
 }
 }

 return args
}

/**
 * Placeholder hash for demo rows. Starts with `unusable-` so it can never
 * verify as a real password; set real passwords with `staff:create`.
 */
function unusableHash() {
 return `unusable-local-demo:${randomBytes(16).toString("hex")}`
}

async function main() {
 const { default: pg } = await import("pg")
 const args = parseArgs(process.argv.slice(2))

 if (process.env.NODE_ENV === "production") {
 fail("refusing to run with NODE_ENV=production.")
 }

 const databaseUrl = process.env.CONTROL_PLANE_DATABASE_URL

 if (!databaseUrl) {
 fail("CONTROL_PLANE_DATABASE_URL is not set (env or repo-root .env).")
 }

 if (!isLocalHost(urlHost(databaseUrl))) {
 fail(`refusing: CONTROL_PLANE_DATABASE_URL is not local (${redactUrl(databaseUrl)}).`)
 }

 const redisUrl = process.env.REDIS_URL

 if (redisUrl && !isLocalHost(urlHost(redisUrl))) {
 fail(`refusing: REDIS_URL is not local (${redactUrl(redisUrl)}).`)
 }

 console.log(`load-local: migrating ${redactUrl(databaseUrl)}`)
 // drizzle-kit is hoisted to the workspace root; run it from there with
 // the db package's config and migrations.
 execFileSync(
 process.execPath,
 [join(root, "node_modules/drizzle-kit/bin.cjs"), "migrate"],
 {
 cwd: join(root, "packages/db"),
 stdio: "inherit",
 env: { ...process.env, CONTROL_PLANE_DATABASE_URL: databaseUrl },
 }
 )

 const { Client } = pg
 const client = new Client({ connectionString: databaseUrl })
 await client.connect()

 try {
 await client.query(
 `INSERT INTO plans (id, name, price_minor, currency, "interval")
 VALUES
    ('starter-6m', 'Starter setup - 6 months', 9580000, 'NGN', 'six-months'),
    ('starter', 'Starter setup - yearly', 15490000, 'NGN', 'yearly')
 ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_minor = EXCLUDED.price_minor, currency = EXCLUDED.currency, "interval" = EXCLUDED."interval"`
 )
 console.log("load-local: ensured starter-6m and starter plans")

 const customerEmail = args["customer-email"] ?? "demo@example.com"
 const customerName = args["customer-name"] ?? "Demo Customer"

 const customerResult = await client.query(
 `INSERT INTO customers (email, password_hash, name, role)
 VALUES ($1, $2, $3, 'customer')
 ON CONFLICT (email) DO NOTHING
 RETURNING id`,
 [customerEmail, unusableHash(), customerName]
 )

 let customerId = customerResult.rows[0]?.id

 if (!customerId) {
 const existing = await client.query(`SELECT id FROM customers WHERE email = $1`, [customerEmail])
 customerId = existing.rows[0]?.id
 }

 console.log(`load-local: ensured demo customer ${customerEmail}`)

 if (args["seed-demo-order"] && customerId) {
 const payload = JSON.stringify({
 slug: "demo-store",
 businessName: "Demo Store",
 ownerEmail: customerEmail,
 plan: "starter",
 currency: "NGN",
 region: "ng",
 })

 await client.query(
 `INSERT INTO orders (customer_id, plan_id, provider, provider_reference, amount_minor, currency, status, signup_payload)
 VALUES ($1, 'starter', 'manual', 'local_demo-store', 15490000, 'NGN', 'pending', $2::jsonb)
 ON CONFLICT (provider_reference) DO NOTHING`,
 [customerId, payload]
 )
 console.log("load-local: ensured demo order for demo-store")
 }

 const staffEmail = args["staff-email"]

 if (staffEmail) {
 await client.query(
 `INSERT INTO customers (email, password_hash, name, role)
 VALUES ($1, $2, 'Local Staff', 'staff')
 ON CONFLICT (email) DO UPDATE SET role = 'staff'`,
 [staffEmail, unusableHash()]
 )
 console.log(`load-local: ensured staff role for ${staffEmail} (set a password with staff:create)`)
 }
 } finally {
 await client.end().catch(() => {})
 }

 console.log("load-local: done.")
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)))
