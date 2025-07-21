const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

async function fixAutoSaveSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase environment variables");
    console.log("Please ensure you have:");
    console.log("- NEXT_PUBLIC_SUPABASE_URL in your .env.local");
    console.log("- SUPABASE_SERVICE_ROLE_KEY in your .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    console.log("🔧 Starting auto-save schema fix...");
    console.log("📍 Supabase URL:", supabaseUrl.substring(0, 30) + "...");

    // Read the migration script
    const migrationPath = path.join(
      __dirname,
      "..",
      "migration_fix_estimation_flows_schema.sql",
    );

    if (!fs.existsSync(migrationPath)) {
      console.error("❌ Migration file not found:", migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, "utf8");
    console.log(
      "📋 Migration script loaded:",
      migrationSQL.length,
      "characters",
    );

    // For this complex migration, we'll execute it as one block
    // since it has proper DO blocks and error handling
    console.log("⏳ Executing auto-save schema migration...");

    const { error } = await supabase.rpc("exec_sql", {
      sql: migrationSQL,
    });

    if (error) {
      console.error("❌ Migration failed:", error);

      // Provide helpful error messages
      if (error.message?.includes("permission denied")) {
        console.log("\n💡 This error usually means:");
        console.log("1. The SUPABASE_SERVICE_ROLE_KEY is incorrect");
        console.log(
          "2. You need to use the service role key, not the anon key",
        );
        console.log("3. Check your .env.local file");
      }

      if (error.message?.includes("function exec_sql does not exist")) {
        console.log("\n💡 The exec_sql function is not available.");
        console.log(
          "You'll need to run this migration manually in the Supabase SQL Editor.",
        );
        console.log(
          "Copy the contents of migration_fix_estimation_flows_schema.sql",
        );
        console.log(
          "and paste it into the SQL Editor at https://supabase.com/dashboard",
        );
      }

      throw error;
    }

    console.log("✅ Auto-save schema migration completed successfully!");

    // Verify the tables were created/updated
    console.log("\n🔍 Verifying database schema...");

    const { data: columns, error: columnsError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "estimation_flows")
      .eq("table_schema", "public");

    if (columnsError) {
      console.warn("⚠️  Could not verify columns:", columnsError.message);
    } else {
      const columnNames = columns.map((c) => c.column_name);
      const requiredColumns = [
        "user_id",
        "flow_data",
        "version",
        "last_modified",
      ];
      const missingColumns = requiredColumns.filter(
        (col) => !columnNames.includes(col),
      );

      if (missingColumns.length === 0) {
        console.log(
          "✅ All required columns present:",
          requiredColumns.join(", "),
        );
      } else {
        console.warn("⚠️  Missing columns:", missingColumns.join(", "));
      }
    }

    // Check RLS policies
    const { data: policies, error: policiesError } = await supabase
      .from("pg_policies")
      .select("policyname")
      .eq("tablename", "estimation_flows");

    if (policiesError) {
      console.warn("⚠️  Could not verify RLS policies:", policiesError.message);
    } else {
      console.log("✅ RLS policies found:", policies.length);
    }

    console.log("\n🎉 Auto-save schema fix completed!");
    console.log("📋 Next steps:");
    console.log("1. Restart your development server: npm run dev");
    console.log("2. Test the guided estimation flow");
    console.log("3. Check browser console - auto-save errors should be gone");
    console.log("4. Verify data persists between page refreshes");
  } catch (error) {
    console.error("💥 Schema fix failed:", error.message);
    console.log("\n🔧 Manual fix option:");
    console.log("1. Open Supabase Dashboard SQL Editor");
    console.log(
      "2. Copy contents of migration_fix_estimation_flows_schema.sql",
    );
    console.log("3. Paste and run the SQL commands manually");
    process.exit(1);
  }
}

// Load environment variables
require("dotenv").config({ path: ".env.local" });

fixAutoSaveSchema();
