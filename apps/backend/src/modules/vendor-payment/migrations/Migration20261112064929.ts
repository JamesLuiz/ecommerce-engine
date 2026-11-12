import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261112064929 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "settlement_account" ("id" text not null, "bank_code" text not null, "bank_name" text not null, "account_number_last4" text not null, "account_name" text not null, "status" text not null default 'active', "verified_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "settlement_account_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_settlement_account_deleted_at" ON "settlement_account" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "settlement_account" cascade;`);
  }

}
