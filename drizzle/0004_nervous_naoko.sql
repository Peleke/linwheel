CREATE TABLE `post_carousels` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`carousel_url` text,
	`pages` text,
	`style_preset` text,
	`offset_days` integer DEFAULT 0,
	`scheduled_at` integer,
	`status` text DEFAULT 'pending',
	`published_at` integer,
	`linkedin_post_urn` text,
	`publish_error` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`post_id`) REFERENCES `linkedin_posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_linkedin_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`insight_id` text,
	`run_id` text,
	`hook` text NOT NULL,
	`body_beats` text NOT NULL,
	`open_question` text NOT NULL,
	`post_type` text NOT NULL,
	`full_text` text NOT NULL,
	`version_number` integer DEFAULT 1,
	`approved` integer DEFAULT false,
	`is_manual_draft` integer DEFAULT false,
	`auto_publish` integer DEFAULT true,
	`scheduled_at` integer,
	`scheduled_position` integer,
	`linkedin_post_urn` text,
	`linkedin_published_at` integer,
	`linkedin_publish_error` text,
	FOREIGN KEY (`insight_id`) REFERENCES `insights`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `generation_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_linkedin_posts`("id", "insight_id", "run_id", "hook", "body_beats", "open_question", "post_type", "full_text", "version_number", "approved", "is_manual_draft", "auto_publish", "scheduled_at", "scheduled_position", "linkedin_post_urn", "linkedin_published_at", "linkedin_publish_error") SELECT "id", "insight_id", "run_id", "hook", "body_beats", "open_question", "post_type", "full_text", "version_number", "approved", "is_manual_draft", "auto_publish", "scheduled_at", "scheduled_position", "linkedin_post_urn", "linkedin_published_at", "linkedin_publish_error" FROM `linkedin_posts`;--> statement-breakpoint
DROP TABLE `linkedin_posts`;--> statement-breakpoint
ALTER TABLE `__new_linkedin_posts` RENAME TO `linkedin_posts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
-- Note: linkedin_profile_picture column already exists from migration 0003