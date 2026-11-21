import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261121101503 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "payment_provider_config" add column if not exists "gateway_url" text null, add column if not exists "gateway_vendor_id" text null, add column if not exists "gateway_token_enc" text null, add column if not exists "gateway_webhook_secret_enc" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "payment_provider_config" drop column if exists "gateway_url", drop column if exists "gateway_vendor_id", drop column if exists "gateway_token_enc", drop column if exists "gateway_webhook_secret_enc";`);
  }

}
