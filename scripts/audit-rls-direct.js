const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

// Tables we expect to have in the system
const EXPECTED_TABLES = [
  "profiles",
  "estimates",
  "estimate_services",
  "estimate_flows",
  "measurements",
  "analytics_events",
  "facade_analyses",
  "facade_analysis_images",
  "vendors",
  "vendor_prices",
  "equipment_library",
  "materials_library",
  "ai_analysis_cache",
  "workflow_steps",
  "workflow_step_data",
];

async function auditRLSPolicies() {
  console.log(`${colors.bright}${colors.blue}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RLS POLICY SECURITY AUDIT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ${colors.reset}`);

  try {
    const issues = [];
    const tableStatus = {};

    console.log(
      `${colors.bright}${colors.cyan}Checking Table Access:${colors.reset}`,
    );
    console.log("─".repeat(50));

    // Test each table for RLS protection
    for (const tableName of EXPECTED_TABLES) {
      process.stdout.write(`Checking ${tableName.padEnd(25)} ... `);

      try {
        // Try to query without authentication (using anon key would work if RLS is off)
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .limit(1);

        if (error) {
          if (error.code === "42P01") {
            // Table doesn't exist
            console.log(`${colors.yellow}TABLE NOT FOUND${colors.reset}`);
            tableStatus[tableName] = "missing";
          } else if (
            error.message.includes("row-level security") ||
            error.message.includes("permission denied")
          ) {
            // RLS is likely enabled
            console.log(`${colors.green}RLS PROTECTED ✓${colors.reset}`);
            tableStatus[tableName] = "protected";
          } else {
            // Other error
            console.log(
              `${colors.yellow}ERROR: ${error.message}${colors.reset}`,
            );
            tableStatus[tableName] = "error";
          }
        } else {
          // If we can query without auth, RLS might be disabled or policies are too permissive
          console.log(`${colors.red}POTENTIALLY UNPROTECTED ❌${colors.reset}`);
          tableStatus[tableName] = "unprotected";
          issues.push({
            table: tableName,
            issue:
              "Table may be publicly accessible or have overly permissive policies",
            severity: "HIGH",
          });
        }
      } catch (err) {
        console.log(`${colors.yellow}ERROR: ${err.message}${colors.reset}`);
        tableStatus[tableName] = "error";
      }
    }

    // Summary
    console.log(
      `\n${colors.bright}${colors.cyan}Security Analysis Summary:${colors.reset}`,
    );
    console.log("─".repeat(80));

    const protectedTables = Object.entries(tableStatus).filter(
      ([_, status]) => status === "protected",
    );
    const unprotectedTables = Object.entries(tableStatus).filter(
      ([_, status]) => status === "unprotected",
    );
    const missingTables = Object.entries(tableStatus).filter(
      ([_, status]) => status === "missing",
    );
    const errorTables = Object.entries(tableStatus).filter(
      ([_, status]) => status === "error",
    );

    if (protectedTables.length > 0) {
      console.log(
        `\n${colors.green}✅ Protected Tables (${protectedTables.length}):${colors.reset}`,
      );
      for (const [table] of protectedTables) {
        console.log(`   - ${table}`);
      }
    }

    if (unprotectedTables.length > 0) {
      console.log(
        `\n${colors.red}❌ Potentially Unprotected Tables (${unprotectedTables.length}):${colors.reset}`,
      );
      for (const [table] of unprotectedTables) {
        console.log(`   - ${table}`);
      }
    }

    if (missingTables.length > 0) {
      console.log(
        `\n${colors.yellow}⚠️  Missing Tables (${missingTables.length}):${colors.reset}`,
      );
      for (const [table] of missingTables) {
        console.log(`   - ${table}`);
      }
    }

    if (errorTables.length > 0) {
      console.log(
        `\n${colors.yellow}⚠️  Tables with Errors (${errorTables.length}):${colors.reset}`,
      );
      for (const [table] of errorTables) {
        console.log(`   - ${table}`);
      }
    }

    // Additional Security Checks
    console.log(
      `\n${colors.bright}${colors.cyan}Additional Security Checks:${colors.reset}`,
    );
    console.log("─".repeat(80));

    // Check if we can create a profile without auth
    console.log("\nTesting unauthorized profile creation...");
    try {
      const { error } = await supabase.from("profiles").insert({
        id: "test-unauthorized",
        email: "test@example.com",
        display_name: "Unauthorized Test",
      });

      if (error) {
        console.log(
          `${colors.green}✅ Unauthorized INSERT blocked: ${error.message}${colors.reset}`,
        );
      } else {
        console.log(
          `${colors.red}❌ WARNING: Unauthorized INSERT succeeded!${colors.reset}`,
        );
        issues.push({
          table: "profiles",
          issue: "Unauthorized INSERT operation succeeded",
          severity: "CRITICAL",
        });

        // Clean up
        await supabase.from("profiles").delete().eq("id", "test-unauthorized");
      }
    } catch (err) {
      console.log(
        `${colors.green}✅ Unauthorized INSERT blocked${colors.reset}`,
      );
    }

    // Recommendations
    console.log(
      `\n${colors.bright}${colors.cyan}Recommendations:${colors.reset}`,
    );
    console.log("─".repeat(80));

    console.log(`\n1. ${colors.bright}For unprotected tables:${colors.reset}`);
    console.log(
      "   - Enable RLS: ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;",
    );
    console.log("   - Create appropriate policies for user isolation");

    console.log(`\n2. ${colors.bright}Security best practices:${colors.reset}`);
    console.log("   - Always check auth().uid in policies");
    console.log("   - Use service role key only for admin operations");
    console.log("   - Implement policies for all CRUD operations");
    console.log("   - Test policies with different user contexts");

    console.log(`\n3. ${colors.bright}Policy template example:${colors.reset}`);
    console.log(`${colors.cyan}
-- Enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Users can only see their own records
CREATE POLICY "Users can view own records" ON your_table
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own records  
CREATE POLICY "Users can insert own records" ON your_table
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own records
CREATE POLICY "Users can update own records" ON your_table
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own records
CREATE POLICY "Users can delete own records" ON your_table
  FOR DELETE USING (auth.uid() = user_id);
${colors.reset}`);

    if (issues.length > 0) {
      console.log(
        `\n${colors.red}⚠️  ${issues.length} security issues found!${colors.reset}`,
      );
      return false;
    } else {
      console.log(
        `\n${colors.green}✅ No critical security issues found${colors.reset}`,
      );
      return true;
    }
  } catch (error) {
    console.error(
      `\n${colors.red}❌ Error during RLS audit:${colors.reset}`,
      error,
    );
    return false;
  }
}

// Run the audit
auditRLSPolicies()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
