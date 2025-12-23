ALTER TABLE `article_image_intents` ADD `generated_image_url` text;--> statement-breakpoint
ALTER TABLE `article_image_intents` ADD `generated_at` integer;--> statement-breakpoint
ALTER TABLE `article_image_intents` ADD `generation_provider` text;--> statement-breakpoint
ALTER TABLE `article_image_intents` ADD `generation_error` text;--> statement-breakpoint
ALTER TABLE `image_intents` ADD `generated_image_url` text;--> statement-breakpoint
ALTER TABLE `image_intents` ADD `generated_at` integer;--> statement-breakpoint
ALTER TABLE `image_intents` ADD `generation_provider` text;--> statement-breakpoint
ALTER TABLE `image_intents` ADD `generation_error` text;