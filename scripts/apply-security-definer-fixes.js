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

async function applySecurityDefinerFixes() {
  console.log("🔒 Applying Security Definer View Fixes");
  console.log("=".repeat(50));

  try {
    // Read the SQL fix file
    const sqlPath = path.join(
      __dirname,
      "..",
      "fix-security-definer-views.sql",
    );
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    console.log("📝 Executing Security Definer fix script...");

    // Split SQL into individual statements and execute them
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    let successCount = 0;
    let errorCount = 0;

    console.log("🚀 Processing SQL statements...");

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip SELECT statements (they're for verification/output only)
      if (statement.toLowerCase().includes("select")) {
        console.log(`⏭️  Skipping SELECT statement ${i + 1}`);
        continue;
      }

      try {
        const { error } = await adminClient.rpc("exec_sql", {
          sql: statement + ";",
        });

        if (error) {
          console.log(`⚠️  Statement ${i + 1}: ${error.message}`);
          // Don't count certain expected errors as failures
          if (
            !error.message.includes("does not exist") &&
            !error.message.includes("already exists")
          ) {
            errorCount++;
          }
        } else {
          successCount++;
          console.log(`✅ Statement ${i + 1}: Success`);
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
    console.log("\n🔍 Verifying Security Definer fixes...");
    try {
      const { data, error } = await adminClient.rpc(
        "verify_security_definer_fixes",
      );

      if (!error && data) {
        console.log("\n📋 Verification Results:");
        data.forEach((result) => {
          console.log(
            `${result.status} ${result.check_name}: ${result.details}`,
          );
        });

        // Check if all fixes were successful
        const allFixed = data.every(
          (result) =>
            result.status.includes("✅") || result.status.includes("FIXED"),
        );

        if (allFixed) {
          console.log(
            "\n🎉 All Security Definer View fixes applied successfully!",
          );
        } else {
          console.log("\n⚠️  Some fixes may need manual attention");
        }
      }
    } catch (e) {
      console.log("⚠️  Could not run verification function");
      console.log(
        "💡 You can run verification manually in Supabase SQL Editor:",
      );
      console.log("   SELECT * FROM public.verify_security_definer_fixes();");
    }

    console.log("\n📍 Next Steps:");
    console.log("1. Go to Supabase Dashboard > Database > Database Linter");
    console.log(
      "2. Run the linter to verify Security Definer View errors are resolved",
    );
    console.log(
      "3. Test your application to ensure views still work correctly",
    );
  } catch (error) {
    console.error("❌ Failed to apply Security Definer fixes:", error);

    // Fallback: provide manual instructions
    console.log("\n🔧 Manual Fix Instructions:");
    console.log("If the script failed, you can apply the fixes manually:");
    console.log("1. Open Supabase Dashboard > Database > SQL Editor");
    console.log("2. Copy the contents of 'fix-security-definer-views.sql'");
    console.log("3. Paste and execute the script");

    process.exit(1);
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
      await applySecurityDefinerFixes();
    } else {
      console.log("💡 Please check your environment variables and try again");
      process.exit(1);
    }
  })();
}

module.exports = { applySecurityDefinerFixes };
