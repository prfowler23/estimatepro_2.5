const { createClient } = require("@supabase/supabase-js");

async function setupBasicSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("🚀 Testing database connection...");

    // Test connection with a simple query
    const { data, error } = await supabase
      .from("auth.users")
      .select("id")
      .limit(1);

    if (error) {
      console.error("❌ Database connection failed:", error);

      // Try creating basic estimates table
      console.log("📝 Attempting to create estimates table...");
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS estimates (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          quote_number TEXT UNIQUE NOT NULL DEFAULT 'QTE-' || extract(year from now()) || '-' || lpad(extract(doy from now())::text, 3, '0') || '-' || lpad((extract(epoch from now()) % 86400)::integer::text, 5, '0'),
          customer_name TEXT NOT NULL DEFAULT 'Sample Customer',
          customer_email TEXT NOT NULL DEFAULT 'customer@example.com',
          building_name TEXT NOT NULL DEFAULT 'Sample Building',
          building_address TEXT NOT NULL DEFAULT '123 Main St',
          building_height_stories INTEGER NOT NULL DEFAULT 1,
          total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
          status TEXT CHECK (status IN ('draft', 'sent', 'approved', 'rejected')) DEFAULT 'draft',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS estimate_services (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          quote_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
          service_type TEXT NOT NULL DEFAULT 'WC',
          price DECIMAL(10,2) NOT NULL DEFAULT 0,
          total_hours DECIMAL(8,2) DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      console.log("Creating tables with raw SQL...");
      // Note: This won't work without proper RPC function, but shows the intent
      console.log("Tables need to be created manually in Supabase dashboard");
      return;
    }

    console.log("✅ Database connection successful!");

    // Try to access estimates table
    const { data: estimatesData, error: estimatesError } = await supabase
      .from("estimates")
      .select("id")
      .limit(1);

    if (estimatesError) {
      console.log("❌ Quotes table not found:", estimatesError.message);
      console.log(
        "📝 Please create the estimates table in your Supabase dashboard",
      );
    } else {
      console.log("✅ Quotes table exists");
    }
  } catch (error) {
    console.error("💥 Setup failed:", error);
  }
}

// Load environment variables
require("dotenv").config({ path: ".env.local" });

setupBasicSchema();
