#!/usr/bin/env node

/**
 * Get Real Database Schema Script
 *
 * This script queries the actual Supabase database to get the real table schemas
 * for all tables referenced in the security lints fix.
 */

const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTableSchema(tableName) {
  try {
    console.log(`\n🔍 Checking table: ${tableName}`);

    // Try to query the table directly to see if it exists
    const { data, error } = await supabase.from(tableName).select("*").limit(0);

    if (error) {
      if (
        error.message.includes("does not exist") ||
        (error.message.includes("relation") &&
          error.message.includes("does not exist"))
      ) {
        console.log(`❌ Table ${tableName} does NOT exist`);
        return null;
      } else {
        console.error(`❌ Error checking ${tableName}:`, error.message);
        return null;
      }
    }

    console.log(`✅ Table ${tableName} exists`);

    // Try to get a sample record to see column structure
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select("*")
      .limit(1);

    if (sampleError) {
      console.error(
        `❌ Error getting sample from ${tableName}:`,
        sampleError.message,
      );
      return [];
    }

    if (sampleData && sampleData.length > 0) {
      const columns = Object.keys(sampleData[0]);
      console.log(`📋 Columns in ${tableName}:`, columns.join(", "));
      return columns;
    } else {
      // Table exists but is empty, try to insert and get error to see expected columns
      const { error: insertError } = await supabase
        .from(tableName)
        .insert([{}]);

      if (insertError && insertError.message) {
        // Extract column names from error message if possible
        console.log(
          `📋 Table ${tableName} exists but is empty (could not determine columns)`,
        );
        return [];
      }
    }

    return [];
  } catch (error) {
    console.error(`❌ Error querying ${tableName}:`, error.message);
    return null;
  }
}

async function checkViewExists(viewName) {
  try {
    console.log(`\n👁️  Checking view: ${viewName}`);

    // Try to query the view directly
    const { data, error } = await supabase.from(viewName).select("*").limit(0);

    if (error) {
      if (
        error.message.includes("does not exist") ||
        (error.message.includes("relation") &&
          error.message.includes("does not exist"))
      ) {
        console.log(`❌ View ${viewName} does NOT exist`);
        return false;
      } else {
        console.error(`❌ Error checking ${viewName}:`, error.message);
        return false;
      }
    }

    console.log(`✅ View ${viewName} exists`);
    return true;
  } catch (error) {
    console.error(`❌ Error checking view ${viewName}:`, error.message);
    return false;
  }
}

// We'll skip the exec_sql function since it's not available

async function getRealSchema() {
  console.log("🔍 Getting Real Database Schema...\n");

  // Tables referenced in the security lints fix
  const tablesToCheck = [
    "estimates",
    "estimate_services",
    "integrations",
    "integration_health",
    "estimation_flows_backup",
    "performance_logs",
    "performance_alerts",
    "cache_performance",
    "query_performance",
    "system_resources",
    "performance_config",
    "profiles",
  ];

  // Views referenced in the security lints fix
  const viewsToCheck = [
    "service_type_stats",
    "quote_summary",
    "integration_health_view",
  ];

  const schemaInfo = {};

  // Check all tables
  for (const table of tablesToCheck) {
    const columns = await getTableSchema(table);
    schemaInfo[table] = columns;
  }

  // Check all views
  for (const view of viewsToCheck) {
    const exists = await checkViewExists(view);
    schemaInfo[`${view}_view_exists`] = exists;
  }

  // Summary for fixing the SQL
  console.log("\n📊 SCHEMA SUMMARY FOR SQL FIX:");
  console.log("=====================================");

  // Check estimates table columns needed by quote_summary view
  if (schemaInfo.estimates) {
    const estimatesColumns = schemaInfo.estimates;
    const neededForQuoteSummary = [
      "customer_phone",
      "customer_address",
      "expires_at",
      "accepted_at",
      "rejected_at",
      "payment_terms",
      "notes",
    ];

    console.log("\n📋 ESTIMATES table analysis:");
    console.log("Columns that exist:", estimatesColumns.join(", "));
    console.log("\nColumns needed by quote_summary view:");
    neededForQuoteSummary.forEach((col) => {
      const exists = estimatesColumns.includes(col);
      console.log(`   ${exists ? "✅" : "❌"} ${col}`);
    });
  }

  // Check estimate_services table
  if (schemaInfo.estimate_services) {
    console.log(
      "\n📋 ESTIMATE_SERVICES table exists with columns:",
      schemaInfo.estimate_services.join(", "),
    );
  } else {
    console.log("\n❌ ESTIMATE_SERVICES table does NOT exist");
  }

  // Check integrations table columns needed by integration_health_view
  if (schemaInfo.integrations) {
    const integrationsColumns = schemaInfo.integrations;
    const neededForHealthView = [
      "integration_type",
      "status",
      "is_active",
      "last_sync_at",
      "error_count",
      "sync_frequency",
    ];

    console.log("\n📋 INTEGRATIONS table analysis:");
    console.log("Columns that exist:", integrationsColumns.join(", "));
    console.log("\nColumns needed by integration_health_view:");
    neededForHealthView.forEach((col) => {
      const exists = integrationsColumns.includes(col);
      console.log(`   ${exists ? "✅" : "❌"} ${col}`);
    });
  }

  // Check performance tables user_id columns
  console.log("\n📋 PERFORMANCE TABLES user_id column check:");
  const performanceTables = [
    "performance_logs",
    "performance_alerts",
    "cache_performance",
    "query_performance",
    "system_resources",
    "performance_config",
  ];

  performanceTables.forEach((table) => {
    if (schemaInfo[table]) {
      const hasUserId = schemaInfo[table].includes("user_id");
      console.log(
        `   ${hasUserId ? "✅" : "❌"} ${table} ${hasUserId ? "has" : "does NOT have"} user_id column`,
      );
    } else {
      console.log(`   ❌ ${table} does NOT exist`);
    }
  });

  console.log(
    "\n🔧 Use this information to fix the 19-fix-security-lints.sql file",
  );
}

// Run schema check
getRealSchema().catch(console.error);
