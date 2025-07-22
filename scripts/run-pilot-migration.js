const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase configuration");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runPilotMigration() {
  try {
    console.log("🚀 Running pilot certification system migration...");

    // Read the SQL file
    const migrationFile = path.join(
      __dirname,
      "../sql/migrations/22-add-pilot-system.sql",
    );
    const sql = fs.readFileSync(migrationFile, "utf8");

    console.log("📝 Pilot certification system migration prepared");
    console.log(
      "⚠️  Note: SQL execution through Supabase client has limitations",
    );
    console.log(
      "📋 For full functionality, please run the SQL manually in Supabase dashboard",
    );

    // Try to verify some key tables exist by checking them
    console.log("\n🔍 Checking for existing pilot system tables...");

    const tables = [
      "pilot_certifications",
      "pilot_flight_log",
      "pilot_training_records",
      "pilot_equipment_ratings",
      "pilot_compliance_alerts",
    ];

    let existingTables = 0;

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (!error) {
          console.log(`✅ Table ${table}: exists`);
          existingTables++;
        } else if (error.message.includes("does not exist")) {
          console.log(`❌ Table ${table}: needs to be created`);
        } else {
          console.log(`⚠️  Table ${table}: ${error.message}`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Existing tables: ${existingTables}/${tables.length}`);

    if (existingTables === tables.length) {
      console.log("\n🎉 Pilot certification system is already set up!");
    } else {
      console.log("\n⚠️  Pilot system tables need to be created");
      console.log("\n📋 To complete the migration:");
      console.log("1. Go to your Supabase project dashboard");
      console.log("2. Navigate to the SQL Editor");
      console.log(
        "3. Copy and paste the contents of sql/migrations/22-add-pilot-system.sql",
      );
      console.log("4. Execute the SQL script");
      console.log("5. Verify all tables are created successfully");
    }

    console.log("\n🔧 Next steps:");
    console.log("1. Update PilotService to use real database queries");
    console.log("2. Test pilot functionality with real data");
    console.log("3. Add pilot management UI components");
    console.log("4. Set up compliance alert automation");

    // Show sample queries for testing
    console.log("\n📋 Sample queries to test the system:");
    console.log("-- Check pilot certifications");
    console.log("SELECT * FROM pilot_certifications WHERE is_active = true;");
    console.log("\n-- Check compliance for a pilot");
    console.log("SELECT * FROM check_pilot_compliance('your-pilot-user-id');");
    console.log("\n-- Calculate pilot currency");
    console.log(
      "SELECT * FROM calculate_pilot_currency('your-pilot-user-id');",
    );
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

runPilotMigration();
