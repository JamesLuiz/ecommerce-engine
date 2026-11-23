import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261123081301 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "manual_payment" add column if not exists "receipt_content_enc" text null;`);
    this.addSql(`alter table if exists "manual_payment" alter column "receipt_file_id" type text using ("receipt_file_id"::text);`);
    this.addSql(`alter table if exists "manual_payment" alter column "receipt_file_id" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "manual_payment" drop column if exists "receipt_content_enc";`);

    this.addSql(`alter table if exists "manual_payment" alter column "receipt_file_id" type text using ("receipt_file_id"::text);`);
    this.addSql(`alter table if exists "manual_payment" alter column "receipt_file_id" set not null;`);
  }

}
