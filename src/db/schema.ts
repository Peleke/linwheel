import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Post angle types - 7 distinct content angles
export const POST_ANGLES = [
  "contrarian",
  "field_note",
  "demystification",
  "identity_validation",
  "provocateur",
  "synthesizer",
  "curious_cat",
] as const;

export type PostAngle = typeof POST_ANGLES[number];

// Article angle types - 4 long-form content angles
export const ARTICLE_ANGLES = [
  "deep_dive",
  "contrarian",
  "how_to",
  "case_study",
] as const;

export type ArticleAngle = typeof ARTICLE_ANGLES[number];

// Generation runs table
export const generationRuns = sqliteTable("generation_runs", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  sourceLabel: text("source_label").notNull(),
  // Store the original transcript for display/regeneration
  transcript: text("transcript"),
  status: text("status", { enum: ["pending", "processing", "complete", "failed"] }).notNull().default("pending"),
  postCount: integer("post_count").default(0),
  articleCount: integer("article_count").default(0),
  error: text("error"),
  // Multi-angle: which angles were selected for this run
  selectedAngles: text("selected_angles", { mode: "json" }).$type<PostAngle[]>(),
  selectedArticleAngles: text("selected_article_angles", { mode: "json" }).$type<ArticleAngle[]>(),
  // Auth: Supabase user UUID
  userId: text("user_id"),
});

// Insights table
export const insights = sqliteTable("insights", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => generationRuns.id),
  topic: text("topic").notNull(),
  claim: text("claim").notNull(),
  whyItMatters: text("why_it_matters").notNull(),
  misconception: text("misconception"),
  professionalImplication: text("professional_implication").notNull(),
});

// LinkedIn posts table
export const linkedinPosts = sqliteTable("linkedin_posts", {
  id: text("id").primaryKey(),
  insightId: text("insight_id").notNull().references(() => insights.id),
  runId: text("run_id").notNull().references(() => generationRuns.id),
  hook: text("hook").notNull(),
  bodyBeats: text("body_beats", { mode: "json" }).$type<string[]>().notNull(),
  openQuestion: text("open_question").notNull(),
  postType: text("post_type", {
    enum: POST_ANGLES
  }).notNull(),
  fullText: text("full_text").notNull(),
  // Multi-angle: version number (1-5) within each angle
  versionNumber: integer("version_number").default(1),
  // Approval workflow
  approved: integer("approved", { mode: "boolean" }).default(false),
  // Scheduling
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
  scheduledPosition: integer("scheduled_position"),
  // LinkedIn publishing
  linkedinPostUrn: text("linkedin_post_urn"),
  linkedinPublishedAt: integer("linkedin_published_at", { mode: "timestamp" }),
  linkedinPublishError: text("linkedin_publish_error"),
});

// Image intents table (ComfyUI-optimized)
export const imageIntents = sqliteTable("image_intents", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => linkedinPosts.id),
  // ComfyUI prompt fields
  prompt: text("prompt").notNull(),
  negativePrompt: text("negative_prompt").notNull(),
  headlineText: text("headline_text").notNull(),
  stylePreset: text("style_preset", {
    enum: ["typographic_minimal", "gradient_text", "dark_mode", "accent_bar", "abstract_shapes"],
  }).notNull(),
  // Generated image data
  generatedImageUrl: text("generated_image_url"),
  generatedAt: integer("generated_at", { mode: "timestamp" }),
  generationProvider: text("generation_provider", {
    enum: ["openai", "comfyui", "fal"],
  }),
  generationError: text("generation_error"),
});

// Style presets constant for reuse
export const STYLE_PRESETS = ["typographic_minimal", "gradient_text", "dark_mode", "accent_bar", "abstract_shapes"] as const;

// Articles table - long-form content (500-750 words)
export const articles = sqliteTable("articles", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => generationRuns.id),
  insightId: text("insight_id").notNull().references(() => insights.id),
  articleType: text("article_type", { enum: ARTICLE_ANGLES }).notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  introduction: text("introduction").notNull(),
  sections: text("sections", { mode: "json" }).$type<string[]>().notNull(),
  conclusion: text("conclusion").notNull(),
  fullText: text("full_text").notNull(),
  versionNumber: integer("version_number").default(1),
  approved: integer("approved", { mode: "boolean" }).default(false),
  // Scheduling
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
  scheduledPosition: integer("scheduled_position"),
});

