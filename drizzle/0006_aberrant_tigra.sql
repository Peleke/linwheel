CREATE TABLE `distilled_insights` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`theme` text NOT NULL,
	`synthesized_claim` text NOT NULL,
	`supporting_sources` text NOT NULL,
	`why_it_matters` text NOT NULL,
	`common_misread` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `generation_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `source_links` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`raw_content` text,
	`fetched_at` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`error` text,
	FOREIGN KEY (`run_id`) REFERENCES `generation_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `source_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`source_link_id` text NOT NULL,
	`run_id` text NOT NULL,
	`main_claims` text NOT NULL,
	`key_details` text NOT NULL,
	`implied_assumptions` text NOT NULL,
	`relevance_to_ai_professionals` text NOT NULL,
	FOREIGN KEY (`source_link_id`) REFERENCES `source_links`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `generation_runs`(`id`) ON UPDATE no action ON DELETE no action
);
