import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260409000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "payment_provider_config" ("id" text not null, "provider" text not null default 'paystack', "mode" text not null default 'platform', "public_key" text null, "secret_key_enc" text null, "webhook_secret_enc" text null, "enabled" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "payment_provider_config_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_payment_provider_config_deleted_at" ON "payment_provider_config" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "payment_provider_config" cascade;`)
  }
}
