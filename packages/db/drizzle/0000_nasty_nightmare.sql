CREATE TYPE "public"."compliance_status" AS ENUM('compliant', 'warning', 'violation', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."entry_type" AS ENUM('drill', 'inspection', 'fuel_dip', 'maintenance', 'general');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."quality_flag" AS ENUM('good', 'suspect', 'bad', 'missing');--> statement-breakpoint
CREATE TYPE "public"."trigger_type" AS ENUM('calendar', 'threshold', 'event');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('captain', 'engineer', 'crew', 'fleet_manager');--> statement-breakpoint
CREATE TYPE "public"."verdict" AS ENUM('pass', 'warning', 'violation', 'info');--> statement-breakpoint
CREATE TYPE "public"."vessel_type" AS ENUM('small_passenger', 'passenger', 'cargo', 'tanker', 'towing', 'offshore_supply', 'fishing', 'other');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vessel_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_data" jsonb NOT NULL,
	"user_id" uuid,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vessel_id" uuid NOT NULL,
	"rule_code" varchar(50) NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"verdict" "verdict" NOT NULL,
	"description" text,
	"required_action" text,
	"deadline" timestamp with time zone,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" uuid,
	"resolved_at" timestamp with time zone,
	"cost_if_delayed" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE "compliance_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_code" varchar(50) NOT NULL,
	"regulation_section_id" uuid,
	"trigger_type" "trigger_type" NOT NULL,
	"trigger_config" jsonb NOT NULL,
	"severity_levels" jsonb NOT NULL,
	"required_action" text NOT NULL,
	"deadline_calc" text,
	"verified_by" varchar(100),
	"verified_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "compliance_rules_rule_code_unique" UNIQUE("rule_code")
);
--> statement-breakpoint
CREATE TABLE "document_vault" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vessel_id" uuid NOT NULL,
	"doc_type" varchar(50) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expiry_date" date
);
--> statement-breakpoint
CREATE TABLE "logbook_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vessel_id" uuid NOT NULL,
	"entry_type" "entry_type" NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"author" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"attachments" jsonb
);
--> statement-breakpoint
CREATE TABLE "maintenance_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vessel_id" uuid NOT NULL,
	"system" varchar(100) NOT NULL,
	"predicted_date" timestamp with time zone NOT NULL,
	"confidence" numeric(5, 4) NOT NULL,
	"days_until" integer NOT NULL,
	"action" text NOT NULL,
	"cost" numeric(12, 2),
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regulation_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(50) NOT NULL,
	"title_num" integer NOT NULL,
	"chapter" varchar(10),
	"subchapter" varchar(10),
	"part" integer,
	"section_num" varchar(20),
	"citation" varchar(100) NOT NULL,
	"heading" text NOT NULL,
	"full_text" text NOT NULL,
	"last_amended" date,
	"embedding" vector(768)
);
--> statement-breakpoint
CREATE TABLE "telemetry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vessel_id" uuid NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"sensor_type" varchar(100) NOT NULL,
	"metric" varchar(100) NOT NULL,
	"value" numeric(18, 6) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"quality_flag" "quality_flag" DEFAULT 'good' NOT NULL,
	"source" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" NOT NULL,
	"vessel_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "vessels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"imo_number" varchar(20),
	"vessel_type" "vessel_type" NOT NULL,
	"flag_state" varchar(10) NOT NULL,
	"gross_tonnage" numeric(10, 2),
	"year_built" integer,
	"coi_date" date,
	"coi_expiry" date,
	"last_drydock" date,
	"compliance_status" "compliance_status" DEFAULT 'unknown' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vessels_imo_number_unique" UNIQUE("imo_number")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_vessel_id_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."vessels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_events" ADD CONSTRAINT "compliance_events_vessel_id_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."vessels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_rules" ADD CONSTRAINT "compliance_rules_regulation_section_id_regulation_sections_id_fk" FOREIGN KEY ("regulation_section_id") REFERENCES "public"."regulation_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_vault" ADD CONSTRAINT "document_vault_vessel_id_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."vessels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logbook_entries" ADD CONSTRAINT "logbook_entries_vessel_id_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."vessels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_predictions" ADD CONSTRAINT "maintenance_predictions_vessel_id_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."vessels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry" ADD CONSTRAINT "telemetry_vessel_id_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."vessels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_vessel_id_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."vessels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_reg_citation" ON "regulation_sections" USING btree ("citation");--> statement-breakpoint
CREATE INDEX "idx_reg_subchapter" ON "regulation_sections" USING btree ("subchapter");