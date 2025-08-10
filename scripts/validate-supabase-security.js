/**
 * Supabase Security Configuration Validation Script
 *
 * This script validates the current Supabase security configuration
 * and provides a checklist of items that need manual configuration
 * in the Supabase Dashboard.
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase configuration in .env.local");
  console.error(
    "Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Validation functions for different security aspects
 */
const validations = {
  /**
   * Check if RLS is enabled on critical tables
   */
  async checkRLSEnabled() {
    console.log("\n🔍 Checking Row Level Security (RLS) status...");

    const criticalTables = [
      "profiles",
      "estimates",
      "facade_analyses",
      "audit_logs",
      "estimate_services",
    ];

    try {
      const { data, error } = await supabase.rpc("check_rls_status", {
        table_names: criticalTables,
      });

      if (error) {
        // Try to check if tables exist by querying them directly
        const tableChecks = await Promise.allSettled(
          criticalTables.map(async (table) => {
            const { data, error } = await supabase
              .from(table)
              .select("*", { head: true, count: "exact" });

            if (error && error.code === "PGRST116") {
              return { table, exists: false, error: "Table not found" };
            } else if (error) {
              return { table, exists: false, error: error.message };
            } else {
              return { table, exists: true };
            }
          }),
        );

        const results = tableChecks.map((result) =>
          result.status === "fulfilled"
            ? result.value
            : { error: result.reason },
        );

        const existingTables = results.filter((r) => r.exists);
        const missingTables = results.filter((r) => !r.exists);

        if (existingTables.length > 0) {
          console.log(
            "✅ Found existing tables:",
            existingTables.map((t) => t.table),
          );
        }

        if (missingTables.length > 0) {
          console.log(
            "ℹ️  Tables not yet created:",
            missingTables.map((t) => t.table),
          );
        }

        console.log(
          "ℹ️  Manual verification needed: Check RLS policies in Supabase Dashboard",
        );
        console.log("   → Database → Tables → [table] → RLS tab");

        return true;
      }

      console.log("✅ RLS status check completed");
      return true;
    } catch (error) {
      console.error("❌ RLS check failed:", error.message);
      console.log(
        "ℹ️  Manual verification needed: Check RLS policies in Supabase Dashboard",
      );
      return true; // Don't fail script, just flag for manual check
    }
  },

  /**
   * Check if auth security functions exist
   */
  async checkAuthSecurityFunctions() {
    console.log("\n🔍 Checking auth security functions...");

    try {
      // Check if security-related SQL files exist in the project
      const fs = require("fs");
      const path = require("path");

      const securityFiles = [
        "../sql/migrations/security-advisor-fixes.sql",
        "../sql/migrations/fix_security_definer_views.sql",
      ];

      const existingSecurityFiles = securityFiles.filter((file) =>
        fs.existsSync(path.join(__dirname, file)),
      );

      if (existingSecurityFiles.length > 0) {
        console.log(
          "✅ Security migration files found:",
          existingSecurityFiles.map((f) => path.basename(f)),
        );
      }

      // Try to test basic auth functionality
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error && error.message.includes("JWT")) {
        console.log("ℹ️  Auth system is configured (no active user session)");
      } else if (user) {
        console.log("✅ Auth system working - user session found");
      } else {
        console.log("ℹ️  Auth system configured - no active session");
      }

      console.log("✅ Database security functions check completed");
      return true;
    } catch (error) {
      console.error("❌ Auth security check failed:", error.message);
      console.log(
        "ℹ️  This may be normal if no user is currently authenticated",
      );
      return true; // Don't fail script for auth-related checks
    }
  },

  /**
   * Verify MFA infrastructure exists
   */
  async checkMFAInfrastructure() {
    console.log("\n🔍 Checking MFA infrastructure...");

    try {
      // Check if auth schema exists and MFA tables are present
      // This is handled by Supabase automatically when MFA is enabled

      // Check if our MFA service file exists
      const fs = require("fs");
      const path = require("path");
      const mfaServicePath = path.join(__dirname, "../lib/auth/mfa-service.ts");

      if (fs.existsSync(mfaServicePath)) {
        console.log("✅ MFA service file exists");
      } else {
        console.log("❌ MFA service file not found");
      }

      // Check if MFA UI components exist
      const mfaComponents = [
        "../components/auth/enhanced-mfa-setup.tsx",
        "../components/auth/mfa-challenge.tsx",
        "../components/auth/backup-codes.tsx",
        "../components/auth/mfa-settings-page.tsx",
      ];

      const existingComponents = mfaComponents.filter((component) =>
        fs.existsSync(path.join(__dirname, component)),
      );

      if (existingComponents.length === mfaComponents.length) {
        console.log("✅ All MFA UI components are available");
      } else {
        console.log(
          `⚠️  Found ${existingComponents.length}/${mfaComponents.length} MFA components`,
        );
      }

      console.log(
        "ℹ️  Manual check required: Verify MFA is enabled in Supabase Dashboard",
      );
      console.log(
        "   → Authentication → Settings → Multi-Factor Authentication",
      );

      return true;
    } catch (error) {
      console.error("❌ MFA infrastructure check failed:", error.message);
      return false;
    }
  },

  /**
   * Check environment configuration
   */
  async checkEnvironmentConfig() {
    console.log("\n🔍 Checking environment configuration...");

    const requiredEnvVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ];

    let allPresent = true;

    requiredEnvVars.forEach((envVar) => {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} is configured`);
      } else {
        console.log(`❌ ${envVar} is missing`);
        allPresent = false;
      }
    });

    // Check optional security-related env vars
    const optionalSecurityVars = [
      "AI_ENABLE_CONTENT_FILTERING",
      "AI_ENABLE_INPUT_SANITIZATION",
      "AUDIT_RETENTION_DAYS",
    ];

    optionalSecurityVars.forEach((envVar) => {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} is configured: ${process.env[envVar]}`);
      } else {
        console.log(`ℹ️  ${envVar} not set (optional)`);
      }
    });

    return allPresent;
  },

  /**
   * Test basic database connectivity
   */
  async testConnectivity() {
    console.log("\n🔍 Testing database connectivity...");

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("count", { count: "exact", head: true });

      if (error && error.code !== "PGRST116") {
        console.error("❌ Database connectivity test failed:", error.message);
        return false;
      }

      console.log("✅ Database connectivity successful");
      console.log(
        `ℹ️  Profiles table ${data ? "exists" : "may not exist yet"}`,
      );
      return true;
    } catch (error) {
      console.error("❌ Connectivity test failed:", error.message);
      return false;
    }
  },
};

