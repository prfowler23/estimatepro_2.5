require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl ? "Set" : "Not set");
console.log("Supabase Key:", supabaseKey ? "Set" : "Not set");

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAnalytics() {
  console.log("Testing analytics data...");

  try {
    // Check if we can connect to Supabase
    console.log("1. Testing database connection...");
    const { data: testData, error: testError } = await supabase
      .from("estimates")
      .select("id")
      .limit(1);

    if (testError) {
      console.error("❌ Database connection failed:", testError.message);
      return;
    }

    console.log("✅ Database connection successful");

    // Check estimates count
    console.log("2. Checking estimates data...");
    const { count: estimatesCount, error: estimatesError } = await supabase
      .from("estimates")
      .select("*", { count: "exact", head: true });

    if (estimatesError) {
      console.error("❌ Error fetching estimates:", estimatesError.message);
      return;
    }

    console.log(`📊 Found ${estimatesCount} estimates in database`);

    // Check estimate_services count
    console.log("3. Checking quote services data...");
    const { count: servicesCount, error: servicesError } = await supabase
      .from("estimate_services")
      .select("*", { count: "exact", head: true });

    if (servicesError) {
      console.error("❌ Error fetching quote services:", servicesError.message);
      return;
    }

    console.log(`🔧 Found ${servicesCount} quote services in database`);

    // If no data, suggest creating sample data
    if (estimatesCount === 0) {
      console.log("");
      console.log("💡 No estimates found. To test analytics:");
      console.log("   1. Go to http://localhost:3000/calculator");
      console.log("   2. Create a few test estimates");
      console.log('   3. Set some estimates to "approved" status');
      console.log("   4. Visit http://localhost:3000/analytics");
    } else {
      console.log("");
      console.log(
        "✅ Analytics should work! Visit http://localhost:3000/analytics",
      );
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testAnalytics();
