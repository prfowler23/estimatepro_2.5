// Create PDF processing tables directly
// Simple approach to create necessary tables for PDF processing

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPDFTables() {
  console.log("🚀 Creating PDF processing tables...");

  try {
    // Create PDF processing history table
    const historyTableSQL = `
      CREATE TABLE IF NOT EXISTS pdf_processing_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          filename TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          pages_processed INTEGER NOT NULL DEFAULT 0,
          text_extracted BOOLEAN NOT NULL DEFAULT false,
          images_found INTEGER NOT NULL DEFAULT 0,
          measurements_found INTEGER NOT NULL DEFAULT 0,
          building_analysis JSONB,
          processing_options JSONB,
          processing_duration_ms INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    console.log("📊 Creating pdf_processing_history table...");
    const { error: historyError } = await supabase.rpc("exec_sql", {
      sql: historyTableSQL,
    });

    if (historyError && !historyError.message.includes("already exists")) {
      console.error(
        "❌ Error creating pdf_processing_history table:",
        historyError,
      );
    } else {
      console.log("✅ pdf_processing_history table created/verified");
    }

    // Create indexes
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_pdf_processing_history_user_id ON pdf_processing_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_pdf_processing_history_created_at ON pdf_processing_history(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_pdf_processing_history_filename ON pdf_processing_history(filename);
    `;

    console.log("📇 Creating indexes...");
    const { error: indexError } = await supabase.rpc("exec_sql", {
      sql: indexSQL,
    });

    if (indexError && !indexError.message.includes("already exists")) {
      console.error("❌ Error creating indexes:", indexError);
    } else {
      console.log("✅ Indexes created/verified");
    }

    // Enable RLS
    const rlsSQL = `
      ALTER TABLE pdf_processing_history ENABLE ROW LEVEL SECURITY;
    `;

    console.log("🔒 Enabling Row Level Security...");
    const { error: rlsError } = await supabase.rpc("exec_sql", {
      sql: rlsSQL,
    });

    if (rlsError && !rlsError.message.includes("already")) {
      console.error("❌ Error enabling RLS:", rlsError);
    } else {
      console.log("✅ Row Level Security enabled");
    }

    // Create RLS policies
    const policySQL = `
      DROP POLICY IF EXISTS "Users can view their own PDF processing history" ON pdf_processing_history;
      DROP POLICY IF EXISTS "Users can insert their own PDF processing history" ON pdf_processing_history;
      
      CREATE POLICY "Users can view their own PDF processing history" ON pdf_processing_history
          FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert their own PDF processing history" ON pdf_processing_history
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    `;

    console.log("🛡️ Creating RLS policies...");
    const { error: policyError } = await supabase.rpc("exec_sql", {
      sql: policySQL,
    });

    if (policyError) {
      console.error("❌ Error creating policies:", policyError);
    } else {
      console.log("✅ RLS policies created");
    }

    console.log("🎉 PDF processing tables setup complete!");
  } catch (error) {
    console.error("💥 Error setting up PDF processing tables:", error);
    process.exit(1);
  }
}

// Test the tables
async function testTables() {
  console.log("🧪 Testing PDF tables...");

  try {
    const { data, error } = await supabase
      .from("pdf_processing_history")
      .select("count(*)")
      .limit(1);

    if (error) {
      console.error("❌ Error testing tables:", error);
    } else {
      console.log("✅ PDF processing tables working correctly");
    }
  } catch (error) {
    console.error("💥 Error testing tables:", error);
  }
}

async function main() {
  await createPDFTables();
  await testTables();
}

main().catch(console.error);
