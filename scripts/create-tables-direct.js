const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

async function createTablesDirectly() {
  // Load environment variables
  require("dotenv").config({ path: ".env.local" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("🚀 Starting direct table creation...");

    // First, check which tables exist
    console.log("📋 Checking existing tables...");

    // Check if estimation_flows table exists
    const { data: flowsData, error: flowsError } = await supabase
      .from("estimation_flows")
      .select("id")
      .limit(1);

    if (flowsError && flowsError.code === "PGRST106") {
      console.log("❌ estimation_flows table does not exist");
      console.log("📝 This table needs to be created in Supabase SQL Editor");
      console.log("");
      console.log("🔧 Please run this SQL in your Supabase SQL Editor:");
      console.log("");

      // Read and display the simplified SQL needed
      const sqlPath = path.join(__dirname, "create-essential-tables.sql");
      if (fs.existsSync(sqlPath)) {
        const sqlContent = fs.readFileSync(sqlPath, "utf8");
        console.log("--- COPY THIS SQL TO SUPABASE SQL EDITOR ---");
        console.log(sqlContent);
        console.log("--- END OF SQL ---");
        console.log("");
        console.log("📋 Instructions:");
        console.log("1. Go to your Supabase Dashboard");
        console.log("2. Navigate to SQL Editor");
        console.log("3. Create a new query");
        console.log("4. Copy and paste the SQL above");
        console.log("5. Run the query");
        console.log("6. Test the application again");
      } else {
        console.log("Could not find create-essential-tables.sql");
      }
    } else if (flowsError) {
      console.log("❌ Error checking estimation_flows:", flowsError.message);
    } else {
      console.log("✅ estimation_flows table exists");
    }

    // Check customers table
    const { data: customersData, error: customersError } = await supabase
      .from("customers")
      .select("id")
      .limit(1);

    if (customersError && customersError.code === "PGRST106") {
      console.log("❌ customers table does not exist");
    } else if (customersError) {
      console.log("❌ Error checking customers:", customersError.message);
    } else {
      console.log("✅ customers table exists");
    }

    // Check estimates table (renamed from quotes)
    const { data: estimatesData, error: estimatesError } = await supabase
      .from("estimates")
      .select("id")
      .limit(1);

    if (estimatesError && estimatesError.code === "PGRST106") {
      console.log("❌ estimates table does not exist");
    } else if (estimatesError) {
      console.log("❌ Error checking estimates:", estimatesError.message);
    } else {
      console.log("✅ estimates table exists");
    }

    console.log("");
    console.log(
      "🏁 Table check complete. If tables are missing, create them using the SQL above.",
    );
  } catch (error) {
    console.error("💥 Failed to check tables:", error);
  }
}

createTablesDirectly();
