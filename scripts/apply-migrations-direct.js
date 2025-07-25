const { createClient } = require("@supabase/supabase-js");
const fs = require("fs").promises;
const path = require("path");

require("dotenv").config({ path: ".env.local" });

// Create a script that outputs SQL commands we can run manually
async function generateMigrationScript() {
  const phase = process.argv[2] || "all";

  console.log("-- Supabase Security Migration SQL");
  console.log("-- Run these commands in the Supabase SQL Editor");
  console.log("-- ==================================");

  const migrations = [
    {
      phase: 2,
      file: "20250124_fix_security_definer_views.sql",
      description: "Fix SECURITY DEFINER views (Critical)",
    },
    {
      phase: 3,
      file: "20250124_fix_function_search_paths.sql",
      description: "Fix function search paths",
    },
    {
      phase: 4,
      file: "20250124_fix_rls_performance.sql",
      description: "Fix RLS performance issues",
    },
    {
      phase: 4,
      file: "20250124_cleanup_duplicate_policies_indexes.sql",
      description: "Clean up duplicate policies and indexes",
    },
  ];

  const migrationsToRun =
    phase === "all"
      ? migrations
      : migrations.filter((m) => m.phase === parseInt(phase));

  console.log(`-- Phase: ${phase}`);
  console.log(`-- Migrations to include: ${migrationsToRun.length}`);
  console.log("");

  for (const migration of migrationsToRun) {
    const migrationPath = path.join(
      __dirname,
      "..",
      "supabase",
      "migrations",
      migration.file,
    );
    const sql = await fs.readFile(migrationPath, "utf8");

    console.log(`-- ========================================`);
    console.log(`-- ${migration.description}`);
    console.log(`-- From: ${migration.file}`);
    console.log(`-- ========================================`);
    console.log("");
    console.log(sql);
    console.log("");
  }

  console.log("-- ========================================");
  console.log("-- End of migration script");
  console.log("-- ========================================");
}

generateMigrationScript().catch(console.error);
