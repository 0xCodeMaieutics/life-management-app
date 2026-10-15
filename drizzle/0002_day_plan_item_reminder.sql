CREATE TABLE "day_plan_item_reminder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_plan_item_id" uuid NOT NULL,
	"remind_at" timestamp with time zone NOT NULL,
	"remind_time" text NOT NULL,
	"time_zone" text NOT NULL,
	"telegram_scheduled_message_id" integer NOT NULL,
	CONSTRAINT "day_plan_item_reminder_day_plan_item_id_unique" UNIQUE("day_plan_item_id")
);
--> statement-breakpoint
ALTER TABLE "day_plan_item_reminder" ADD CONSTRAINT "day_plan_item_reminder_day_plan_item_id_day_plan_item_id_fk" FOREIGN KEY ("day_plan_item_id") REFERENCES "public"."day_plan_item"("id") ON DELETE cascade ON UPDATE no action;
