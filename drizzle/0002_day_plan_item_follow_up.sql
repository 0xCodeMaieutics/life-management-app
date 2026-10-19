CREATE TABLE `day_plan_item_follow_up` (
	`id` text PRIMARY KEY NOT NULL,
	`day_plan_item_id` text NOT NULL,
	`send_at` integer NOT NULL,
	`telegram_scheduled_message_id` integer NOT NULL,
	FOREIGN KEY (`day_plan_item_id`) REFERENCES `day_plan_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `day_plan_item_follow_up_day_plan_item_id_unique` ON `day_plan_item_follow_up` (`day_plan_item_id`);--> statement-breakpoint
ALTER TABLE `day_plan_item` ADD `follow_up_minutes` integer;--> statement-breakpoint
ALTER TABLE `day_plan_item` ADD `follow_up_message` text;--> statement-breakpoint
ALTER TABLE `todo` ADD `follow_up_minutes` integer;--> statement-breakpoint
ALTER TABLE `todo` ADD `follow_up_message` text;