#!/usr/bin/env node
/**
 * Creates or promotes a staff account for the control-plane dashboard.
 *
 *   npm run staff:create --workspace=@dtc/dashboard -- --email you@example.com
 *
 * The password is read from --password, STAFF_PASSWORD, or prompted for.
 * Passwords are hashed with argon2id; the plaintext is never logged.
 */
import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"

import { eq } from "drizzle-orm"
import { hash } from "@node-rs/argon2"
import { customers, db } from "@flowcheq/db"

function parseArgs(argv) {
  const args = {}

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (!arg.startsWith("--")) {
      continue
    }

    const [key, inline] = arg.slice(2).split("=")
    const value = inline ?? argv[index + 1]

    if (inline === undefined) {
      index += 1
    }

    args[key] = value
  }

  return args
}

async function prompt(question) {
  const rl = createInterface({ input: stdin, output: stdout })

  try {
    return await rl.question(question)
  } finally {
    rl.close()
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const email = args.email ?? process.env.STAFF_EMAIL
  const name = args.name ?? process.env.STAFF_NAME ?? "Staff"
  const password = args.password ?? process.env.STAFF_PASSWORD ?? (await prompt("Password: "))

  if (!email) {
    console.error("Usage: npm run staff:create -- --email you@example.com [--name \"Your Name\"] [--password ...]")
    process.exitCode = 1
    return
  }

  if (!password || password.length < 12) {
    console.error("Password must be at least 12 characters.")
    process.exitCode = 1
    return
  }

  const passwordHash = await hash(password)
  const existing = await db.select().from(customers).where(eq(customers.email, email)).limit(1)

  if (existing[0]) {
    await db
      .update(customers)
      .set({ password_hash: passwordHash, role: "staff", name })
      .where(eq(customers.id, existing[0].id))

    console.log(`Updated staff account ${email}.`)
  } else {
    await db.insert(customers).values({
      email,
      password_hash: passwordHash,
      role: "staff",
      name,
    })

    console.log(`Created staff account ${email}.`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
