/**
 * Direct migration script for Turso
 * Run with: npx tsx scripts/migrate-turso.ts
 */

import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

async function migrate() {
  console.log("Connecting to Turso...");

  // Check current tables
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log("Current tables:", tables.rows.map(r => r.name).join(", "));

  // 1. Add user_id to generation_runs if missing
  try {
    await client.execute("ALTER TABLE generation_runs ADD COLUMN user_id TEXT");
    console.log("✓ Added user_id column to generation_runs");
  } catch (e: unknown) {
    const error = e as Error;
    if (error.message.includes("duplicate column")) {
      console.log("- user_id column already exists");
    } else {
      throw e;
    }
  }

  // 2. Update existing rows with the user's ID
  const result = await client.execute({
    sql: "UPDATE generation_runs SET user_id = ? WHERE user_id IS NULL",
    args: ["e708de17-68c9-4e72-a504-e3179486d611"],
  });
  console.log(`✓ Updated ${result.rowsAffected} rows with user_id`);

  // 3. Create carousel_slide_versions table if missing
  try {
    await client.execute(`
      CREATE TABLE carousel_slide_versions (
        id TEXT PRIMARY KEY NOT NULL,
        carousel_intent_id TEXT NOT NULL,
        slide_number INTEGER NOT NULL,
        version_number INTEGER NOT NULL,
        prompt TEXT NOT NULL,
        headline_text TEXT NOT NULL,
        caption TEXT,
        image_url TEXT,
        is_active INTEGER DEFAULT 0,
        generated_at INTEGER,
        generation_provider TEXT,
        generation_error TEXT,
        created_at INTEGER,
        FOREIGN KEY (carousel_intent_id) REFERENCES article_carousel_intents(id) ON DELETE CASCADE
      )
    `);
    console.log("✓ Created carousel_slide_versions table");
  } catch (e: unknown) {
    const error = e as Error;
    if (error.message.includes("already exists")) {
      console.log("- carousel_slide_versions table already exists");
    } else {
      throw e;
    }
  }

  // 4. Create index if missing
  try {
    await client.execute(`
      CREATE INDEX idx_slide_versions_carousel_slide
      ON carousel_slide_versions (carousel_intent_id, slide_number)
    `);
    console.log("✓ Created index on carousel_slide_versions");
  } catch (e: unknown) {
    const error = e as Error;
    if (error.message.includes("already exists")) {
      console.log("- Index already exists");
    } else {
      throw e;
    }
  }

  // Verify
  const tablesAfter = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log("\nTables after migration:", tablesAfter.rows.map(r => r.name).join(", "));

  console.log("\n✓ Migration complete!");
}

migrate().catch(console.error);
