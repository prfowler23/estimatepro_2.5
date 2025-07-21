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

async function checkSchema() {
  console.log("🔍 Checking database schema...");

  try {
    // Check estimation_flows table structure
    console.log("📋 Checking estimation_flows table...");
    const { data, error } = await supabase
      .from("estimation_flows")
      .select("*")
      .limit(1);

    if (error) {
      console.log("❌ Error accessing estimation_flows:", error.message);
    } else {
      console.log("✅ estimation_flows table accessible");
      if (data && data.length > 0) {
        console.log("📊 Sample columns:", Object.keys(data[0]));
      } else {
        console.log("📊 Table is empty, testing column access...");

        // Try to insert a test record to see what columns are available
        const { error: insertError } = await supabase
          .from("estimation_flows")
          .insert({
            estimate_id: "test-string-id",
            current_step: 1,
            status: "draft",
          });

        if (insertError) {
          console.log("❌ Insert test failed:", insertError.message);
          console.log("📋 This tells us about the schema requirements");
        } else {
          console.log("✅ Insert test passed - string IDs work");
          // Clean up
          await supabase
            .from("estimation_flows")
            .delete()
            .eq("estimate_id", "test-string-id");
        }
      }
    }

    // Check if we can access any existing data
    console.log("📖 Looking for existing data...");
    const { data: existingData, error: existingError } = await supabase
      .from("estimation_flows")
      .select("estimate_id, current_step, status")
      .limit(5);

    if (existingError) {
      console.log("❌ Error reading existing data:", existingError.message);
    } else {
      console.log(`✅ Found ${existingData.length} existing records`);
      if (existingData.length > 0) {
        console.log("📋 Sample data:", existingData[0]);
      }
    }
  } catch (error) {
    console.error("❌ Schema check failed:", error);
  }
}

checkSchema().catch(console.error);
