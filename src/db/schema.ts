import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Post angle types - 6 distinct content angles
export const POST_ANGLES = [
  "contrarian",
  "field_note",
  "demystification",
  "identity_validation",
  "provocateur",
  "synthesizer",
] as const;

export type PostAngle = typeof POST_ANGLES[number];

// Generation runs table
export const generationRuns = sqliteTable("generation_runs", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  sourceLabel: text("source_label").notNull(),
  status: text("status", { enum: ["pending", "processing", "complete", "failed"] }).notNull().default("pending"),
  postCount: integer("post_count").default(0),
  error: text("error"),
  // Multi-angle: which angles were selected for this run
  selectedAngles: text("selected_angles", { mode: "json" }).$type<PostAngle[]>(),
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

// Types
export type GenerationRun = typeof generationRuns.$inferSelect;
export type NewGenerationRun = typeof generationRuns.$inferInsert;
export type Insight = typeof insights.$inferSelect;
export type NewInsight = typeof insights.$inferInsert;
export type LinkedInPost = typeof linkedinPosts.$inferSelect;
export type NewLinkedInPost = typeof linkedinPosts.$inferInsert;
export type ImageIntent = typeof imageIntents.$inferSelect;
export type NewImageIntent = typeof imageIntents.$inferInsert;
