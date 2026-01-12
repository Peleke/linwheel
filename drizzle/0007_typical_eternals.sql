ALTER TABLE `article_carousel_intents` ADD `offset_days` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `article_carousel_intents` ADD `scheduled_at` integer;--> statement-breakpoint
ALTER TABLE `article_carousel_intents` ADD `auto_publish` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `article_carousel_intents` ADD `status` text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `article_carousel_intents` ADD `linkedin_post_urn` text;--> statement-breakpoint
ALTER TABLE `article_carousel_intents` ADD `published_at` integer;--> statement-breakpoint
ALTER TABLE `article_carousel_intents` ADD `publish_error` text;