#!/usr/bin/env node

/**
 * Test Column Structure Script
 *
 * This script tests the actual column structure by trying different operations
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

async function testEstimatesColumns() {
  console.log("\n🔍 Testing ESTIMATES table columns...");

  // Test the columns we know exist from schema files
  const testData = {
    quote_number: "TEST-" + Date.now(),
    customer_name: "Test Customer",
    customer_email: "test@test.com",
    building_name: "Test Building",
    building_address: "Test Address",
    building_height_stories: 1,
    total_price: 100.0,
    status: "draft",
  };

  const { data, error } = await supabase
    .from("estimates")
    .insert([testData])
    .select();

  if (error) {
    console.error("❌ Error inserting to estimates:", error.message);
  } else {
    console.log("✅ Successfully inserted to estimates");
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log("📋 ESTIMATES columns:", columns.join(", "));

      // Clean up test data
      await supabase.from("estimates").delete().eq("id", data[0].id);
      return columns;
    }
  }

  return null;
}

async function testEstimateServicesColumns() {
  console.log("\n🔍 Testing ESTIMATE_SERVICES table columns...");

  // First create an estimate to reference
  const { data: estimateData, error: estimateError } = await supabase
    .from("estimates")
    .insert([
      {
        quote_number: "TEST-SERVICE-" + Date.now(),
        customer_name: "Test Customer",
        customer_email: "test@test.com",
        building_name: "Test Building",
        building_address: "Test Address",
        status: "draft",
      },
    ])
    .select();

  if (estimateError) {
    console.error("❌ Error creating test estimate:", estimateError.message);
    return null;
  }

  const estimateId = estimateData[0].id;

  // Test estimate_services columns
  const testData = {
    quote_id: estimateId,
    service_type: "WC",
    price: 50.0,
  };

  const { data, error } = await supabase
    .from("estimate_services")
    .insert([testData])
    .select();

  if (error) {
    console.error("❌ Error inserting to estimate_services:", error.message);
  } else {
    console.log("✅ Successfully inserted to estimate_services");
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log("📋 ESTIMATE_SERVICES columns:", columns.join(", "));

      // Clean up test data
      await supabase.from("estimate_services").delete().eq("id", data[0].id);
      await supabase.from("estimates").delete().eq("id", estimateId);
      return columns;
    }
  }

  // Clean up estimate
  await supabase.from("estimates").delete().eq("id", estimateId);
  return null;
}

async function testIntegrationsColumns() {
  console.log("\n🔍 Testing INTEGRATIONS table columns...");

  const testData = {
    provider: "test_provider",
    name: "Test Integration",
    enabled: true,
  };

  const { data, error } = await supabase
    .from("integrations")
    .insert([testData])
    .select();

  if (error) {
    console.error("❌ Error inserting to integrations:", error.message);
  } else {
    console.log("✅ Successfully inserted to integrations");
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log("📋 INTEGRATIONS columns:", columns.join(", "));

      // Clean up test data
      await supabase.from("integrations").delete().eq("id", data[0].id);
      return columns;
    }
  }

  return null;
}

async function runTests() {
  console.log("🧪 Testing Database Column Structure...\n");

  const estimatesColumns = await testEstimatesColumns();
  const servicesColumns = await testEstimateServicesColumns();
  const integrationsColumns = await testIntegrationsColumns();

  console.log("\n📊 COLUMN SUMMARY FOR SQL FIX:");
  console.log("=====================================");

  if (estimatesColumns) {
    console.log("\n✅ ESTIMATES table columns:");
    console.log("   ", estimatesColumns.join(", "));

    const neededForQuoteSummary = [
      "customer_phone",
      "customer_address",
      "expires_at",
      "accepted_at",
      "rejected_at",
      "payment_terms",
      "notes",
    ];

    console.log("\n📋 Columns needed by quote_summary view:");
    neededForQuoteSummary.forEach((col) => {
      const exists = estimatesColumns.includes(col);
      console.log(`   ${exists ? "✅" : "❌"} ${col}`);
    });
  }

  if (servicesColumns) {
    console.log("\n✅ ESTIMATE_SERVICES table columns:");
    console.log("   ", servicesColumns.join(", "));
  }

  if (integrationsColumns) {
    console.log("\n✅ INTEGRATIONS table columns:");
    console.log("   ", integrationsColumns.join(", "));

    const neededForHealthView = [
      "integration_type",
      "status",
      "is_active",
      "last_sync_at",
      "error_count",
      "sync_frequency",
    ];

    console.log("\n📋 Columns needed by integration_health_view:");
    neededForHealthView.forEach((col) => {
      const exists = integrationsColumns.includes(col);
      console.log(`   ${exists ? "✅" : "❌"} ${col}`);
    });
  }
}

runTests().catch(console.error);
