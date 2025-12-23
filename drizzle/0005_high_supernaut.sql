CREATE TABLE `article_image_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`prompt` text NOT NULL,
	`negative_prompt` text NOT NULL,
	`headline_text` text NOT NULL,
	`style_preset` text NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`insight_id` text NOT NULL,
	`article_type` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`introduction` text NOT NULL,
	`sections` text NOT NULL,
	`conclusion` text NOT NULL,
	`full_text` text NOT NULL,
	`version_number` integer DEFAULT 1,
	`approved` integer DEFAULT false,
	FOREIGN KEY (`run_id`) REFERENCES `generation_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`insight_id`) REFERENCES `insights`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `generation_runs` ADD `article_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `generation_runs` ADD `selected_article_angles` text;