import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database("linwheel.db");
export const db = drizzle(sqlite, { schema });

// Initialize tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS generation_runs (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    source_label TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    post_count INTEGER DEFAULT 0,
    error TEXT
  );

  CREATE TABLE IF NOT EXISTS insights (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES generation_runs(id),
    topic TEXT NOT NULL,
    claim TEXT NOT NULL,
    why_it_matters TEXT NOT NULL,
    misconception TEXT,
    professional_implication TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS linkedin_posts (
    id TEXT PRIMARY KEY,
    insight_id TEXT NOT NULL REFERENCES insights(id),
    run_id TEXT NOT NULL REFERENCES generation_runs(id),
    hook TEXT NOT NULL,
    body_beats TEXT NOT NULL,
    open_question TEXT NOT NULL,
    post_type TEXT NOT NULL,
    full_text TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS image_intents (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES linkedin_posts(id),
    headline_text TEXT NOT NULL,
    visual_style TEXT NOT NULL,
    background TEXT NOT NULL,
    mood TEXT NOT NULL,
    layout_hint TEXT NOT NULL
  );
`);

export { schema };
