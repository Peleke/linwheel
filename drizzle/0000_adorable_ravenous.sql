CREATE TABLE `article_carousel_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`page_count` integer DEFAULT 5 NOT NULL,
	`pages` text,
	`style_preset` text NOT NULL,
	`generated_pdf_url` text,
	`generated_at` integer,
	`generation_provider` text,
	`generation_error` text,
	`created_at` integer,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `article_image_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`prompt` text NOT NULL,
	`negative_prompt` text NOT NULL,
	`headline_text` text NOT NULL,
	`style_preset` text NOT NULL,
	`generated_image_url` text,
	`generated_at` integer,
	`generation_provider` text,
	`generation_error` text,
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
	`scheduled_at` integer,
	`scheduled_position` integer,
	FOREIGN KEY (`run_id`) REFERENCES `generation_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`insight_id`) REFERENCES `insights`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `carousel_slide_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`carousel_intent_id` text NOT NULL,
	`slide_number` integer NOT NULL,
	`version_number` integer NOT NULL,
	`prompt` text NOT NULL,
	`headline_text` text NOT NULL,
	`caption` text,
	`image_url` text,
	`is_active` integer DEFAULT false,
	`generated_at` integer,
	`generation_provider` text,
	`generation_error` text,
	`created_at` integer,
	FOREIGN KEY (`carousel_intent_id`) REFERENCES `article_carousel_intents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `generation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`source_label` text NOT NULL,
	`transcript` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`post_count` integer DEFAULT 0,
	`article_count` integer DEFAULT 0,
	`error` text,
	`selected_angles` text,
	`selected_article_angles` text,
	`user_id` text
);
--> statement-breakpoint
CREATE TABLE `image_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`prompt` text NOT NULL,
	`negative_prompt` text NOT NULL,
	`headline_text` text NOT NULL,
	`style_preset` text NOT NULL,
	`generated_image_url` text,
	`generated_at` integer,
	`generation_provider` text,
	`generation_error` text,
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
CREATE TABLE `linkedin_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`expires_at` integer,
	`linkedin_profile_id` text,
	`linkedin_profile_name` text,
	`created_at` integer,
	`updated_at` integer
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
	`version_number` integer DEFAULT 1,
	`approved` integer DEFAULT false,
	`scheduled_at` integer,
	`scheduled_position` integer,
	FOREIGN KEY (`insight_id`) REFERENCES `insights`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `generation_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `publishing_status` (
	`id` text PRIMARY KEY NOT NULL,
	`content_type` text NOT NULL,
	`content_id` text NOT NULL,
	`reminder_sent_at` integer,
	`published_at` integer,
	`published_to` text,
	`publish_error` text,
	`external_post_id` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `voice_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`samples` text NOT NULL,
	`is_active` integer DEFAULT false,
	`created_at` integer,
	`updated_at` integer
);
