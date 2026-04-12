#!/usr/bin/env npx tsx
/**
 * Auto-CRM — PostgreSQL initialization
 *
 * Pushes schema to Neon/Postgres and seeds default pipeline stages.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/init.ts          # init only
 *   DATABASE_URL=... npx tsx scripts/init.ts --seed   # init + demo data
 *
 * For local dev, set DATABASE_URL in .env.local first.
 */

import { execSync } from "child_process";
import path from "path";
import fs from "fs";

// Load .env.local for local dev
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

if (!process.env.DATABASE_URL) {
  console.error(
    "\nError: DATABASE_URL no configurado.\n" +
      "Agrega a .env.local:\n" +
      "  DATABASE_URL=postgres://user:pass@host/db?sslmode=require\n"
  );
  process.exit(1);
}

const shouldSeed = process.argv.includes("--seed");

async function main() {
  console.log("Initializing Auto-CRM (PostgreSQL)...");

  // Push schema via drizzle-kit (creates/updates all tables)
  console.log("\nPushing schema to database...");
  execSync("npx drizzle-kit push", { stdio: "inherit" });

  // Seed default pipeline stages (idempotent)
  console.log("\nChecking pipeline stages...");
  const { db } = await import("../src/db/index.js");
  const { pipelineStages } = await import("../src/db/schema.js");

  const existing = await db.select().from(pipelineStages);

  if (existing.length === 0) {
    const defaultStages = [
      { name: "Prospecto",       order: 1, color: "#64748b", isWon: false, isLost: false },
      { name: "Contactado",      order: 2, color: "#2563eb", isWon: false, isLost: false },
      { name: "Propuesta",       order: 3, color: "#8b5cf6", isWon: false, isLost: false },
      { name: "Negociacion",     order: 4, color: "#ea580c", isWon: false, isLost: false },
      { name: "Cerrado Ganado",  order: 5, color: "#16a34a", isWon: true,  isLost: false },
      { name: "Cerrado Perdido", order: 6, color: "#dc2626", isWon: false, isLost: true  },
    ];
    await db.insert(pipelineStages).values(defaultStages);
    console.log("Default pipeline stages created.");
  } else {
    console.log(`Pipeline stages already exist (${existing.length}), skipping.`);
  }

  // Copy default config if none exists
  const configPath = path.join(process.cwd(), "crm-config.json");
  const defaultConfigPath = path.join(process.cwd(), "public", "crm-config.json");
  if (!fs.existsSync(configPath) && fs.existsSync(defaultConfigPath)) {
    fs.copyFileSync(defaultConfigPath, configPath);
    console.log("Default crm-config.json created.");
  }

  if (shouldSeed) {
    console.log("\nSeeding demo data...");
    execSync("npx tsx src/db/seed.ts", { stdio: "inherit" });
  }

  console.log("\nAuto-CRM initialized successfully!");
  console.log("Run 'npm run dev' to start the development server.");
  console.log("Open http://localhost:3000 to access your CRM.");
}

main().catch((err) => {
  console.error("Init failed:", err);
  process.exit(1);
});
