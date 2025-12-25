import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit configuration
 *
 * Supports both local SQLite and Turso:
 * - Local: DATABASE_URL=file:./linwheel.db (default)
 * - Turso: DATABASE_URL=libsql://xxx.turso.io + DATABASE_AUTH_TOKEN
 */
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:./linwheel.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
} satisfies Config;
