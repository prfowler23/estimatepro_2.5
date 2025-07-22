const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Bucket configurations
const buckets = [
  {
    name: "photos",
    public: true,
    config: {
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    },
    description: "Estimate photos and property images",
  },
  {
    name: "documents",
    public: false,
    config: {
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
    },
    description: "PDFs, reports, and documents",
  },
  {
    name: "avatars",
    public: true,
    config: {
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png"],
    },
    description: "User profile pictures",
  },
];

// SQL for bucket policies and helper functions
const bucketPoliciesSQL = `
-- ============================================
-- STORAGE BUCKET POLICIES AND HELPER FUNCTIONS
-- ============================================

-- Policy for photos bucket (public read, authenticated upload)
CREATE POLICY "Public can view photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'photos' 
  AND auth.uid() = owner
);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'photos' 
  AND auth.uid() = owner
);

-- Policy for documents bucket (private, authenticated only)
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND auth.uid() = owner
);

CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' 
  AND auth.uid() = owner
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' 
  AND auth.uid() = owner
);

-- Policy for avatars bucket (public read, user-specific write)
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Helper function to get signed URL for private files
CREATE OR REPLACE FUNCTION get_signed_url(
  bucket_name TEXT,
  file_path TEXT,
  expires_in INTEGER DEFAULT 3600
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  signed_url TEXT;
BEGIN
  -- This is a placeholder - actual implementation would use Supabase's signing mechanism
  -- In practice, you'd call this from your application using the Supabase client
  signed_url := format('%s/storage/v1/object/sign/%s/%s?token=TEMP&expires=%s',
    current_setting('app.settings.supabase_url', true),
    bucket_name,
    file_path,
    extract(epoch from now() + (expires_in || ' seconds')::interval)::text
  );
  
  RETURN signed_url;
END;
$$;

-- Helper function to validate file upload
CREATE OR REPLACE FUNCTION validate_file_upload(
  bucket_name TEXT,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  max_size BIGINT;
  allowed_types TEXT[];
BEGIN
  -- Set limits based on bucket
  CASE bucket_name
    WHEN 'photos' THEN
      max_size := 10485760; -- 10MB
      allowed_types := ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    WHEN 'documents' THEN
      max_size := 52428800; -- 50MB
      allowed_types := ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    WHEN 'avatars' THEN
      max_size := 5242880; -- 5MB
      allowed_types := ARRAY['image/jpeg', 'image/jpg', 'image/png'];
    ELSE
      RETURN FALSE;
  END CASE;
  
  -- Check file size
  IF file_size > max_size THEN
    RETURN FALSE;
  END IF;
  
  -- Check mime type
  IF NOT (mime_type = ANY(allowed_types)) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to clean up orphaned files
CREATE OR REPLACE FUNCTION cleanup_orphaned_files(
  retention_days INTEGER DEFAULT 7
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- This would identify and remove files not referenced in any tables
  -- Implementation depends on your specific use case
  
  -- Example: Clean up temporary upload files older than retention_days
  DELETE FROM storage.objects
  WHERE bucket_id IN ('photos', 'documents', 'avatars')
    AND created_at < NOW() - (retention_days || ' days')::INTERVAL
    AND name LIKE 'temp/%';
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_signed_url TO authenticated;
GRANT EXECUTE ON FUNCTION validate_file_upload TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_files TO authenticated;
`;

async function setupStorageBuckets() {
  try {
    console.log("🪣 Setting Up Storage Buckets...\n");

    // Step 1: Create buckets
    for (const bucket of buckets) {
      console.log(`📁 Creating bucket: ${bucket.name}`);
      console.log(`   Description: ${bucket.description}`);
      console.log(`   Public: ${bucket.public}`);
      console.log(
        `   Max file size: ${(bucket.config.fileSizeLimit / 1048576).toFixed(1)}MB`,
      );

      try {
        // Check if bucket exists
        const { data: existingBuckets } = await supabase.storage.listBuckets();
        const bucketExists = existingBuckets?.some(
          (b) => b.name === bucket.name,
        );

        if (bucketExists) {
          console.log(`   ⚠️  Bucket already exists`);
        } else {
          // Create bucket
          const { data, error } = await supabase.storage.createBucket(
            bucket.name,
            {
              public: bucket.public,
              fileSizeLimit: bucket.config.fileSizeLimit,
              allowedMimeTypes: bucket.config.allowedMimeTypes,
            },
          );

          if (error) {
            console.error(`   ❌ Error creating bucket: ${error.message}`);
          } else {
            console.log(`   ✅ Bucket created successfully`);
          }
        }
      } catch (error) {
        console.error(`   ❌ Failed to create bucket: ${error.message}`);
      }

      console.log("");
    }

    // Step 2: Test bucket access
    console.log("🔍 Testing bucket access...");
    const { data: bucketList } = await supabase.storage.listBuckets();

    if (bucketList) {
      console.log(`✅ Found ${bucketList.length} bucket(s):`);
      bucketList.forEach((bucket) => {
        console.log(`   📁 ${bucket.name} (created: ${bucket.created_at})`);
      });
    }

    // Step 3: Generate policies SQL
    const outputPath = path.join(__dirname, "storage-bucket-policies.sql");
    fs.writeFileSync(outputPath, bucketPoliciesSQL);
    console.log(`\n✅ Bucket policies SQL saved to: ${outputPath}`);

    // Step 4: Test upload capability
    console.log("\n🧪 Testing upload capability...");
    const testResults = await testBucketUploads();
    console.log(
      `   Photos bucket: ${testResults.photos ? "✅ Working" : "❌ Failed"}`,
    );
    console.log(
      `   Documents bucket: ${testResults.documents ? "✅ Working" : "❌ Failed"}`,
    );
    console.log(
      `   Avatars bucket: ${testResults.avatars ? "✅ Working" : "❌ Failed"}`,
    );

    console.log("\n🎯 Next Steps:");
    console.log("1. Copy the contents of storage-bucket-policies.sql");
    console.log("2. Go to Supabase Dashboard > SQL Editor");
    console.log("3. Paste and run the script to set up policies");
    console.log("4. Test file uploads in your application");
    console.log("\n💡 Usage Examples:");
    console.log("   Photos: /photos/{estimate_id}/{filename}");
    console.log("   Documents: /documents/{user_id}/{filename}");
    console.log("   Avatars: /avatars/{user_id}/{filename}");
  } catch (error) {
    console.error("❌ Storage bucket setup failed:", error);
  }
}

async function testBucketUploads() {
  const results = {
    photos: false,
    documents: false,
    avatars: false,
  };

  // Test each bucket with a small test file
  const testFile = new Blob(["test"], { type: "text/plain" });
  const testFileName = `test-${Date.now()}.txt`;

  for (const bucketName of Object.keys(results)) {
    try {
      // Try to upload
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(testFileName, testFile);

      if (!uploadError) {
        results[bucketName] = true;

        // Clean up test file
        await supabase.storage.from(bucketName).remove([testFileName]);
      }
    } catch (error) {
      // Bucket might not allow this file type, which is fine
    }
  }

  return results;
}

// Additional imports needed
const fs = require("fs");
const path = require("path");

// Run the setup
setupStorageBuckets().catch(console.error);