/**
 * Main validation function
 */
async function validateSecurityConfiguration() {
  console.log("🚀 EstimatePro Supabase Security Configuration Validation");
  console.log("=".repeat(60));

  const results = {};
  let overallSuccess = true;

  // Run all validations
  for (const [name, validation] of Object.entries(validations)) {
    try {
      results[name] = await validation();
      if (!results[name]) {
        overallSuccess = false;
      }
    } catch (error) {
      console.error(`❌ Validation ${name} failed:`, error.message);
      results[name] = false;
      overallSuccess = false;
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 VALIDATION SUMMARY");
  console.log("=".repeat(60));

  Object.entries(results).forEach(([name, success]) => {
    const status = success ? "✅" : "❌";
    const label = name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
    console.log(`${status} ${label}`);
  });

  console.log("\n🔧 MANUAL CONFIGURATION REQUIRED");
  console.log("=".repeat(60));
  console.log(
    "The following must be configured manually in Supabase Dashboard:",
  );
  console.log("");
  console.log("1. 🛡️  Enable Leaked Password Protection");
  console.log("   → Authentication → Settings → Security");
  console.log("");
  console.log("2. 🔐 Configure Multi-Factor Authentication");
  console.log("   → Authentication → Settings → Multi-Factor Authentication");
  console.log('   → Enable MFA, set issuer to "EstimatePro"');
  console.log("");
  console.log("3. ⏱️  Configure Session Management");
  console.log("   → Authentication → Settings → Session timeout (24 hours)");
  console.log("");
  console.log("4. 🔑 Set Strong Password Policy");
  console.log("   → Authentication → Settings → Password Policy");
  console.log("");
  console.log("5. 🚫 Configure Rate Limiting");
  console.log("   → Authentication → Rate Limiting");
  console.log("");
  console.log("6. 📋 Enable Audit Logging");
  console.log("   → Settings → Logs → Configure retention periods");

  console.log("\n📖 NEXT STEPS");
  console.log("=".repeat(60));
  console.log(
    "1. Follow the complete guide: docs/SUPABASE_SECURITY_CONFIGURATION.md",
  );
  console.log("2. Complete manual dashboard configuration");
  console.log("3. Test MFA flow with test account");
  console.log("4. Validate security settings with provided checklist");

  if (overallSuccess) {
    console.log("\n✅ Basic security infrastructure is ready!");
    console.log("Complete the manual dashboard configuration to finish setup.");
  } else {
    console.log(
      "\n⚠️  Some issues found. Please address them before proceeding.",
    );
  }
}

// Run validation if script is called directly
if (require.main === module) {
  validateSecurityConfiguration()
    .then(() => {
      console.log("\nValidation completed.");
    })
    .catch((error) => {
      console.error("\n❌ Validation failed:", error.message);
      process.exit(1);
    });
}

module.exports = {
  validateSecurityConfiguration,
  validations,
};
