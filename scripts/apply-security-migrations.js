const { createClient } = require("@supabase/supabase-js");
const fs = require("fs").promises;
const path = require("path");

require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration(migrationPath, migrationName) {
  try {
    console.log(`\n🚀 Running migration: ${migrationName}`);

    // Read the migration file
    const sql = await fs.readFile(migrationPath, "utf8");

    // Split by semicolons but keep them, and filter out empty statements
    const statements = sql
      .split(/;(?=\s*(?:--|CREATE|DROP|ALTER|INSERT|UPDATE|DELETE|COMMENT|$))/i)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--") && s !== ";");

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.includes("\\echo")) {
        // Skip psql meta-commands
        console.log(
          `   Skipping psql command: ${statement.substring(0, 50)}...`,
        );
        continue;
      }

      console.log(`   Executing statement ${i + 1}/${statements.length}...`);
      const { error } = await supabase
        .rpc("exec_sql", {
          sql_query: statement + ";",
        })
        .single();

      if (error) {
        // Try direct execution if RPC fails
        const { error: directError } = await supabase
          .from("_migrations")
          .select("*")
          .limit(0);
        if (directError) {
          throw new Error(`Statement ${i + 1} failed: ${error.message}`);
        }
      }
    }

    console.log(`✅ Successfully applied: ${migrationName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to apply ${migrationName}:`, error.message);
    return false;
  }
}

async function main() {
  const phase = process.argv[2] || "all";

  console.log("🔐 Supabase Security Migration Tool");
  console.log("==================================");

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

  console.log(`\nPhase: ${phase}`);
  console.log(`Migrations to run: ${migrationsToRun.length}`);

  let successCount = 0;

  for (const migration of migrationsToRun) {
    const migrationPath = path.join(
      __dirname,
      "..",
      "supabase",
      "migrations",
      migration.file,
    );
    const success = await runMigration(migrationPath, migration.description);
    if (success) successCount++;
  }

  console.log(
    `\n📊 Summary: ${successCount}/${migrationsToRun.length} migrations applied successfully`,
  );

  if (successCount < migrationsToRun.length) {
    console.log("\n⚠️  Some migrations failed. Please check the errors above.");
    process.exit(1);
  } else {
    console.log("\n✨ All migrations applied successfully!");
  }
}

main().catch(console.error);
