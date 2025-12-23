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
});

// Style presets constant for reuse
export const STYLE_PRESETS = ["typographic_minimal", "gradient_text", "dark_mode", "accent_bar", "abstract_shapes"] as const;

// Source links table - external sources for content generation
export const sourceLinks = sqliteTable("source_links", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => generationRuns.id),
  url: text("url").notNull(),
  // Fetched content
  title: text("title"),
  rawContent: text("raw_content"),
  fetchedAt: integer("fetched_at", { mode: "timestamp" }),
  // Status
  status: text("status", { enum: ["pending", "fetching", "fetched", "failed"] }).notNull().default("pending"),
  error: text("error"),
});

// Source summaries table - parsed insights from each source
export const sourceSummaries = sqliteTable("source_summaries", {
  id: text("id").primaryKey(),
  sourceLinkId: text("source_link_id").notNull().references(() => sourceLinks.id),
  runId: text("run_id").notNull().references(() => generationRuns.id),
  mainClaims: text("main_claims", { mode: "json" }).$type<string[]>().notNull(),
  keyDetails: text("key_details", { mode: "json" }).$type<string[]>().notNull(),
  impliedAssumptions: text("implied_assumptions", { mode: "json" }).$type<string[]>().notNull(),
  relevanceToAIProfessionals: text("relevance_to_ai_professionals").notNull(),
});

// Distilled insights from source supervisor
export const distilledInsights = sqliteTable("distilled_insights", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => generationRuns.id),
  theme: text("theme").notNull(),
  synthesizedClaim: text("synthesized_claim").notNull(),
  supportingSources: text("supporting_sources", { mode: "json" }).$type<string[]>().notNull(),
  whyItMatters: text("why_it_matters").notNull(),
  commonMisread: text("common_misread").notNull(),
});

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
});

// Types
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
export type SourceLink = typeof sourceLinks.$inferSelect;
export type NewSourceLink = typeof sourceLinks.$inferInsert;
export type SourceSummary = typeof sourceSummaries.$inferSelect;
export type NewSourceSummary = typeof sourceSummaries.$inferInsert;
export type DistilledInsight = typeof distilledInsights.$inferSelect;
export type NewDistilledInsight = typeof distilledInsights.$inferInsert;
