CREATE TABLE `day_plan` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `day_plan_date_unique` ON `day_plan` (`date`);--> statement-breakpoint
CREATE TABLE `day_plan_item` (
	`id` text PRIMARY KEY NOT NULL,
	`day_plan_id` text NOT NULL,
	`todo_id` text,
	`title` text NOT NULL,
	`target_time` text,
	`completed` integer DEFAULT false NOT NULL,
	`cancelled` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`day_plan_id`) REFERENCES `day_plan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`todo_id`) REFERENCES `todo`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `day_plan_item_reminder` (
	`id` text PRIMARY KEY NOT NULL,
	`day_plan_item_id` text NOT NULL,
	`remind_at` integer NOT NULL,
	`remind_time` text NOT NULL,
	`time_zone` text NOT NULL,
	`telegram_scheduled_message_id` integer NOT NULL,
	FOREIGN KEY (`day_plan_item_id`) REFERENCES `day_plan_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `day_plan_item_reminder_day_plan_item_id_unique` ON `day_plan_item_reminder` (`day_plan_item_id`);--> statement-breakpoint
CREATE TABLE `day_plan_item_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`day_plan_item_id` text NOT NULL,
	`steps` integer NOT NULL,
	FOREIGN KEY (`day_plan_item_id`) REFERENCES `day_plan_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `matter` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`key` text NOT NULL,
	`document_content` text NOT NULL,
	`category` text
);
--> statement-breakpoint
CREATE TABLE `read` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`type` text DEFAULT 'IDLE' NOT NULL,
	`finished_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `read_reminder` (
	`id` text PRIMARY KEY NOT NULL,
	`read_id` text NOT NULL,
	`remind_at` integer NOT NULL,
	`remind_time` text NOT NULL,
	`time_zone` text NOT NULL,
	`telegram_scheduled_message_id` integer NOT NULL,
	FOREIGN KEY (`read_id`) REFERENCES `read`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `read_reminder_read_id_unique` ON `read_reminder` (`read_id`);--> statement-breakpoint
CREATE TABLE `todo` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`target_time` text NOT NULL,
	`created_at` integer NOT NULL
);
