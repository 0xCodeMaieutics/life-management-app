CREATE TABLE "day_plan_item_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_plan_item_id" uuid NOT NULL,
	"steps" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "day_plan_item_steps" ADD CONSTRAINT "day_plan_item_steps_day_plan_item_id_day_plan_item_id_fk" FOREIGN KEY ("day_plan_item_id") REFERENCES "public"."day_plan_item"("id") ON DELETE cascade ON UPDATE no action;
