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

async function runCollaborationMigration() {
  try {
    console.log("🚀 Running collaboration migration...");

    // Read the SQL file
    const migrationFile = path.join(
      __dirname,
      "../14-add-collaboration-tables.sql",
    );
    const sql = fs.readFileSync(migrationFile, "utf8");

    // Split into individual statements
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);

      try {
        const { error } = await supabase.rpc("exec_sql", { sql: statement });
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
          continue; // Continue with next statement
        }
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (err) {
        console.error(`❌ Error executing statement ${i + 1}:`, err.message);
        continue; // Continue with next statement
      }
    }

    // Verify key tables exist
    console.log("\n🔍 Verifying collaboration tables...");

    const tables = [
      "estimate_collaborators",
      "estimate_changes",
      "collaboration_sessions",
      "collaboration_conflicts",
      "collaboration_invitations",
    ];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: exists`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }

    console.log("\n🎉 Collaboration migration completed!");
    console.log("\nNext steps:");
    console.log("1. Test the collaboration features in development");
    console.log("2. Verify real-time subscriptions are working");
    console.log("3. Test permission and role systems");
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

runCollaborationMigration();
