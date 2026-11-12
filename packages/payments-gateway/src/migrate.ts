import { readdir, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { db } from "./db.js"
import { logger } from "./logger.js"

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations")

export const runMigrations = async (): Promise<string[]> => {
  await db.unsafe(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  const appliedRows = (await db.unsafe<Array<{ name: string }>>(
    "select name from schema_migrations",
  )) as Array<{ name: string }>

  const applied = new Set(appliedRows.map((row) => row.name))

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort()

  const ran: string[] = []

  for (const file of files) {
    if (applied.has(file)) {
      continue
    }

    const sql = await readFile(join(migrationsDir, file), "utf8")

    await db.begin(async (tx) => {
      await tx.unsafe(sql)
      await tx.unsafe("insert into schema_migrations (name) values ($1)", [file])
    })

    ran.push(file)
    logger.info({ file }, "applied migration")
  }

  return ran
}

const isEntrypoint = (): boolean => {
  const entry = process.argv[1]

  return entry ? import.meta.url === pathToFileURL(entry).href : false
}

if (isEntrypoint()) {
  runMigrations()
    .then(async (ran) => {
      logger.info({ applied: ran.length }, "migrations complete")
      await db.end()
    })
    .catch(async (error: unknown) => {
      logger.error({ error }, "migration failed")
      await db.end()
      process.exit(1)
    })
}
