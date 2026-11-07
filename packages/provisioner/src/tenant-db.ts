import { Client } from "pg"
import { randomBytes } from "node:crypto"

export function tenantDatabaseName(slug: string): string {
  return `t_${slug.replace(/-/g, "_")}`
}

export interface TenantDatabaseCredentials {
  name: string
  username: string
  password: string
  url: string
}

export function tenantConnectionUrl(name: string, password: string): string {
  const host = process.env.TENANT_PG_HOST ?? "localhost"
  const port = process.env.TENANT_PG_PORT ?? "5432"
  return `postgres://${name}:${encodeURIComponent(password)}@${host}:${port}/${name}`
}

export async function createTenantDatabase(slug: string, password: string): Promise<TenantDatabaseCredentials> {
  const name = tenantDatabaseName(slug)
  const client = new Client({ connectionString: process.env.TENANT_PG_ADMIN_URL })
  await client.connect()

  try {
    const role = await client.query("select 1 from pg_roles where rolname = $1", [name])

    if (role.rowCount === 0) {
      // The slug is validated against a lowercase pattern before it reaches this function.
      await client.query(
        `CREATE ROLE ${name} LOGIN PASSWORD '${password.replace(/'/g, "''")}' CONNECTION LIMIT 10`
      )
    }

    const database = await client.query("select 1 from pg_database where datname = $1", [name])

    if (database.rowCount === 0) {
      await client.query(`CREATE DATABASE ${name} OWNER ${name}`)
    }
  } finally {
    await client.end()
  }

  return { name, username: name, password, url: tenantConnectionUrl(name, password) }
}

export function generateTenantPassword(): string {
  return randomBytes(24).toString("hex")
}

/**
 * Drops a tenant database and role. Safe to call twice: the statements use
 * IF EXISTS, and connections owned by the tenant role are terminated first.
 */
export async function dropTenantDatabase(slug: string): Promise<void> {
  const name = tenantDatabaseName(slug)
  const client = new Client({ connectionString: process.env.TENANT_PG_ADMIN_URL })
  await client.connect()

  try {
    await client.query(
      `select pg_terminate_backend(pid)
       from pg_stat_activity
       where datname = $1 and pid <> pg_backend_pid()`,
      [name]
    )
    // The identifier is derived from a validated slug: t_ followed by
    // lowercase letters, digits and underscores.
    await client.query(`drop database if exists ${name}`)
    await client.query(`drop role if exists ${name}`)
  } finally {
    await client.end()
  }
}
