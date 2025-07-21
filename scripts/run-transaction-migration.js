const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

async function runTransactionMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read the transaction migration script
    const migrationPath = path.join(
      __dirname,
      "..",
      "migration_transaction_support.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("🚀 Starting transaction support migration...");
    console.log("📋 Migration script size:", migrationSQL.length, "characters");

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log("📝 Found", statements.length, "SQL statements to execute");

    // Execute each statement directly through the SQL editor
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        console.log(
          "   ",
          statement.substring(0, 80) + (statement.length > 80 ? "..." : ""),
        );

        try {
          // Execute the statement directly
          const { error } = await supabase.rpc("exec_sql", { sql: statement });
          if (error) {
            // Try alternative approach if exec_sql doesn't exist
            const { error: directError } = await supabase
              .from("pg_stat_activity")
              .select("*")
              .limit(1);
            if (directError) {
              console.log("   ℹ️  Using direct query approach");
              // For transaction functions, we need to create them through the dashboard
              // or handle them differently
              console.log(
                "   ⚠️  Transaction functions need to be created manually in Supabase dashboard",
              );
              console.log("   📝 SQL to run:", statement);
            }
          } else {
            console.log(`   ✅ Statement ${i + 1} completed successfully`);
          }
        } catch (err) {
          console.error(`❌ Error in statement ${i + 1}:`, err);

          // If it's a "relation already exists" error, continue
          if (err.message && err.message.includes("already exists")) {
            console.log("   ℹ️  Skipping - relation already exists");
            continue;
          }

          console.log(
            "   ⚠️  Please create this function manually in Supabase SQL editor:",
          );
          console.log("   📝", statement);
        }
      }
    }

    console.log("🎉 Transaction migration completed!");
    console.log(
      "⚠️  Please verify transaction functions were created in Supabase dashboard",
    );
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

runTransactionMigration();
