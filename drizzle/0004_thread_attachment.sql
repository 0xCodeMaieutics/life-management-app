CREATE TABLE `thread_attachment` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`key` text NOT NULL,
	`file_name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `thread`(`id`) ON UPDATE no action ON DELETE cascade
);
