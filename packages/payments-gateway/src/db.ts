import postgres from "postgres"

export const db = postgres(process.env.DATABASE_URL ?? "", { max: 10 })
