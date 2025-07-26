const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log("Running missing tables migration...");

  try {
    // Read the SQL file
    const sqlPath = path.join(
      __dirname,
      "..",
      "..",
      "migrations",
      "missing-tables-schema.sql",
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("Executing SQL migration...");
    console.log("Note: This creates vendors and estimation_flow_states tables");

    // Since we can't run the SQL directly through the client, provide instructions
    console.log("\n===========================================");
    console.log("Please run the following SQL in your Supabase SQL Editor:");
    console.log("===========================================\n");
    console.log(sql);
    console.log("\n===========================================");
    console.log("Migration file location:", sqlPath);
    console.log("===========================================\n");

    console.log("After running the SQL, please regenerate types with:");
    console.log(
      "npx supabase gen types typescript --project-id " +
        supabaseUrl.split("//")[1].split(".")[0] +
        " > types/supabase.ts",
    );
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
