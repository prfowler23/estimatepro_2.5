#!/usr/bin/env node

/**
 * Migration script to add facade analysis tables
 * Run with: node scripts/migrations/add-facade-analysis-tables.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log("🚀 Starting facade analysis tables migration...\n");

  try {
    // Read the SQL migration file
    const migrationPath = path.join(
      __dirname,
      "../../migrations/facade-analysis-schema.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("📄 Loaded migration file:", migrationPath);
    console.log("📊 Migration contains:");
    console.log("  - facade_analyses table");
    console.log("  - facade_analysis_images table");
    console.log("  - Indexes and RLS policies\n");

    // Execute the migration
    console.log("⏳ Executing migration...");
    const { error } = await supabase.rpc("exec_sql", {
      sql: migrationSQL,
    });

    if (error) {
      // If the RPC function doesn't exist, try direct execution
      if (
        error.message.includes("function") &&
        error.message.includes("does not exist")
      ) {
        console.log("⚠️  Direct SQL execution not available via RPC");
        console.log(
          "📋 Please run the following SQL in Supabase SQL Editor:\n",
        );
        console.log("-- Copy everything below this line --");
        console.log(migrationSQL);
        console.log("-- Copy everything above this line --\n");
        console.log(
          "🔗 Supabase SQL Editor: " +
            supabaseUrl.replace(".supabase.co", ".supabase.com") +
            "/sql",
        );
        return;
      }
      throw error;
    }

    console.log("✅ Migration executed successfully!\n");

    // Verify tables were created
    console.log("🔍 Verifying tables...");

    const { data: facadeAnalysesTable, error: facadeError } = await supabase
      .from("facade_analyses")
      .select("*")
      .limit(1);

    if (facadeError && !facadeError.message.includes("0 rows")) {
      console.error(
        "❌ Error verifying facade_analyses table:",
        facadeError.message,
      );
    } else {
      console.log("✅ facade_analyses table created successfully");
    }

    const { data: imagesTable, error: imagesError } = await supabase
      .from("facade_analysis_images")
      .select("*")
      .limit(1);

    if (imagesError && !imagesError.message.includes("0 rows")) {
      console.error(
        "❌ Error verifying facade_analysis_images table:",
        imagesError.message,
      );
    } else {
      console.log("✅ facade_analysis_images table created successfully");
    }

    console.log("\n🎉 Migration completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("1. Regenerate TypeScript types:");
    console.log(
      "   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts",
    );
    console.log("2. Run npm run typecheck to verify type errors are resolved");
    console.log("3. Test the facade analysis feature end-to-end");
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.error("\n💡 Troubleshooting tips:");
    console.error(
      "1. Ensure your Supabase service role key has sufficient permissions",
    );
    console.error("2. Check if the tables already exist in your database");
    console.error("3. Try running the SQL directly in Supabase SQL Editor");
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);