// Article image intents table (ComfyUI-optimized)
export const articleImageIntents = sqliteTable("article_image_intents", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull().references(() => articles.id),
  prompt: text("prompt").notNull(),
  negativePrompt: text("negative_prompt").notNull(),
  headlineText: text("headline_text").notNull(),
  stylePreset: text("style_preset", {
    enum: STYLE_PRESETS,
  }).notNull(),
  // Generated image data
  generatedImageUrl: text("generated_image_url"),
  generatedAt: integer("generated_at", { mode: "timestamp" }),
  generationProvider: text("generation_provider", {
    enum: ["openai", "comfyui", "fal"],
  }),
  generationError: text("generation_error"),
});

// Carousel page structure (stored in JSON)
export interface CarouselPage {
  pageNumber: number;
  slideType: "title" | "content" | "cta";
  prompt: string;
  headlineText: string;
  caption?: string;
  bodyText?: string;
  imageUrl?: string;
  generatedAt?: Date;
  generationError?: string;
  // Version tracking
  activeVersionId?: string;
  versionCount?: number;
}

// Article carousel intents table
export const articleCarouselIntents = sqliteTable("article_carousel_intents", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull().references(() => articles.id),
  pageCount: integer("page_count").notNull().default(5),
  pages: text("pages", { mode: "json" }).$type<CarouselPage[]>(),
  stylePreset: text("style_preset", {
    enum: STYLE_PRESETS,
  }).notNull(),
  // Generated PDF data
  generatedPdfUrl: text("generated_pdf_url"),
  generatedAt: integer("generated_at", { mode: "timestamp" }),
  generationProvider: text("generation_provider", {
    enum: ["openai", "comfyui", "fal"],
  }),
  generationError: text("generation_error"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Carousel slide versions table - tracks version history for each slide
export const carouselSlideVersions = sqliteTable("carousel_slide_versions", {
  id: text("id").primaryKey(),
  carouselIntentId: text("carousel_intent_id").notNull().references(() => articleCarouselIntents.id, { onDelete: "cascade" }),
  slideNumber: integer("slide_number").notNull(), // 1-5
  versionNumber: integer("version_number").notNull(), // 1, 2, 3...
  // Content
  prompt: text("prompt").notNull(),
  headlineText: text("headline_text").notNull(),
  caption: text("caption"),
  imageUrl: text("image_url"),
  // Metadata
  isActive: integer("is_active", { mode: "boolean" }).default(false),
  generatedAt: integer("generated_at", { mode: "timestamp" }),
  generationProvider: text("generation_provider", {
    enum: ["openai", "comfyui", "fal"],
  }),
  generationError: text("generation_error"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Voice profiles table - for style matching
export const voiceProfiles = sqliteTable("voice_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  // Array of writing samples for few-shot style matching
  samples: text("samples", { mode: "json" }).$type<string[]>().notNull(),
  // Only one profile can be active at a time
  isActive: integer("is_active", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Imagery approach enum for brand styles
export const IMAGERY_APPROACHES = ["photography", "illustration", "abstract", "3d_render", "mixed"] as const;
export type ImageryApproach = typeof IMAGERY_APPROACHES[number];

// Color definition for brand palettes
export interface ColorDefinition {
  hex: string;
  name: string;
  usage: "primary" | "accent" | "background" | "text";
}

// Brand style profiles table - for consistent AI image generation
export const brandStyleProfiles = sqliteTable("brand_style_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),

  // Core Visual Identity
  primaryColors: text("primary_colors", { mode: "json" }).$type<ColorDefinition[]>().notNull(),
  secondaryColors: text("secondary_colors", { mode: "json" }).$type<ColorDefinition[]>(),
  colorMood: text("color_mood"), // e.g., "warm and energetic", "cool and professional"

  // Typography Style (for text-in-image generation)
  typographyStyle: text("typography_style"), // e.g., "bold sans-serif", "elegant serif"
  headlineWeight: text("headline_weight"), // e.g., "ultra-bold", "light", "medium"

  // Imagery Direction
  imageryApproach: text("imagery_approach", { enum: IMAGERY_APPROACHES }).notNull(),
  artisticReferences: text("artistic_references", { mode: "json" }).$type<string[]>(), // Reference artists/photographers/styles
  lightingPreference: text("lighting_preference"), // e.g., "soft natural", "dramatic studio"
  compositionStyle: text("composition_style"), // e.g., "minimalist", "layered", "centered"

  // Mood & Atmosphere
  moodDescriptors: text("mood_descriptors", { mode: "json" }).$type<string[]>(), // e.g., ["bold", "innovative"]
  texturePreference: text("texture_preference"), // e.g., "clean and flat", "grainy and vintage"

  // Technical Preferences
  aspectRatioPreference: text("aspect_ratio_preference", { enum: ["1:1", "16:9", "4:3", "1.91:1"] }),
  depthOfField: text("depth_of_field", { enum: ["shallow", "deep", "varied"] }),

  // Prompt Engineering - auto-injected into all image prompts
  stylePrefix: text("style_prefix"), // Auto-prepended to all prompts
  styleSuffix: text("style_suffix"), // Auto-appended to all prompts
  negativeConcepts: text("negative_concepts", { mode: "json" }).$type<string[]>(), // Things to avoid

  // Reference Images (URLs for image-to-image consistency)
  referenceImageUrls: text("reference_image_urls", { mode: "json" }).$type<string[]>(),

  // Status
  isActive: integer("is_active", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Push notification subscriptions
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(), // Public key for encryption
  auth: text("auth").notNull(), // Auth secret
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Content publishing status - tracks what has been posted/reminded
export const publishingStatus = sqliteTable("publishing_status", {
  id: text("id").primaryKey(),
  contentType: text("content_type", { enum: ["post", "article"] }).notNull(),
  contentId: text("content_id").notNull(),
  // Reminder status
  reminderSentAt: integer("reminder_sent_at", { mode: "timestamp" }),
  // Publishing status (for future LinkedIn integration)
  publishedAt: integer("published_at", { mode: "timestamp" }),
  publishedTo: text("published_to", { enum: ["linkedin", "twitter", "manual"] }),
  publishError: text("publish_error"),
  // LinkedIn post ID for reference
  externalPostId: text("external_post_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// LinkedIn connections (for future auto-posting)
export const linkedinConnections = sqliteTable("linkedin_connections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  accessToken: text("access_token").notNull(), // Should be encrypted in production
  refreshToken: text("refresh_token"),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  linkedinProfileId: text("linkedin_profile_id"),
  linkedinProfileName: text("linkedin_profile_name"),
  linkedinProfilePicture: text("linkedin_profile_picture"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Types
export type VoiceProfile = typeof voiceProfiles.$inferSelect;
export type NewVoiceProfile = typeof voiceProfiles.$inferInsert;
export type GenerationRun = typeof generationRuns.$inferSelect;
export type NewGenerationRun = typeof generationRuns.$inferInsert;
export type Insight = typeof insights.$inferSelect;
export type NewInsight = typeof insights.$inferInsert;
export type LinkedInPost = typeof linkedinPosts.$inferSelect;
export type NewLinkedInPost = typeof linkedinPosts.$inferInsert;
export type ImageIntent = typeof imageIntents.$inferSelect;
export type NewImageIntent = typeof imageIntents.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type ArticleImageIntent = typeof articleImageIntents.$inferSelect;
export type NewArticleImageIntent = typeof articleImageIntents.$inferInsert;
export type ArticleCarouselIntent = typeof articleCarouselIntents.$inferSelect;
export type NewArticleCarouselIntent = typeof articleCarouselIntents.$inferInsert;
export type CarouselSlideVersion = typeof carouselSlideVersions.$inferSelect;
export type NewCarouselSlideVersion = typeof carouselSlideVersions.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
export type PublishingStatus = typeof publishingStatus.$inferSelect;
export type NewPublishingStatus = typeof publishingStatus.$inferInsert;
export type LinkedinConnection = typeof linkedinConnections.$inferSelect;
export type NewLinkedinConnection = typeof linkedinConnections.$inferInsert;
export type BrandStyleProfile = typeof brandStyleProfiles.$inferSelect;
export type NewBrandStyleProfile = typeof brandStyleProfiles.$inferInsert;
