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

async function auditRLSPolicies() {
  console.log(`${colors.bright}${colors.blue}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RLS POLICY SECURITY AUDIT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ${colors.reset}`);

  try {
    // Get all tables with RLS enabled/disabled status
    const { data: tables, error: tablesError } = await supabase.rpc(
      "exec_sql",
      {
        query: `
          SELECT 
            schemaname,
            tablename,
            rowsecurity,
            CASE 
              WHEN rowsecurity THEN 'ENABLED ✓'
              ELSE 'DISABLED ❌'
            END as rls_status
          FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename;
        `,
      },
    );

    if (tablesError) throw tablesError;

    console.log(
      `${colors.bright}${colors.cyan}Tables RLS Status:${colors.reset}`,
    );
    console.log("─".repeat(50));

    const tablesWithoutRLS = [];

    for (const table of tables) {
      const statusColor = table.rowsecurity ? colors.green : colors.red;
      console.log(
        `${statusColor}${table.tablename.padEnd(30)} ${table.rls_status}${colors.reset}`,
      );

      if (!table.rowsecurity) {
        tablesWithoutRLS.push(table.tablename);
      }
    }

    console.log("\n");

    // Get all RLS policies
    const { data: policies, error: policiesError } = await supabase.rpc(
      "exec_sql",
      {
        query: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies
          WHERE schemaname = 'public'
          ORDER BY tablename, policyname;
        `,
      },
    );

    if (policiesError) throw policiesError;

    console.log(
      `${colors.bright}${colors.cyan}RLS Policies by Table:${colors.reset}`,
    );
    console.log("─".repeat(80));

    // Group policies by table
    const policiesByTable = {};
    for (const policy of policies) {
      if (!policiesByTable[policy.tablename]) {
        policiesByTable[policy.tablename] = [];
      }
      policiesByTable[policy.tablename].push(policy);
    }

    // Analyze each table's policies
    const issues = [];

    for (const [tableName, tablePolicies] of Object.entries(policiesByTable)) {
      console.log(`\n${colors.bright}📋 ${tableName}${colors.reset}`);

      const commands = new Set();
      let hasPublicPolicy = false;

      for (const policy of tablePolicies) {
        commands.add(policy.cmd);

        // Check for overly permissive policies
        if (policy.qual === "true" || policy.with_check === "true") {
          hasPublicPolicy = true;
          issues.push({
            table: tableName,
            policy: policy.policyname,
            issue:
              "Policy allows unrestricted access (qual or with_check = true)",
            severity: "HIGH",
          });
        }

        console.log(
          `  ${colors.yellow}Policy:${colors.reset} ${policy.policyname}`,
        );
        console.log(`    - Command: ${policy.cmd}`);
        console.log(`    - Roles: ${policy.roles}`);
        console.log(`    - Permissive: ${policy.permissive}`);

        if (policy.qual && policy.qual !== "true") {
          console.log(
            `    - Qual: ${policy.qual.substring(0, 100)}${policy.qual.length > 100 ? "..." : ""}`,
          );
        }

        if (
          policy.with_check &&
          policy.with_check !== "true" &&
          policy.with_check !== policy.qual
        ) {
          console.log(
            `    - With Check: ${policy.with_check.substring(0, 100)}${policy.with_check.length > 100 ? "..." : ""}`,
          );
        }
      }

      // Check for missing CRUD operations
      const expectedCommands = ["SELECT", "INSERT", "UPDATE", "DELETE"];
      const missingCommands = expectedCommands.filter(
        (cmd) => !commands.has(cmd),
      );

      if (missingCommands.length > 0) {
        console.log(
          `  ${colors.yellow}⚠️  Missing policies for: ${missingCommands.join(", ")}${colors.reset}`,
        );
      }
    }

    // Security Analysis Summary
    console.log(
      `\n${colors.bright}${colors.cyan}Security Analysis Summary:${colors.reset}`,
    );
    console.log("─".repeat(80));

    if (tablesWithoutRLS.length > 0) {
      console.log(
        `\n${colors.red}❌ Tables WITHOUT RLS (High Risk):${colors.reset}`,
      );
      for (const table of tablesWithoutRLS) {
        console.log(`   - ${table}`);
        issues.push({
          table,
          issue: "RLS is DISABLED - table is publicly accessible",
          severity: "CRITICAL",
        });
      }
    }

    if (issues.length > 0) {
      console.log(`\n${colors.red}🚨 Security Issues Found:${colors.reset}`);

      const criticalIssues = issues.filter((i) => i.severity === "CRITICAL");
      const highIssues = issues.filter((i) => i.severity === "HIGH");

      if (criticalIssues.length > 0) {
        console.log(
          `\n${colors.bright}${colors.red}CRITICAL Issues:${colors.reset}`,
        );
        for (const issue of criticalIssues) {
          console.log(`   - ${issue.table}: ${issue.issue}`);
        }
      }

      if (highIssues.length > 0) {
        console.log(
          `\n${colors.bright}${colors.yellow}HIGH Issues:${colors.reset}`,
        );
        for (const issue of highIssues) {
          console.log(`   - ${issue.table}.${issue.policy}: ${issue.issue}`);
        }
      }
    } else {
      console.log(
        `\n${colors.green}✅ No critical security issues found in RLS policies${colors.reset}`,
      );
    }

    // Recommendations
    console.log(
      `\n${colors.bright}${colors.cyan}Recommendations:${colors.reset}`,
    );
    console.log("─".repeat(80));

    if (tablesWithoutRLS.length > 0) {
      console.log(
        `\n1. ${colors.bright}Enable RLS on all tables:${colors.reset}`,
      );
      console.log("   Run the following SQL for each table without RLS:");
      for (const table of tablesWithoutRLS) {
        console.log(
          `   ${colors.cyan}ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;${colors.reset}`,
        );
      }
    }

    console.log(
      `\n2. ${colors.bright}Review all policies for proper user isolation:${colors.reset}`,
    );
    console.log("   - Ensure policies check user_id or organization_id");
    console.log('   - Avoid "true" conditions in qual or with_check');
    console.log("   - Use service role only for admin operations");

    console.log(
      `\n3. ${colors.bright}Implement comprehensive policies:${colors.reset}`,
    );
    console.log(
      "   - Cover all CRUD operations (SELECT, INSERT, UPDATE, DELETE)",
    );
    console.log("   - Use WITH CHECK for INSERT/UPDATE operations");
    console.log("   - Test policies with different user roles");
  } catch (error) {
    console.error(
      `\n${colors.red}❌ Error during RLS audit:${colors.reset}`,
      error,
    );
    process.exit(1);
  }
}

// Run the audit
auditRLSPolicies()
  .then(() => {
    console.log(`\n${colors.green}✅ RLS audit completed${colors.reset}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
