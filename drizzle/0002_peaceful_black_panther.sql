-- Add new ComfyUI columns with defaults for existing data
ALTER TABLE `image_intents` ADD `prompt` text NOT NULL DEFAULT 'minimal typography, professional aesthetic';--> statement-breakpoint
ALTER TABLE `image_intents` ADD `negative_prompt` text NOT NULL DEFAULT 'cluttered, busy, cartoon';--> statement-breakpoint
ALTER TABLE `image_intents` ADD `style_preset` text NOT NULL DEFAULT 'typographic_minimal';