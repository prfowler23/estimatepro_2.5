const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase configuration");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runAnalyticsMigration() {
  try {
    console.log("🚀 Running analytics migration...");

    // Read the SQL file
    const migrationFile = path.join(
      __dirname,
      "../sql/migrations/15-add-analytics-tables.sql",
    );
    const sql = fs.readFileSync(migrationFile, "utf8");

    // Split into individual statements
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);

      try {
        const { error } = await supabase.rpc("exec_sql", { sql: statement });
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
          continue; // Continue with next statement
        }
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (err) {
        console.error(`❌ Error executing statement ${i + 1}:`, err.message);
        continue; // Continue with next statement
      }
    }

    // Verify key tables exist
    console.log("\n🔍 Verifying analytics tables...");

    const tables = [
      "workflow_analytics",
      "analytics_metrics",
      "user_performance_stats",
      "workflow_benchmarks",
      "predictive_insights",
      "analytics_dashboards",
      "analytics_exports",
      "analytics_alerts",
      "time_series_analytics",
    ];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: exists`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }

    console.log("\n🎉 Analytics migration completed!");
    console.log("\nNext steps:");
    console.log("1. Test the analytics dashboard components");
    console.log("2. Verify analytics data collection");
    console.log("3. Test export and alert functionality");
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

runAnalyticsMigration();
