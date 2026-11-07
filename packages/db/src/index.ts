import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { schema } from "./schema"
import { decrypt, encrypt, generateSecret } from "./encryption"

const pool = new Pool({
  connectionString: process.env.CONTROL_PLANE_DATABASE_URL,
})

export const db = drizzle(pool, { schema })

export * from "./schema"
export * from "./encryption"
export { encrypt, decrypt, generateSecret }
