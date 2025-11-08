CREATE TYPE "public"."account_type_v2" AS ENUM('checking', 'credit', 'investment');--> statement-breakpoint
ALTER TABLE "bank_accounts" ALTER COLUMN "type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bank_accounts" ALTER COLUMN "type" SET DATA TYPE "public"."account_type_v2" USING "type"::text::"public"."account_type_v2";--> statement-breakpoint
ALTER TABLE "bank_accounts" ALTER COLUMN "type" SET DEFAULT 'checking';--> statement-breakpoint
DROP TYPE "public"."account_type";