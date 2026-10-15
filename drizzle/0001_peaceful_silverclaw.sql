CREATE TABLE "day_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	CONSTRAINT "day_plan_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "day_plan_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_plan_id" uuid NOT NULL,
	"title" text NOT NULL,
	"target_time" text,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"target_time" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "day_plan_item" ADD CONSTRAINT "day_plan_item_day_plan_id_day_plan_id_fk" FOREIGN KEY ("day_plan_id") REFERENCES "public"."day_plan"("id") ON DELETE cascade ON UPDATE no action;