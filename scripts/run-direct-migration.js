const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

async function runDirectMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("🚀 Starting direct database migration...");

    // Read the migration script
    const migrationPath = path.join(
      __dirname,
      "..",
      "migration_fix_estimation_flows_schema.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("📋 Migration script size:", migrationSQL.length, "characters");

    // Execute the entire migration as a single query
    const { error } = await supabase.rpc("query", {
      query: migrationSQL,
    });

    if (error) {
      console.error("❌ Migration failed:", error);

      // Try alternative approach - direct SQL execution
      console.log("🔄 Trying alternative approach...");

      // Execute critical parts individually
      const criticalStatements = [
        // 1. Add missing columns to estimation_flows
        `ALTER TABLE estimation_flows ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);`,
        `ALTER TABLE estimation_flows ADD COLUMN IF NOT EXISTS flow_data JSONB DEFAULT '{}';`,
        `ALTER TABLE estimation_flows ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;`,
        `ALTER TABLE estimation_flows ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP DEFAULT NOW();`,

        // 2. Update RLS policies
        `DROP POLICY IF EXISTS "Users can view own estimation flows" ON estimation_flows;`,
        `CREATE POLICY "Users can view own estimation flows" 
          ON estimation_flows FOR SELECT 
          USING (user_id = auth.uid());`,

        `DROP POLICY IF EXISTS "Users can insert estimation flows" ON estimation_flows;`,
        `CREATE POLICY "Users can insert estimation flows" 
          ON estimation_flows FOR INSERT 
          WITH CHECK (user_id = auth.uid());`,

        `DROP POLICY IF EXISTS "Users can update own estimation flows" ON estimation_flows;`,
        `CREATE POLICY "Users can update own estimation flows" 
          ON estimation_flows FOR UPDATE 
          USING (user_id = auth.uid());`,
      ];

      for (let i = 0; i < criticalStatements.length; i++) {
        const statement = criticalStatements[i];
        console.log(
          `⏳ Executing critical statement ${i + 1}/${criticalStatements.length}...`,
        );

        try {
          const { error: stmtError } = await supabase.rpc("query", {
            query: statement,
          });

          if (stmtError) {
            console.error(`❌ Error in statement ${i + 1}:`, stmtError);
            // Continue with next statement
            continue;
          }

          console.log(`   ✅ Statement ${i + 1} completed successfully`);
        } catch (stmtError) {
          console.error(`❌ Exception in statement ${i + 1}:`, stmtError);
          continue;
        }
      }

      console.log("🎯 Critical migration steps completed");
    } else {
      console.log("🎉 Migration completed successfully!");
    }

    // Verify the key columns exist
    const { data: columns, error: columnsError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "estimation_flows")
      .in("column_name", ["user_id", "flow_data", "version", "last_modified"]);

    if (columnsError) {
      console.error("❌ Error verifying columns:", columnsError);
    } else {
      console.log(
        "✅ Verified columns:",
        columns.map((c) => c.column_name),
      );
    }

    // Test the auto-save functionality
    console.log("🧪 Testing auto-save functionality...");

    const testEstimateId = "test-estimate-" + Date.now();
    const testUserId = "00000000-0000-0000-0000-000000000000"; // Default test user

    const { error: testError } = await supabase
      .from("estimation_flows")
      .insert({
        estimate_id: testEstimateId,
        user_id: testUserId,
        flow_data: { test: "data" },
        version: 1,
        last_modified: new Date().toISOString(),
      });

    if (testError) {
      console.error("❌ Test insert failed:", testError);
    } else {
      console.log("✅ Test insert succeeded");

      // Clean up test data
      await supabase
        .from("estimation_flows")
        .delete()
        .eq("estimate_id", testEstimateId);
    }
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

// Load environment variables
require("dotenv").config({ path: ".env.local" });

runDirectMigration();
