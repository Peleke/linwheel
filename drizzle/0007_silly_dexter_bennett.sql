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
