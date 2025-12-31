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

CREATE INDEX `idx_slide_versions_carousel_slide` ON `carousel_slide_versions` (`carousel_intent_id`, `slide_number`);
