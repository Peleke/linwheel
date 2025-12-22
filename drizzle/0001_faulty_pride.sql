ALTER TABLE `generation_runs` ADD `selected_angles` text;--> statement-breakpoint
ALTER TABLE `linkedin_posts` ADD `version_number` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `linkedin_posts` ADD `approved` integer DEFAULT false;