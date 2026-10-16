CREATE TABLE "read_reminder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"read_id" uuid NOT NULL,
	"remind_at" timestamp with time zone NOT NULL,
	"remind_time" text NOT NULL,
	"time_zone" text NOT NULL,
	"telegram_scheduled_message_id" integer NOT NULL,
	CONSTRAINT "read_reminder_read_id_unique" UNIQUE("read_id")
);
--> statement-breakpoint
ALTER TABLE "read_reminder" ADD CONSTRAINT "read_reminder_read_id_read_id_fk" FOREIGN KEY ("read_id") REFERENCES "public"."read"("id") ON DELETE cascade ON UPDATE no action;