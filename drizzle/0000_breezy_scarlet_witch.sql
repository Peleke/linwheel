CREATE TABLE `generation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`source_label` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`post_count` integer DEFAULT 0,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `image_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`headline_text` text NOT NULL,
	`visual_style` text NOT NULL,
	`background` text NOT NULL,
	`mood` text NOT NULL,
	`layout_hint` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `linkedin_posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `insights` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`topic` text NOT NULL,
	`claim` text NOT NULL,
	`why_it_matters` text NOT NULL,
	`misconception` text,
	`professional_implication` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `generation_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `linkedin_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`insight_id` text NOT NULL,
	`run_id` text NOT NULL,
	`hook` text NOT NULL,
	`body_beats` text NOT NULL,
	`open_question` text NOT NULL,
	`post_type` text NOT NULL,
	`full_text` text NOT NULL,
	FOREIGN KEY (`insight_id`) REFERENCES `insights`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `generation_runs`(`id`) ON UPDATE no action ON DELETE no action
);
