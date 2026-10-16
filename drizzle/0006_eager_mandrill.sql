CREATE TYPE "public"."read_type" AS ENUM('IDLE', 'MARK_AS_RESOLVED');--> statement-breakpoint
ALTER TABLE "read" ADD COLUMN "type" "read_type" DEFAULT 'IDLE' NOT NULL;