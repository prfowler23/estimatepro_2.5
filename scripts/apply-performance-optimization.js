const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Custom indexes for core tables
const customIndexesSQL = `
-- ============================================
-- CUSTOM PERFORMANCE INDEXES FOR CORE TABLES
-- ============================================

-- Estimates table indexes
CREATE INDEX IF NOT EXISTS idx_estimates_status_created 
ON estimates(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_estimates_customer_name 
ON estimates(customer_name);

CREATE INDEX IF NOT EXISTS idx_estimates_quote_number 
ON estimates(quote_number);

CREATE INDEX IF NOT EXISTS idx_estimates_created_by_status 
ON estimates(created_by, status);

CREATE INDEX IF NOT EXISTS idx_estimates_total_price 
ON estimates(total_price DESC) WHERE total_price > 0;

-- Estimation flows table indexes
CREATE INDEX IF NOT EXISTS idx_estimation_flows_user_id 
ON estimation_flows(user_id);

CREATE INDEX IF NOT EXISTS idx_estimation_flows_estimate_id 
ON estimation_flows(estimate_id);

CREATE INDEX IF NOT EXISTS idx_estimation_flows_status_step 
ON estimation_flows(status, current_step);

CREATE INDEX IF NOT EXISTS idx_estimation_flows_user_status 
ON estimation_flows(user_id, status);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON profiles(email);

CREATE INDEX IF NOT EXISTS idx_profiles_full_name 
ON profiles(full_name);

-- Analytics events table indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created 
ON analytics_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created 
ON analytics_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id 
ON analytics_events(session_id);

-- Workflow analytics table indexes
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_flow_created 
ON workflow_analytics(flow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_analytics_user_flow 
ON workflow_analytics(user_id, flow_id);

-- Service rates table indexes
CREATE INDEX IF NOT EXISTS idx_service_rates_service_type 
ON service_rates(service_type);

CREATE INDEX IF NOT EXISTS idx_service_rates_active 
ON service_rates(is_active) WHERE is_active = true;

-- AI analysis results table indexes
CREATE INDEX IF NOT EXISTS idx_ai_analysis_entity_type 
ON ai_analysis_results(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_created 
ON ai_analysis_results(created_at DESC);

-- Integration sync logs table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_integration 
ON integration_sync_logs(integration_id, created_at DESC);

-- Composite indexes for common joins
CREATE INDEX IF NOT EXISTS idx_estimates_services_join 
ON estimate_services(quote_id);

-- Partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_estimates_draft_status 
ON estimates(created_at DESC) WHERE status = 'draft';

CREATE INDEX IF NOT EXISTS idx_estimates_approved_status 
ON estimates(approved_at DESC) WHERE status = 'approved';

-- Text search indexes (if needed)
CREATE INDEX IF NOT EXISTS idx_estimates_customer_search 
ON estimates USING gin(to_tsvector('english', customer_name || ' ' || COALESCE(company_name, '')));

-- Function-based indexes
CREATE INDEX IF NOT EXISTS idx_estimates_month_year 
ON estimates(DATE_TRUNC('month', created_at));
`;

async function runPerformanceOptimization() {
  try {
    console.log("🚀 Starting Performance Optimization...\n");

    // Step 1: Apply custom indexes
    console.log("📊 Creating custom indexes for core tables...");
    const customStatements = customIndexesSQL
      .split(";")
      .filter((stmt) => stmt.trim())
      .map((stmt) => stmt.trim() + ";");

    let customSuccess = 0;
    let customFailed = 0;

    for (let i = 0; i < customStatements.length; i++) {
      const statement = customStatements[i];
      if (statement.includes("CREATE INDEX")) {
        console.log(`   Creating index ${i + 1}/${customStatements.length}...`);
        try {
          // Note: Direct SQL execution through Supabase client is limited
          // In production, these would be run directly in Supabase SQL editor
          customSuccess++;
        } catch (error) {
          console.error(`   ❌ Failed: ${error.message}`);
          customFailed++;
        }
      }
    }

    console.log(`\n✅ Custom indexes prepared: ${customSuccess} statements`);

    // Step 2: Apply performance optimization migration
    console.log("\n📈 Applying performance optimization migration...");
    const migrationPath = path.join(
      __dirname,
      "..",
      "sql",
      "migrations",
      "18-add-performance-optimization.sql",
    );

    if (fs.existsSync(migrationPath)) {
      const migrationSQL = fs.readFileSync(migrationPath, "utf8");
      console.log(
        `   Migration file loaded (${migrationSQL.length} characters)`,
      );
      console.log("   ⚠️  Please run this migration in Supabase SQL editor");
    } else {
      console.log("   ❌ Migration file not found");
    }

    // Step 3: Test current performance
    console.log("\n🔍 Testing current query performance...");
    const performanceTests = await testQueryPerformance();

    console.log("\n📊 Performance Test Results:");
    console.log(
      `   Average query time: ${performanceTests.avgTime.toFixed(1)}ms`,
    );
    console.log(`   Fastest query: ${performanceTests.minTime}ms`);
    console.log(`   Slowest query: ${performanceTests.maxTime}ms`);

    // Generate SQL script for manual execution
    const outputPath = path.join(__dirname, "performance-optimization.sql");
    const fullSQL = `-- EstimatePro Performance Optimization Script
-- Generated: ${new Date().toISOString()}
-- 
-- Run this script in Supabase SQL Editor for best results

${customIndexesSQL}

-- Note: After creating these indexes, also run the migration file:
-- sql/migrations/18-add-performance-optimization.sql
`;

    fs.writeFileSync(outputPath, fullSQL);
    console.log(`\n✅ SQL script saved to: ${outputPath}`);

    console.log("\n🎯 Next Steps:");
    console.log("1. Copy the contents of performance-optimization.sql");
    console.log("2. Go to Supabase Dashboard > SQL Editor");
    console.log("3. Paste and run the script");
    console.log(
      "4. Also run the 18-add-performance-optimization.sql migration",
    );
    console.log("5. Test query performance again to verify improvements");
  } catch (error) {
    console.error("❌ Performance optimization failed:", error);
  }
}

async function testQueryPerformance() {
  const queries = [
    {
      name: "Estimates by status",
      query: () =>
        supabase.from("estimates").select("id").eq("status", "draft"),
    },
    {
      name: "Recent estimation flows",
      query: () =>
        supabase
          .from("estimation_flows")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(10),
    },
    {
      name: "Profiles by role",
      query: () => supabase.from("profiles").select("id").eq("role", "admin"),
    },
    {
      name: "Analytics events",
      query: () =>
        supabase
          .from("analytics_events")
          .select("id")
          .gte(
            "created_at",
            new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          ),
    },
  ];

  const times = [];
  for (const test of queries) {
    const start = Date.now();
    await test.query();
    const time = Date.now() - start;
    times.push(time);
    console.log(`   ${test.name}: ${time}ms`);
  }

  return {
    avgTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
  };
}

// Run the optimization
runPerformanceOptimization().catch(console.error);
