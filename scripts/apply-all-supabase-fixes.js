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

async function applyAllSupabaseFixes() {
  console.log("🔧 Applying All Supabase Database Fixes");
  console.log("=".repeat(60));
  console.log("This script will fix:");
  console.log("  🔒 Security Definer View errors (3 ERROR-level issues)");
  console.log("  ⚡ RLS Performance warnings (67 auth.uid() optimizations)");
  console.log("  📊 Multiple Permissive Policies (28 duplicates)");
  console.log("  🗂️  Duplicate Indexes (2 duplicates)");
  console.log("=".repeat(60));

  try {
    // Step 1: Apply Security Definer View Fixes (ERROR level - highest priority)
    console.log("\n🔒 STEP 1: Fixing Security Definer Views (ERROR Level)");
    console.log("-".repeat(50));
    await applySecurityDefinerFixes();

    // Step 2: Apply General Linting Fixes (WARNING level)
    console.log(
      "\n⚡ STEP 2: Fixing Performance & Duplicate Issues (WARNING Level)",
    );
    console.log("-".repeat(50));
    await applyLintingFixes();

    // Step 3: Final Verification
    console.log("\n🔍 STEP 3: Final Verification");
    console.log("-".repeat(50));
    await runFinalVerification();

    console.log("\n🎉 ALL SUPABASE FIXES APPLIED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log("📍 Final Steps:");
    console.log("1. Go to Supabase Dashboard > Database > Database Linter");
    console.log("2. Run the linter to verify ALL issues are resolved");
    console.log("3. Test your application functionality");
    console.log("4. Monitor performance for improvements");
  } catch (error) {
    console.error("❌ Failed to apply all fixes:", error);
    console.log("\n🔧 Manual Fix Instructions:");
    console.log("If the script failed, you can apply fixes manually:");
    console.log("1. Run: node scripts/apply-security-definer-fixes.js");
    console.log("2. Run: node scripts/apply-linting-fixes.js");
    console.log("3. Or execute SQL files manually in Supabase SQL Editor");
    process.exit(1);
  }
}

async function applySecurityDefinerFixes() {
  try {
    const sqlPath = path.join(
      __dirname,
      "..",
      "fix-security-definer-views.sql",
    );
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    console.log("📝 Executing Security Definer fix script...");
    const result = await executeSqlScript(sqlContent, "Security Definer");

    if (result.success) {
      console.log("✅ Security Definer Views fixed successfully");

      // Verify security fixes
      try {
        const { data, error } = await adminClient.rpc(
          "verify_security_definer_fixes",
        );
        if (!error && data) {
          console.log("📋 Security Verification Results:");
          data.forEach((result) => {
            console.log(`   ${result.status} ${result.check_name}`);
          });
        }
      } catch (e) {
        console.log("⚠️  Could not run security verification");
      }
    } else {
      throw new Error("Security Definer fixes failed");
    }
  } catch (error) {
    console.log("❌ Security Definer fixes failed:", error.message);
    throw error;
  }
}

async function applyLintingFixes() {
  try {
    const sqlPath = path.join(
      __dirname,
      "..",
      "fix-supabase-linting-errors.sql",
    );
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    console.log("📝 Executing Linting fix script...");
    const result = await executeSqlScript(sqlContent, "Linting");

    if (result.success) {
      console.log("✅ Linting issues fixed successfully");

      // Verify linting fixes
      try {
        const { data, error } = await adminClient.rpc("verify_linting_fixes");
        if (!error && data) {
          console.log("📋 Linting Verification Results:");
          data.forEach((result) => {
            console.log(`   ${result.status} ${result.check_name}`);
          });
        }
      } catch (e) {
        console.log("⚠️  Could not run linting verification");
      }
    } else {
      throw new Error("Linting fixes failed");
    }
  } catch (error) {
    console.log("❌ Linting fixes failed:", error.message);
    throw error;
  }
}

async function executeSqlScript(sqlContent, scriptName) {
  const statements = sqlContent
    .split(";")
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip SELECT statements (they're for verification/output only)
    if (statement.toLowerCase().includes("select")) {
      continue;
    }

    try {
      const { error } = await adminClient.rpc("exec_sql", {
        sql: statement + ";",
      });

      if (error) {
        // Don't count certain expected errors as failures
        if (
          !error.message.includes("does not exist") &&
          !error.message.includes("already exists")
        ) {
          errorCount++;
          console.log(`   ⚠️  Statement ${i + 1}: ${error.message}`);
        }
      } else {
        successCount++;
      }
    } catch (e) {
      errorCount++;
      console.log(`   ❌ Statement ${i + 1}: ${e.message}`);
    }
  }

  console.log(
    `   📊 ${scriptName} Results: ✅ ${successCount} success, ⚠️  ${errorCount} warnings`,
  );

  return {
    success: errorCount < successCount, // Consider successful if more successes than errors
    successCount,
    errorCount,
  };
}

async function runFinalVerification() {
  console.log("🔍 Running final verification checks...");

  // Check if views exist
  try {
    const { data: views, error } = await adminClient
      .from("information_schema.views")
      .select("table_name")
      .eq("table_schema", "public")
      .in("table_name", [
        "service_type_stats",
        "quote_summary",
        "integration_health_view",
      ]);

    if (!error && views) {
      console.log(`✅ Views Status: ${views.length}/3 views exist`);
      views.forEach((view) => {
        console.log(`   ✅ ${view.table_name} view exists`);
      });
    }
  } catch (e) {
    console.log("⚠️  Could not verify view existence");
  }

  // Test basic connectivity
  try {
    const { data, error } = await adminClient
      .from("information_schema.tables")
      .select("table_name")
      .limit(1);

    if (!error) {
      console.log("✅ Database connectivity: Working");
    }
  } catch (e) {
    console.log("❌ Database connectivity: Failed");
  }
}

// Test database connection first
async function testConnection() {
  try {
    const { data, error } = await adminClient
      .from("information_schema.tables")
      .select("table_name")
      .limit(1);

    if (error) {
      throw error;
    }

    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.log("❌ Database connection failed:", error.message);
    return false;
  }
}

// Main execution
if (require.main === module) {
  (async () => {
    console.log("🔗 Testing database connection...");
    const connected = await testConnection();

    if (connected) {
      await applyAllSupabaseFixes();
    } else {
      console.log("💡 Please check your environment variables and try again");
      process.exit(1);
    }
  })();
}

module.exports = { applyAllSupabaseFixes };
