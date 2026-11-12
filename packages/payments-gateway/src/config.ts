import { z } from "zod"

const isEnabled = (env: NodeJS.ProcessEnv): boolean =>
  (env.REFUNDS_ENABLED ?? "false").trim().toLowerCase() === "true"

export const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(8080),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  PAYSTACK_SECRET_KEY: z.string().min(1),
  PAYSTACK_BASE_URL: z.string().default("https://api.paystack.co"),
  ADMIN_TOKEN: z.string().min(1),
  WEBHOOK_SIGNING_ROOT: z.string().min(1),
  REFUNDS_ENABLED: z.boolean().default(false),
  SETTLEMENT_CHANGE_COOLDOWN_HOURS: z.coerce.number().int().min(0).default(0),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
})

export type Config = z.infer<typeof configSchema>

export const loadConfig = (env: NodeJS.ProcessEnv): Config => {
  const parsed = configSchema.parse({
    NODE_ENV: env.NODE_ENV,
    PORT: env.PORT,
    DATABASE_URL: env.DATABASE_URL,
    REDIS_URL: env.REDIS_URL,
    PAYSTACK_SECRET_KEY: env.PAYSTACK_SECRET_KEY,
    PAYSTACK_BASE_URL: env.PAYSTACK_BASE_URL,
    ADMIN_TOKEN: env.ADMIN_TOKEN,
    WEBHOOK_SIGNING_ROOT: env.WEBHOOK_SIGNING_ROOT,
    REFUNDS_ENABLED: isEnabled(env),
    SETTLEMENT_CHANGE_COOLDOWN_HOURS: env.SETTLEMENT_CHANGE_COOLDOWN_HOURS,
    LOG_LEVEL: env.LOG_LEVEL,
  })

  return parsed
}
