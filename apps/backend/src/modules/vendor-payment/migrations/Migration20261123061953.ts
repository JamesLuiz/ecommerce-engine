import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261123061953 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "manual_payment" drop constraint if exists "manual_payment_cart_id_unique";`);
    this.addSql(`create table if not exists "manual_payment" ("id" text not null, "cart_id" text not null, "order_id" text null, "amount" integer not null, "currency_code" text not null, "customer_email" text not null, "bank_name" text not null, "account_name" text not null, "account_number_last4" text not null, "receipt_file_id" text not null, "receipt_filename" text not null, "receipt_mime_type" text not null, "status" text check ("status" in ('pending_review', 'reconciled', 'rejected')) not null default 'pending_review', "reconciliation_note" text null, "reconciled_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "manual_payment_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_manual_payment_cart_id_unique" ON "manual_payment" ("cart_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_manual_payment_deleted_at" ON "manual_payment" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "manual_settlement_account" ("id" text not null, "bank_code" text not null, "bank_name" text not null, "account_name" text not null, "account_number_enc" text not null, "account_number_last4" text not null, "enabled" boolean not null default true, "verified_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "manual_settlement_account_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_manual_settlement_account_deleted_at" ON "manual_settlement_account" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "manual_payment" cascade;`);

    this.addSql(`drop table if exists "manual_settlement_account" cascade;`);
  }

}
