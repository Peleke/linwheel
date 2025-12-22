import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Generation runs table
export const generationRuns = sqliteTable("generation_runs", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  sourceLabel: text("source_label").notNull(),
  status: text("status", { enum: ["pending", "processing", "complete", "failed"] }).notNull().default("pending"),
  postCount: integer("post_count").default(0),
  error: text("error"),
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
    enum: ["contrarian", "field_note", "demystification", "identity_validation"]
  }).notNull(),
  fullText: text("full_text").notNull(),
});

// Image intents table
export const imageIntents = sqliteTable("image_intents", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => linkedinPosts.id),
  headlineText: text("headline_text").notNull(),
  visualStyle: text("visual_style").notNull(),
  background: text("background").notNull(),
  mood: text("mood").notNull(),
  layoutHint: text("layout_hint").notNull(),
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
