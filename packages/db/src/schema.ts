import { relations, sql } from "drizzle-orm"
import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { primaryKey } from "drizzle-orm/pg-core"

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  password_hash: text("password_hash").notNull(),
  name: text("name"),
  role: text("role").default("customer").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
})

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    customer_id: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_customer_id_idx").on(table.customer_id)]
)

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  price_minor: integer("price_minor").notNull(),
  currency: text("currency").notNull(),
  interval: text("interval").notNull(),
})

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  customer_id: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  plan_id: text("plan_id").notNull(),
  provider: text("provider").notNull(),
  provider_reference: text("provider_reference").unique().notNull(),
  amount_minor: integer("amount_minor").notNull(),
  currency: text("currency").notNull(),
  status: text("status").default("pending").notNull(),
  signup_payload: jsonb("signup_payload").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  paid_at: timestamp("paid_at", { withTimezone: true }),
})

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  customer_id: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  slug: text("slug").unique().notNull(),
  config: jsonb("config").notNull(),
  status: text("status").default("provisioning").notNull(),
  version: text("version"),
  pinned_version: text("pinned_version"),
  db_name: text("db_name"),
  coolify_backend_uuid: text("coolify_backend_uuid"),
  coolify_storefront_uuid: text("coolify_storefront_uuid"),
  store_url: text("store_url"),
  admin_url: text("admin_url"),
  created_at: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

export const tenant_secrets = pgTable(
  "tenant_secrets",
  {
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value_enc: text("value_enc").notNull(),
  },
  (table) => [primaryKey({ columns: [table.tenant_id, table.key] })]
)

export const provision_steps = pgTable(
  "provision_steps",
  {
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    step: text("step").notNull(),
    status: text("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    log: text("log"),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.tenant_id, table.step] })]
)

export const releases = pgTable("releases", {
  version: text("version").primaryKey(),
  created_at: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  ring: text("ring").default("none").notNull(),
})

export const audit_log = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  tenant_id: uuid("tenant_id"),
  meta: jsonb("meta"),
  at: timestamp("at", { withTimezone: true }).default(sql`now()`).notNull(),
})

export const customersRelations = relations(customers, ({ many }) => ({
  sessions: many(sessions),
  orders: many(orders),
}))

export type Customer = typeof customers.$inferSelect
export type Tenant = typeof tenants.$inferSelect
export type ProvisionStep = typeof provision_steps.$inferSelect
export type Release = typeof releases.$inferSelect
export type AuditLog = typeof audit_log.$inferSelect
export type Order = typeof orders.$inferSelect
export type TenantSecret = typeof tenant_secrets.$inferSelect

export const schema = {
  customers,
  sessions,
  plans,
  orders,
  tenants,
  tenant_secrets,
  provision_steps,
  releases,
  audit_log,
}
