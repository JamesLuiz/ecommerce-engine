import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261110081007 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "storefront_asset" ("id" text not null, "store_id" text not null, "file_id" text not null, "url" text not null, "filename" text not null, "mime_type" text null, "size" integer null, "kind" text not null default 'general', "alt" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "storefront_asset_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_storefront_asset_deleted_at" ON "storefront_asset" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "storefront_asset" cascade;`);
  }

}
