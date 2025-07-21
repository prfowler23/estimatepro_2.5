#!/usr/bin/env node

/**
 * Analyze Views Script
 *
 * This script queries the existing views to understand their structure
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

async function analyzeView(viewName) {
  console.log(`\n🔍 Analyzing view: ${viewName}`);

  try {
    const { data, error } = await supabase.from(viewName).select("*").limit(1);

    if (error) {
      console.error(`❌ Error querying ${viewName}:`, error.message);
      // The error message might give us clues about what columns are expected
      if (
        error.message.includes("column") &&
        error.message.includes("does not exist")
      ) {
        const match = error.message.match(/column "([^"]+)" does not exist/);
        if (match) {
          console.log(`   Missing column: ${match[1]}`);
        }
      }
      return null;
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`✅ ${viewName} columns:`, columns.join(", "));
      return columns;
    } else {
      console.log(`✅ ${viewName} exists but has no data`);
      return [];
    }
  } catch (error) {
    console.error(`❌ Error analyzing ${viewName}:`, error.message);
    return null;
  }
}

async function analyzeViews() {
  console.log("🔍 Analyzing Existing Views...\n");

  // Analyze existing views that we know exist
  await analyzeView("service_type_stats");
  await analyzeView("quote_summary");
  await analyzeView("integration_health_view");

  console.log("\n📊 ANALYSIS RESULTS:");
  console.log("=====================================");
  console.log("The existing views tell us what columns currently work.");
  console.log(
    "Any errors show us what columns are missing or incorrectly named.",
  );
}

analyzeViews().catch(console.error);
