import { z } from "zod"

/**
 * Slugs that would collide with platform infrastructure or common operations.
 * Compared case-sensitively because the slug schema is lowercase-only.
 */
export const RESERVED_SLUGS: string[] = [
  "www",
  "admin",
  "api",
  "app",
  "dashboard",
  "mail",
  "smtp",
  "files",
  "status",
  "coolify",
  "traefik",
]

/**
 * Lowercase alphanumeric and hyphens, must start and end with an
 * alphanumeric. The `{1,30}` middle group means slugs are 3-32 characters.
 */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/

export const PLANS = ["starter", "growth", "scale"] as const
export const REGIONS = ["ng", "us", "eu"] as const

export const TenantConfig = z.object({
  slug: z
    .string()
    .regex(SLUG_PATTERN)
    .refine((s) => !RESERVED_SLUGS.includes(s), "reserved slug"),
  businessName: z.string().min(2).max(80),
  ownerEmail: z.string().email(),
  plan: z.enum(PLANS),
  currency: z.string().length(3).default("USD"),
  region: z.enum(REGIONS).default("ng"),
  brand: z
    .object({
      primaryColor: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .default("#111111"),
      logoUrl: z.string().url().optional(),
    })
    .default({ primaryColor: "#111111" }),
  features: z
    .object({
      multiVendor: z.boolean().default(false),
      paystack: z.boolean().default(true),
      stripe: z.boolean().default(false),
    })
    .default({ multiVendor: false, paystack: true, stripe: false }),
  customDomain: z.string().optional(),
})

export type TenantConfig = z.infer<typeof TenantConfig>
