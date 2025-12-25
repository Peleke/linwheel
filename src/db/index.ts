import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

/**
 * Database client configuration
 *
 * Supports both:
 * - Local SQLite: DATABASE_URL=file:./linwheel.db
 * - Turso (production): DATABASE_URL=libsql://xxx.turso.io + DATABASE_AUTH_TOKEN
 */
const client = createClient({
  url: process.env.DATABASE_URL || "file:./linwheel.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

export { schema };
