import { relations, sql } from "drizzle-orm"
import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
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

/**
 * People enrolled in the referral programme. `code` is public and travels in
 * referral links; `access_token` is a private capability for the /me page.
 * Bank account numbers are encrypted with SECRETS_ENCRYPTION_KEY.
 */
export const referral_enrollments = pgTable(
  "referral_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    bank_name: text("bank_name").notNull(),
    account_number_enc: text("account_number_enc").notNull(),
    code: text("code").notNull(),
    access_token: text("access_token").notNull(),
    status: text("status").default("active").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("referral_enrollments_email_idx").on(table.email),
    uniqueIndex("referral_enrollments_code_idx").on(table.code),
    uniqueIndex("referral_enrollments_access_token_idx").on(table.access_token),
  ]
)

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
  referral_enrollment_id: uuid("referral_enrollment_id").references(
    () => referral_enrollments.id,
    { onDelete: "set null" }
  ),
  created_at: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  paid_at: timestamp("paid_at", { withTimezone: true }),
  fulfilled_at: timestamp("fulfilled_at", { withTimezone: true }),
})

/**
 * A manual payout run for one enrollee. All unsettled earnings for that
 * enrollee are attached to a single settlement record when staff mark it paid.
 */
export const referral_settlements = pgTable(
  "referral_settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enrollment_id: uuid("enrollment_id")
      .notNull()
      .references(() => referral_enrollments.id, { onDelete: "cascade" }),
    amount_minor: integer("amount_minor").notNull(),
    currency: text("currency").default("NGN").notNull(),
    payment_reference: text("payment_reference"),
    notes: text("notes"),
    settled_by: text("settled_by").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [index("referral_settlements_enrollment_idx").on(table.enrollment_id)]
)

/**
 * One plan-specific NGN credit per successful referred order: NGN 9,000 for the
 * 6-month plan and NGN 18,000 for the yearly plan. The unique order constraint
 * makes repeated payment webhooks harmless.
 */
export const referral_earnings = pgTable(
  "referral_earnings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enrollment_id: uuid("enrollment_id")
      .notNull()
      .references(() => referral_enrollments.id, { onDelete: "cascade" }),
    order_id: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    customer_id: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    amount_minor: integer("amount_minor").notNull(),
    currency: text("currency").default("NGN").notNull(),
    settlement_id: uuid("settlement_id").references(() => referral_settlements.id, {
      onDelete: "set null",
    }),
    settled_at: timestamp("settled_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("referral_earnings_order_idx").on(table.order_id),
    index("referral_earnings_enrollment_idx").on(table.enrollment_id),
    index("referral_earnings_settlement_idx").on(table.settlement_id),
  ]
)

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
  referralEarnings: many(referral_earnings),
}))

export const referralEnrollmentsRelations = relations(referral_enrollments, ({ many }) => ({
  earnings: many(referral_earnings),
  settlements: many(referral_settlements),
  orders: many(orders),
}))

export const referralEarningsRelations = relations(referral_earnings, ({ one }) => ({
  enrollment: one(referral_enrollments, {
    fields: [referral_earnings.enrollment_id],
    references: [referral_enrollments.id],
  }),
  order: one(orders, {
    fields: [referral_earnings.order_id],
    references: [orders.id],
  }),
  settlement: one(referral_settlements, {
    fields: [referral_earnings.settlement_id],
    references: [referral_settlements.id],
  }),
}))

export const referralSettlementsRelations = relations(referral_settlements, ({ one, many }) => ({
  enrollment: one(referral_enrollments, {
    fields: [referral_settlements.enrollment_id],
    references: [referral_enrollments.id],
  }),
  earnings: many(referral_earnings),
}))

export type Customer = typeof customers.$inferSelect
export type Tenant = typeof tenants.$inferSelect
export type ProvisionStep = typeof provision_steps.$inferSelect
export type Release = typeof releases.$inferSelect
export type AuditLog = typeof audit_log.$inferSelect
export type Order = typeof orders.$inferSelect
export type TenantSecret = typeof tenant_secrets.$inferSelect
export type ReferralEnrollment = typeof referral_enrollments.$inferSelect
export type ReferralEarning = typeof referral_earnings.$inferSelect
export type ReferralSettlement = typeof referral_settlements.$inferSelect

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
  referral_enrollments,
  referral_earnings,
  referral_settlements,
}
