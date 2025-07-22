const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read the migration script
    const migrationPath = path.join(
      __dirname,
      "..",
      "sql/migrations/migration_pilot_certifications.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("🚀 Starting database migration...");
    console.log("📋 Migration script size:", migrationSQL.length, "characters");

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log("📝 Found", statements.length, "SQL statements to execute");

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        console.log(
          "   ",
          statement.substring(0, 80) + (statement.length > 80 ? "..." : ""),
        );

        const { error } = await supabase.rpc("exec_sql", { sql: statement });
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);

          // If it's a "relation already exists" error, continue
          if (error.message && error.message.includes("already exists")) {
            console.log("   ℹ️  Skipping - relation already exists");
            continue;
          }

          throw error;
        }
        console.log(`   ✅ Statement ${i + 1} completed successfully`);
      }
    }

    console.log("🎉 Migration completed successfully!");

    // Verify tables were created
    const { data: tables, error: tablesError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .in("table_name", ["customers", "estimation_flows", "estimates"]);

    if (tablesError) {
      console.error("❌ Error verifying tables:", tablesError);
    } else {
      console.log(
        "✅ Verified tables:",
        tables.map((t) => t.table_name),
      );
    }
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

// Load environment variables
require("dotenv").config({ path: ".env.local" });

runMigration();
