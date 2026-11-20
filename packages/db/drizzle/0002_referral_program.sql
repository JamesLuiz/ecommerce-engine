CREATE TABLE "referral_earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"settlement_id" uuid,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"bank_name" text NOT NULL,
	"account_number_enc" text NOT NULL,
	"code" text NOT NULL,
	"access_token" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"payment_reference" text,
	"notes" text,
	"settled_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "referral_enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_enrollment_id_referral_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."referral_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_settlement_id_referral_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."referral_settlements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_settlements" ADD CONSTRAINT "referral_settlements_enrollment_id_referral_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."referral_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "referral_earnings_order_idx" ON "referral_earnings" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "referral_earnings_enrollment_idx" ON "referral_earnings" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "referral_earnings_settlement_idx" ON "referral_earnings" USING btree ("settlement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_enrollments_email_idx" ON "referral_enrollments" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_enrollments_code_idx" ON "referral_enrollments" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_enrollments_access_token_idx" ON "referral_enrollments" USING btree ("access_token");--> statement-breakpoint
CREATE INDEX "referral_settlements_enrollment_idx" ON "referral_settlements" USING btree ("enrollment_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_referral_enrollment_id_referral_enrollments_id_fk" FOREIGN KEY ("referral_enrollment_id") REFERENCES "public"."referral_enrollments"("id") ON DELETE set null ON UPDATE no action;