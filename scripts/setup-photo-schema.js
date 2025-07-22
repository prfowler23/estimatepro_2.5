#!/usr/bin/env node

/**
 * Setup Photo Schema
 * Creates the complete database schema for photo storage and AI analysis
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupPhotoSchema() {
  console.log("🚀 Setting up photo schema...");

  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, "..", "sql", "photos-schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    // Execute the schema
    console.log("📋 Creating photos and photo_analysis_results tables...");
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: schemaSql,
    });

    if (error) {
      throw error;
    }

    console.log("✅ Tables created successfully");

    // Create storage bucket
    console.log("🗂️  Creating storage bucket for photos...");
    const { data: bucketData, error: bucketError } =
      await supabase.storage.createBucket("estimate-photos", {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/heic",
        ],
      });

    if (bucketError && !bucketError.message.includes("already exists")) {
      throw bucketError;
    }

    console.log("✅ Storage bucket configured");

    // Set up storage policies
    console.log("🔒 Setting up storage policies...");

    const storagePolicies = [
      {
        name: "Users can upload photos",
        definition: `(bucket_id = 'estimate-photos'::text) AND (auth.uid() IS NOT NULL)`,
        action: "INSERT",
      },
      {
        name: "Users can view their photos",
        definition: `(bucket_id = 'estimate-photos'::text) AND (auth.uid() IS NOT NULL)`,
        action: "SELECT",
      },
      {
        name: "Users can update their photos",
        definition: `(bucket_id = 'estimate-photos'::text) AND (auth.uid() IS NOT NULL)`,
        action: "UPDATE",
      },
      {
        name: "Users can delete their photos",
        definition: `(bucket_id = 'estimate-photos'::text) AND (auth.uid() IS NOT NULL)`,
        action: "DELETE",
      },
    ];

    for (const policy of storagePolicies) {
      const { error: policyError } = await supabase.rpc(
        "create_storage_policy",
        {
          policy_name: policy.name,
          bucket_name: "estimate-photos",
          policy_definition: policy.definition,
          policy_action: policy.action,
        },
      );

      if (policyError && !policyError.message.includes("already exists")) {
        console.warn(
          `Warning: Could not create storage policy "${policy.name}": ${policyError.message}`,
        );
      }
    }

    console.log("✅ Storage policies configured");

    // Verify schema
    console.log("🔍 Verifying schema...");

    const { data: photosTable, error: photosError } = await supabase
      .from("photos")
      .select("*")
      .limit(0);

    if (photosError) {
      throw new Error(
        `Photos table verification failed: ${photosError.message}`,
      );
    }

    const { data: analysisTable, error: analysisError } = await supabase
      .from("photo_analysis_results")
      .select("*")
      .limit(0);

    if (analysisError) {
      throw new Error(
        `Analysis table verification failed: ${analysisError.message}`,
      );
    }

    console.log("✅ Schema verified successfully");

    console.log("\n🎉 Photo schema setup complete!");
    console.log("\nNext steps:");
    console.log("1. Test photo upload with: npm run dev");
    console.log("2. Upload photos via the PhotoUploadAnalysis component");
    console.log("3. Verify photos are stored in Supabase Storage and database");
  } catch (error) {
    console.error("❌ Schema setup failed:", error.message);
    console.error("\nTroubleshooting:");
    console.error("1. Check your Supabase connection and service role key");
    console.error("2. Ensure you have admin privileges on the database");
    console.error(
      "3. Verify the SQL schema file exists at sql/photos-schema.sql",
    );
    process.exit(1);
  }
}

// Alternative direct SQL execution if RPC doesn't work
async function executeSQLDirect() {
  console.log("📋 Executing SQL schema directly...");

  const statements = [
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,

    `CREATE TABLE IF NOT EXISTS photos (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      storage_path TEXT NOT NULL UNIQUE,
      public_url TEXT,
      metadata JSONB DEFAULT '{}',
      uploaded_at TIMESTAMPTZ DEFAULT NOW(),
      
      CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size < 50000000),
      CONSTRAINT valid_mime_type CHECK (mime_type LIKE 'image/%'),
      CONSTRAINT valid_file_name CHECK (char_length(file_name) > 0)
    );`,

    `CREATE TABLE IF NOT EXISTS photo_analysis_results (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      analysis_type TEXT NOT NULL,
      results JSONB NOT NULL DEFAULT '{}',
      confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
      processing_time_ms INTEGER,
      processed_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(photo_id, analysis_type)
    );`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_photos_estimate_id ON photos(estimate_id);`,
    `CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(uploaded_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_photo_analysis_photo_id ON photo_analysis_results(photo_id);`,
    `CREATE INDEX IF NOT EXISTS idx_photo_analysis_type ON photo_analysis_results(analysis_type);`,
    `CREATE INDEX IF NOT EXISTS idx_photo_analysis_processed_at ON photo_analysis_results(processed_at DESC);`,

    // RLS
    `ALTER TABLE photos ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE photo_analysis_results ENABLE ROW LEVEL SECURITY;`,

    // Permissions
    `GRANT ALL ON photos TO authenticated;`,
    `GRANT ALL ON photo_analysis_results TO authenticated;`,
    `GRANT USAGE ON SCHEMA public TO authenticated;`,
  ];

  for (const statement of statements) {
    try {
      await supabase.rpc("exec_sql", { sql: statement });
      console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
    } catch (error) {
      console.warn(`⚠️  Warning: ${error.message}`);
    }
  }
}

// Run the setup
if (require.main === module) {
  setupPhotoSchema()
    .then(() => {
      console.log("✅ Setup completed successfully");
      process.exit(0);
    })
    .catch(async (error) => {
      console.warn("⚠️  Main setup failed, trying direct SQL execution...");
      try {
        await executeSQLDirect();
        console.log("✅ Direct SQL execution completed");
      } catch (directError) {
        console.error(
          "❌ Direct SQL execution also failed:",
          directError.message,
        );
        process.exit(1);
      }
    });
}

module.exports = { setupPhotoSchema, executeSQLDirect };
