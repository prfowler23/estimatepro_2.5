const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function checkFacadeAnalysisTables() {
  try {
    console.log("🔍 Checking facade analysis tables...");

    // Check if facade_analyses table exists
    const { data: facadeData, error: facadeError } = await supabase
      .from("facade_analyses")
      .select("id")
      .limit(1);

    if (facadeError && facadeError.code === "42P01") {
      console.log("❌ facade_analyses table not found");
      console.log(`
⚠️  Please run the following SQL in your Supabase SQL Editor:

1. Navigate to your Supabase Dashboard
2. Go to SQL Editor
3. Create a new query
4. Copy and paste the contents of: migrations/facade-analysis-schema.sql
5. Run the query

The migration file creates:
- facade_analyses table
- facade_analysis_images table  
- All necessary indexes
- Row Level Security policies
      `);
      return false;
    }

    console.log("✅ facade_analyses table exists");

    // Check if facade_analysis_images table exists
    const { data: imagesData, error: imagesError } = await supabase
      .from("facade_analysis_images")
      .select("id")
      .limit(1);

    if (imagesError && imagesError.code === "42P01") {
      console.log("❌ facade_analysis_images table not found");
      return false;
    }

    console.log("✅ facade_analysis_images table exists");
    console.log("🎉 All facade analysis tables are set up correctly!");
    return true;
  } catch (error) {
    console.error("❌ Error checking tables:", error);
    return false;
  }
}

checkFacadeAnalysisTables();
