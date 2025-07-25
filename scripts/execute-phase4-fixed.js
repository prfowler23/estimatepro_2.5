require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

async function executePhase4Fixed() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🚀 Starting Phase 4 Fixed Migration Execution...");
    console.log("📡 Connected to:", supabaseUrl.replace(/\/\/.*@/, "//***@"));

    // Execute RLS Performance Optimization first
    console.log("\n📋 Step 1: Executing RLS Performance Optimization...");
    const rlsScript = fs.readFileSync(
      "./scripts/phase4-rls-performance-optimization-fixed.sql",
      "utf8",
    );

    const { data: rlsData, error: rlsError } = await supabase.rpc("exec_sql", {
      sql: rlsScript,
    });

    if (rlsError) {
      console.error("❌ RLS Optimization Error:", rlsError.message);
      throw rlsError;
    } else {
      console.log("✅ RLS Performance Optimization completed successfully");
    }

    // Execute Index Cleanup second
    console.log("\n📋 Step 2: Executing Index Cleanup...");
    const indexScript = fs.readFileSync(
      "./scripts/phase4-index-cleanup-fixed.sql",
      "utf8",
    );

    const { data: indexData, error: indexError } = await supabase.rpc(
      "exec_sql",
      {
        sql: indexScript,
      },
    );

    if (indexError) {
      console.error("❌ Index Cleanup Error:", indexError.message);
      throw indexError;
    } else {
      console.log("✅ Index Cleanup completed successfully");
    }

    // Check for optional tables
    console.log("\n📋 Step 3: Checking for optional tables...");

    const { data: analyticsExists } = await supabase.rpc("exec_sql", {
      sql: "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events')",
    });

    const { data: flowsExists } = await supabase.rpc("exec_sql", {
      sql: "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimation_flows')",
    });

    console.log("📊 analytics_events table exists:", analyticsExists);
    console.log("📊 estimation_flows table exists:", flowsExists);

    if (analyticsExists || flowsExists) {
      console.log(
        "⚠️  Optional table indexes should be created separately if needed",
      );
      console.log("📝 Run: node scripts/execute-optional-indexes.js");
    }

    console.log("\n🎉 Phase 4 Fixed Migration completed successfully!");
    console.log(
      "📈 All CREATE INDEX CONCURRENTLY operations should now work correctly",
    );
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  }
}

executePhase4Fixed();
