ALTER TYPE "public"."user_role" ADD VALUE 'volunteer';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'admin';--> statement-breakpoint
CREATE TABLE "crew_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crew_profile_id" uuid NOT NULL,
	"credential_type" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"credential_number" varchar(100),
	"grade" varchar(100),
	"issuer" varchar(200),
	"issue_date" date,
	"expiry_date" date,
	"status" varchar(20) DEFAULT 'current' NOT NULL,
	"document_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crew_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"vessel_id" uuid,
	"first_name" varchar(100) NOT NULL,
	"middle_name" varchar(100),
	"last_name" varchar(100) NOT NULL,
	"preferred_name" varchar(100),
	"email" varchar(255),
	"phone" varchar(30),
	"date_of_birth" date,
	"address_line1" varchar(255),
	"address_line2" varchar(255),
	"city" varchar(100),
	"state" varchar(50),
	"zip" varchar(20),
	"emergency_contact_name" varchar(200),
	"emergency_contact_relationship" varchar(50),
	"emergency_contact_phone" varchar(30),
	"next_of_kin_name" varchar(200),
	"next_of_kin_relationship" varchar(50),
	"next_of_kin_phone" varchar(30),
	"next_of_kin_address" text,
	"department" varchar(50),
	"watch_assignment" varchar(50),
	"start_date" date,
	"is_volunteer" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"tshirt_size" varchar(10),
	"badge_issued" boolean DEFAULT false,
	"badge_issued_date" date,
	"safety_orientation_date" date,
	"fit_for_duty" boolean DEFAULT true,
	"medical_notes" text,
	"allergies" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_vault" ADD COLUMN "crew_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "document_vault" ADD COLUMN "category" varchar(50) DEFAULT 'other';--> statement-breakpoint
ALTER TABLE "document_vault" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "document_vault" ADD COLUMN "is_deleted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "document_vault" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "display_name" varchar(200);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "crew_credentials" ADD CONSTRAINT "crew_credentials_crew_profile_id_crew_profiles_id_fk" FOREIGN KEY ("crew_profile_id") REFERENCES "public"."crew_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_credentials" ADD CONSTRAINT "crew_credentials_document_id_document_vault_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document_vault"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_profiles" ADD CONSTRAINT "crew_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_profiles" ADD CONSTRAINT "crew_profiles_vessel_id_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."vessels"("id") ON DELETE no action ON UPDATE no action;