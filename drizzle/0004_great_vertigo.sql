CREATE TYPE "public"."currency_type" AS ENUM('BRL', 'USD');--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD COLUMN "currency" "currency_type" DEFAULT 'BRL' NOT NULL;