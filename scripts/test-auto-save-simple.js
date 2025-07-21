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

async function testSimpleAutoSave() {
  console.log("🧪 Testing simple auto-save functionality...");

  const testEstimateId = `test-estimate-${Date.now()}`;

  // Also test with a proper UUID format
  const testUuidEstimateId = `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Test basic insert following the exact table schema
    console.log("📝 Testing basic insert...");
    const { error: insertError } = await supabase
      .from("estimation_flows")
      .insert({
        estimate_id: testEstimateId,
        current_step: 1,
        status: "draft",
        contact_method: "email",
        initial_notes: "Test auto-save functionality",
        selected_services: ["window-cleaning"],
        version: 1,
        last_modified: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.log("❌ Insert failed:", insertError.message);
      console.log("📋 Full error:", insertError);
    } else {
      console.log("✅ Insert successful");

      // Test read
      console.log("📖 Testing read...");
      const { data, error: readError } = await supabase
        .from("estimation_flows")
        .select("*")
        .eq("estimate_id", testEstimateId)
        .single();

      if (readError) {
        console.log("❌ Read failed:", readError.message);
      } else {
        console.log("✅ Read successful");
        console.log("📊 Data:", {
          estimate_id: data.estimate_id,
          current_step: data.current_step,
          status: data.status,
          version: data.version,
        });
      }

      // Test update
      console.log("🔄 Testing update...");
      const { error: updateError } = await supabase
        .from("estimation_flows")
        .update({
          current_step: 2,
          version: 2,
          last_modified: new Date().toISOString(),
        })
        .eq("estimate_id", testEstimateId);

      if (updateError) {
        console.log("❌ Update failed:", updateError.message);
      } else {
        console.log("✅ Update successful");
      }
    }

    // Cleanup
    console.log("🧹 Cleaning up...");
    await supabase
      .from("estimation_flows")
      .delete()
      .eq("estimate_id", testEstimateId);
  } catch (error) {
    console.error("❌ Test failed with exception:", error);
  }

  console.log("✅ Simple auto-save test completed");
}

testSimpleAutoSave().catch(console.error);
