CREATE TYPE "public"."matter_category" AS ENUM('personal', 'work', 'unknown');--> statement-breakpoint
CREATE TABLE "matter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"key" text NOT NULL,
	"document_content" text NOT NULL,
	"category" "matter_category"
);
