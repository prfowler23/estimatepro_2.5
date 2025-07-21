const { createClient } = require("@supabase/supabase-js");

async function checkDatabaseState() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("🔍 Checking database state...");

    // Check if estimation_flows table exists by trying to query it
    console.log("🔍 Checking if estimation_flows table exists...");
    const { data: testData, error: testError } = await supabase
      .from("estimation_flows")
      .select("*")
      .limit(1);

    if (testError) {
      console.error(
        "❌ estimation_flows table does not exist or is not accessible:",
        testError,
      );
      return;
    }

    console.log("✅ estimation_flows table exists");

    // Try to get schema information using a different approach
    console.log("🔍 Getting table schema information...");
    const { data: schemaData, error: schemaError } = await supabase
      .rpc("get_table_schema", { table_name: "estimation_flows" })
      .single();

    if (schemaError) {
      console.log(
        "ℹ️  Cannot get detailed schema info, trying basic queries...",
      );

      // Test for specific columns by trying to select them
      const requiredColumns = [
        "user_id",
        "flow_data",
        "version",
        "last_modified",
      ];
      console.log("🔍 Testing for required columns...");

      for (const column of requiredColumns) {
        try {
          const { error: colError } = await supabase
            .from("estimation_flows")
            .select(column)
            .limit(1);

          if (colError) {
            if (colError.code === "42703") {
              console.log(`❌ Missing column: ${column}`);
            } else {
              console.log(`❓ Column ${column} test failed:`, colError.message);
            }
          } else {
            console.log(`✅ Column exists: ${column}`);
          }
        } catch (err) {
          console.log(`❌ Error testing column ${column}:`, err.message);
        }
      }
    } else {
      console.log("📊 Schema information:", schemaData);
    }

    // Final summary
    console.log("\n📋 Database State Summary:");
    console.log("✅ estimation_flows table exists and is accessible");
    console.log("ℹ️  Check console output above for column availability");
    console.log("\n🔧 Next steps:");
    console.log(
      "  1. If missing columns were found, run the database migration",
    );
    console.log("  2. Test the auto-save functionality in the application");
    console.log("  3. Check for any remaining errors in the browser console");
  } catch (error) {
    console.error("💥 Database check failed:", error);
  }
}

// Load environment variables
require("dotenv").config({ path: ".env.local" });

checkDatabaseState();
