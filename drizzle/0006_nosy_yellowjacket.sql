ALTER TABLE `articles` ADD `auto_publish` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `articles` ADD `linkedin_post_urn` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `linkedin_published_at` integer;--> statement-breakpoint
ALTER TABLE `articles` ADD `linkedin_publish_error` text;