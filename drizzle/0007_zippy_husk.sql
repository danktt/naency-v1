ALTER TABLE "provisions" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "provisions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint

CREATE TABLE "provision_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL REFERENCES "financial_groups"("id") ON DELETE CASCADE,
  "name" varchar(191) NOT NULL,
  "description" text,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "provision_template_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL REFERENCES "provision_templates"("id") ON DELETE CASCADE,
  "category_id" uuid NOT NULL REFERENCES "categories"("id"),
  "planned_amount" numeric(14, 2) NOT NULL
);--> statement-breakpoint

CREATE TABLE "provision_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL REFERENCES "financial_groups"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
  "month" integer NOT NULL,
  "year" integer NOT NULL,
  "action" varchar(64) NOT NULL,
  "previous_amount" numeric(14, 2),
  "new_amount" numeric(14, 2),
  "context" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX "provision_audit_logs_group_idx" ON "provision_audit_logs" ("group_id");--> statement-breakpoint
CREATE INDEX "provision_audit_logs_category_idx" ON "provision_audit_logs" ("category_id");--> statement-breakpoint

CREATE TABLE "provision_recurring_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL REFERENCES "financial_groups"("id") ON DELETE CASCADE,
  "category_id" uuid NOT NULL REFERENCES "categories"("id"),
  "planned_amount" numeric(14, 2) NOT NULL,
  "start_month" integer NOT NULL,
  "start_year" integer NOT NULL,
  "end_month" integer,
  "end_year" integer,
  "apply_automatically" boolean DEFAULT true NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "notes" text
);--> statement-breakpoint

CREATE INDEX "provision_recurring_rules_group_idx" ON "provision_recurring_rules" ("group_id");--> statement-breakpoint
CREATE INDEX "provision_recurring_rules_category_idx" ON "provision_recurring_rules" ("category_id");

