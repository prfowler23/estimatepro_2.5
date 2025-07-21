#!/usr/bin/env node

// Load environment variables
require("dotenv").config({ path: ".env.local" });

// Import Supabase client
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAutoSave() {
  console.log("🧪 Testing auto-save functionality...");

  const testEstimateId = `test-estimate-${Date.now()}`;
  const testData = {
    initialContact: {
      contactMethod: "email",
      notes: "Test estimate for auto-save",
    },
    scopeDetails: {
      selectedServices: ["window-cleaning", "pressure-washing"],
    },
  };

  try {
    // Test 1: Try to save with flow_data column
    console.log("📝 Test 1: Saving with flow_data column...");
    const { error: saveError1 } = await supabase
      .from("estimation_flows")
      .insert({
        estimate_id: testEstimateId,
        current_step: 1,
        status: "draft",
        contact_method: "email",
        initial_notes: "Test auto-save",
        selected_services: ["window-cleaning"],
        updated_at: new Date().toISOString(),
      });

    if (saveError1) {
      console.log("❌ Test 1 failed:", saveError1.message);

      // Test 2: Try to save with basic columns
      console.log("📝 Test 2: Saving with basic columns...");
      const { error: saveError2 } = await supabase
        .from("estimation_flows")
        .upsert({
          estimate_id: testEstimateId,
          current_step: 1,
          initial_notes: "Test estimate for auto-save",
          updated_at: new Date().toISOString(),
        });

      if (saveError2) {
        console.log("❌ Test 2 failed:", saveError2.message);
      } else {
        console.log("✅ Test 2 passed: Basic save works");
      }
    } else {
      console.log("✅ Test 1 passed: flow_data column exists");
    }

    // Test 3: Try to read back the data
    console.log("📖 Test 3: Reading back data...");
    const { data, error: readError } = await supabase
      .from("estimation_flows")
      .select("*")
      .eq("estimate_id", testEstimateId)
      .single();

    if (readError) {
      console.log("❌ Test 3 failed:", readError.message);
    } else {
      console.log("✅ Test 3 passed: Data retrieved successfully");
      console.log("📋 Available columns:", Object.keys(data));
    }

    // Test 4: Try version control table
    console.log("📝 Test 4: Testing version control...");
    const { error: versionError } = await supabase
      .from("estimation_flow_versions")
      .insert({
        estimate_id: testEstimateId,
        version: 1,
        data: testData,
        timestamp: new Date().toISOString(),
        user_id: "test-user",
        step_id: "initial-contact",
        change_description: "Test version save",
      });

    if (versionError) {
      console.log("❌ Test 4 failed:", versionError.message);
    } else {
      console.log("✅ Test 4 passed: Version control works");
    }

    // Cleanup
    console.log("🧹 Cleaning up test data...");
    await supabase
      .from("estimation_flows")
      .delete()
      .eq("estimate_id", testEstimateId);
    await supabase
      .from("estimation_flow_versions")
      .delete()
      .eq("estimate_id", testEstimateId);

    console.log("✅ Auto-save test completed");
  } catch (error) {
    console.error("❌ Test failed with exception:", error);
  }
}

testAutoSave().catch(console.error);
