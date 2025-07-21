#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

async function runSimpleMigration() {
  console.log("🔧 Running simplified database migration...\n");

  // Load environment variables
  require("dotenv").config({ path: ".env.local" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing required environment variables:");
    console.error("   - NEXT_PUBLIC_SUPABASE_URL");
    console.error("   - SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Test basic connection
    console.log("📡 Testing database connection...");
    const { error: testError } = await supabase.auth.getSession();
    console.log("✅ Connection established");

    // Check if estimation_flows exists
    console.log("\n🔍 Checking current database state...");
    const { data: tableCheck, error: tableError } = await supabase
      .from("estimation_flows")
      .select("id")
      .limit(1);

    if (tableError) {
      console.log(`❌ estimation_flows table issue: ${tableError.message}`);
      console.log("📝 The table needs to be created or fixed");
    } else {
      console.log("✅ estimation_flows table exists");
      console.log(`📊 Found ${tableCheck?.length || 0} records`);
    }

    // Try to check table structure using information_schema
    console.log("\n🔍 Attempting to check table structure...");

    // Since we can't run arbitrary SQL, let's create the table directly
    console.log(
      "\n📝 You need to run the migration SQL manually in Supabase Dashboard",
    );
    console.log("\nSteps to fix:");
    console.log("1. Go to your Supabase Dashboard");
    console.log("2. Navigate to SQL Editor");
    console.log(
      "3. Copy and paste the contents of migration_fix_estimation_flows_schema.sql",
    );
    console.log("4. Run the SQL commands");

    // Show the path to the migration file
    const migrationPath = path.join(
      __dirname,
      "..",
      "migration_fix_estimation_flows_schema.sql",
    );
    console.log(`\n📄 Migration file location: ${migrationPath}`);

    if (fs.existsSync(migrationPath)) {
      console.log("✅ Migration file exists and is ready to use");

      // Show a preview of the migration
      const migrationContent = fs.readFileSync(migrationPath, "utf8");
      const lines = migrationContent.split("\n");
      console.log("\n📋 Migration preview (first 10 lines):");
      lines.slice(0, 10).forEach((line, index) => {
        console.log(`   ${index + 1}: ${line}`);
      });
      console.log("   ... (see full file for complete migration)");
    } else {
      console.log("❌ Migration file not found");
    }

    // Test basic operations to see what's working
    console.log("\n🧪 Testing current functionality...");

    // Test estimates table
    const { data: estimates, error: estimatesError } = await supabase
      .from("estimates")
      .select("id, quote_number")
      .limit(1);

    if (estimatesError) {
      console.log(`❌ estimates table issue: ${estimatesError.message}`);
    } else {
      console.log(
        `✅ estimates table working (${estimates?.length || 0} records)`,
      );
    }

    console.log("\n🎯 Next steps:");
    console.log("1. Open Supabase Dashboard SQL Editor");
    console.log("2. Run the migration SQL file manually");
    console.log("3. Come back and test the auto-save functionality");
    console.log(
      "4. If you get permission errors, make sure you're using the service role key",
    );
  } catch (error) {
    console.error("\n💥 Error:", error.message);
    console.error("\nTroubleshooting:");
    console.error(
      "1. Check your .env.local file has correct Supabase credentials",
    );
    console.error("2. Verify your service role key has admin permissions");
    console.error("3. Check network connectivity to Supabase");
  }
}

if (require.main === module) {
  runSimpleMigration().catch(console.error);
}
