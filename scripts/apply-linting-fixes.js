const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log("❌ Missing Supabase environment variables");
  console.log(
    "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local",
  );
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyLintingFixes() {
  console.log("🔧 Applying Supabase Linting Fixes");
  console.log("=".repeat(50));

  try {
    // Read the SQL fix file
    const sqlPath = path.join(
      __dirname,
      "..",
      "fix-supabase-linting-errors.sql",
    );
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    console.log("📝 Executing SQL fix script...");

    // Split SQL into individual statements and execute them
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.toLowerCase().includes("select")) continue; // Skip SELECT statements

      try {
        const { error } = await adminClient.rpc("exec_sql", {
          sql: statement + ";",
        });

        if (error) {
          console.log(`⚠️  Statement ${i + 1}: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (e) {
        console.log(`❌ Statement ${i + 1}: ${e.message}`);
        errorCount++;
      }
    }

    console.log("\n📊 Results:");
    console.log(`✅ Successful operations: ${successCount}`);
    console.log(`⚠️  Warnings/Errors: ${errorCount}`);

    // Verify the fixes
    console.log("\n🔍 Verifying fixes...");
    try {
      const { data, error } = await adminClient.rpc("verify_linting_fixes");

      if (!error && data) {
        console.log("\n📋 Verification Results:");
        data.forEach((result) => {
          console.log(
            `${result.status} ${result.check_name}: ${result.details}`,
          );
        });
      }
    } catch (e) {
      console.log("⚠️  Could not run verification function");
    }

    console.log("\n🎉 Linting fixes application completed!");
    console.log(
      "🔍 Please run the Supabase database linter again to verify all issues are resolved.",
    );
    console.log("📍 Go to: Supabase Dashboard > Database > Database Linter");
  } catch (error) {
    console.error("❌ Failed to apply linting fixes:", error);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  applyLintingFixes();
}

module.exports = { applyLintingFixes };
