/**
 * Database connector — PostgreSQL (production / Vercel Neon)
 *
 * Requires DATABASE_URL in environment.
 * For local development, add to .env.local:
 *   DATABASE_URL=postgres://user:pass@host/db?sslmode=require
 *
 * Recommended free local Postgres options:
 *   - Neon free tier:  https://neon.tech
 *   - Docker: docker run -e POSTGRES_PASSWORD=crm -p 5432:5432 postgres
 *             DATABASE_URL=postgres://postgres:crm@localhost:5432/postgres
 *
 * For SQLite local dev without Postgres, use src/db/index-sqlite.ts manually.
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "\nDATABASE_URL no configurado.\n" +
      "Agrega a .env.local:\n" +
      "  DATABASE_URL=postgres://user:pass@host/db?sslmode=require\n\n" +
      "Opciones gratuitas:\n" +
      "  1. Neon (recomendado): https://neon.tech\n" +
      "  2. Docker local: postgres://postgres:crm@localhost:5432/postgres\n"
  );
}

const isLocalhost =
  DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1");

const client = postgres(DATABASE_URL, {
  ssl: isLocalhost ? false : "require",
  max: 1, // Vercel Fluid Compute: 1 connection per instance
  idle_timeout: 20,
  connect_timeout: 30,
});

export const db = drizzle(client, { schema });
export { schema };
