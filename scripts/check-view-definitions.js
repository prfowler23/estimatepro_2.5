#!/usr/bin/env node

/**
 * Check View Definitions Script
 *
 * This script checks the current definitions of the 3 problematic views
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

async function checkViewDefinition(viewName) {
  console.log(`\n🔍 Checking view: ${viewName}`);

  try {
    // Try to query the view to see if it works
    const { data, error } = await supabase.from(viewName).select("*").limit(0);

    if (error) {
      console.error(`❌ View ${viewName} has errors:`, error.message);

      // Check if it's a column error that would tell us about the current definition
      if (
        error.message.includes("column") &&
        error.message.includes("does not exist")
      ) {
        const match = error.message.match(/column "([^"]+)" does not exist/);
        if (match) {
          console.log(`   🔍 Issue: Column "${match[1]}" does not exist`);
          console.log(`   💡 This means the view still has the old definition`);
        }
      }
      return false;
    } else {
      console.log(`✅ View ${viewName} works correctly`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error checking ${viewName}:`, error.message);
    return false;
  }
}

async function testViewsNeedMigration() {
  console.log("🔍 Checking if views need migration...\n");

  const views = [
    "service_type_stats",
    "quote_summary",
    "integration_health_view",
  ];
  const results = {};

  for (const view of views) {
    results[view] = await checkViewDefinition(view);
  }

  console.log("\n📊 MIGRATION STATUS:");
  console.log("=====================================");

  let needsMigration = false;

  views.forEach((view) => {
    if (results[view]) {
      console.log(
        `✅ ${view}: Already working (might still need SECURITY fix)`,
      );
    } else {
      console.log(`❌ ${view}: Needs migration (has errors)`);
      needsMigration = true;
    }
  });

  if (needsMigration) {
    console.log("\n💡 RECOMMENDATION:");
    console.log("Run the migration to fix the broken views:");
    console.log("   node scripts/run-migration.js 19-fix-security-lints.sql");
  } else {
    console.log("\n💡 RECOMMENDATION:");
    console.log(
      "Views work but still have SECURITY DEFINER. Run migration to fix security:",
    );
    console.log("   node scripts/run-migration.js 19-fix-security-lints.sql");
  }

  console.log(
    "\n🔍 The SECURITY DEFINER issue will be resolved when the migration runs",
  );
  console.log(
    "because our migration DROP and CREATE the views without SECURITY DEFINER.",
  );
}

testViewsNeedMigration().catch(console.error);
