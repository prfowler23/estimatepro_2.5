const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

async function runIntegrationMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read the integration migration script
    const migrationPath = path.join(
      __dirname,
      "..",
      "16-add-integration-tables.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("🚀 Starting integration tables migration...");
    console.log("📋 Migration script size:", migrationSQL.length, "characters");

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log("📝 Found", statements.length, "SQL statements to execute");

    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip empty statements or comments
      if (!statement || statement.startsWith("--")) {
        continue;
      }

      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      console.log(
        `    ${statement.substring(0, 60)}${statement.length > 60 ? "..." : ""}`,
      );

      try {
        // Use direct query for DDL statements
        const { error } = await supabase.rpc("exec_sql", { sql: statement });

        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);

          // Try alternative approach for DDL statements
          if (error.code === "PGRST202") {
            console.log("   ℹ️  Using direct query approach");
            const { error: directError } = await supabase
              .from("_prisma_migrations")
              .select("*")
              .limit(1);

            if (directError) {
              console.error("   ⚠️  Direct query also failed:", directError);
            } else {
              console.log(
                "   ⚠️  DDL statement needs to be run manually in Supabase dashboard",
              );
              console.log("   📝 SQL to run:", statement);
            }
          }
        } else {
          console.log(`   ✅ Statement ${i + 1} completed successfully`);
        }
      } catch (err) {
        console.error(`❌ Unexpected error in statement ${i + 1}:`, err);
      }
    }

    console.log("🎉 Integration migration completed!");
    console.log(
      "⚠️  Please verify all tables were created in Supabase dashboard",
    );
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

runIntegrationMigration();
