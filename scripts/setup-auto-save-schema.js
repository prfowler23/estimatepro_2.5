#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

// Import Supabase client
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  console.error(
    "Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupAutoSaveSchema() {
  console.log("🚀 Setting up auto-save database schema...");

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, "..", "create_auto_save_table.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Split SQL into individual statements
    const statements = sql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.includes("COMMENT ON") || statement.includes("DO $$")) {
        // Skip comments and DO blocks for now
        continue;
      }

      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);

        const { error } = await supabase.rpc("exec_sql", {
          sql: statement + ";",
        });

        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err);
        errorCount++;
      }
    }

    console.log(
      `✅ Schema setup complete: ${successCount} successful, ${errorCount} errors`,
    );

    // Test the tables
    await testTables();
  } catch (error) {
    console.error("❌ Failed to setup auto-save schema:", error);
    process.exit(1);
  }
}

async function testTables() {
  console.log("🧪 Testing table access...");

  const tables = [
    "estimation_flows",
    "estimation_flow_versions",
    "estimation_flow_conflicts",
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(1);

      if (error) {
        console.log(`⚠️  Table ${table}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: accessible`);
      }
    } catch (err) {
      console.log(`❌ Table ${table}: ${err.message}`);
    }
  }
}

// Run the setup
setupAutoSaveSchema().catch(console.error);
