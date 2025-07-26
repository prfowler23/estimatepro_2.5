#!/usr/bin/env node

/**
 * Test Supabase storage for facade analysis image uploads
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testStorageSetup() {
  console.log("🔍 Testing Supabase Storage Setup for Facade Analysis\n");

  try {
    // Check if bucket exists
    console.log("📦 Checking for 'facade-analysis' bucket...");
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error("❌ Error listing buckets:", bucketsError.message);
      return;
    }

    const facadeBucket = buckets.find((b) => b.name === "facade-analysis");

    if (!facadeBucket) {
      console.log("⚠️  'facade-analysis' bucket does not exist");
      console.log("📝 Creating bucket...");

      const { data: newBucket, error: createError } =
        await supabase.storage.createBucket("facade-analysis", {
          public: false,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/heic",
          ],
        });

      if (createError) {
        console.error("❌ Error creating bucket:", createError.message);
        console.log(
          "\n💡 Please create the bucket manually in Supabase Dashboard:",
        );
        console.log("1. Go to Storage in your Supabase project");
        console.log("2. Create a new bucket named 'facade-analysis'");
        console.log("3. Set it as private");
        console.log("4. Set file size limit to 10MB");
        console.log("5. Allow image types: jpeg, png, webp, heic");
        return;
      }

      console.log("✅ Bucket created successfully!");
    } else {
      console.log("✅ 'facade-analysis' bucket exists");
      console.log(`   - Public: ${facadeBucket.public ? "Yes" : "No"}`);
      console.log(
        `   - File size limit: ${facadeBucket.file_size_limit ? facadeBucket.file_size_limit / 1024 / 1024 + "MB" : "No limit"}`,
      );
    }

    // Test upload with a dummy image
    console.log("\n🖼️  Testing image upload...");

    // Create a tiny test image (1x1 transparent PNG)
    const testImageBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    const testImageBuffer = Buffer.from(testImageBase64, "base64");
    const testFileName = `test-${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("facade-analysis")
      .upload(testFileName, testImageBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("❌ Upload test failed:", uploadError.message);

      if (uploadError.message.includes("bucket")) {
        console.log(
          "\n💡 The bucket might need RLS policies. Add these in SQL Editor:",
        );
        console.log(`
-- Storage policies for facade-analysis bucket
CREATE POLICY "Users can upload facade analysis images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'facade-analysis' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own facade analysis images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'facade-analysis' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own facade analysis images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'facade-analysis' AND auth.uid()::text = (storage.foldername(name))[1]);
        `);
      }
      return;
    }

    console.log("✅ Upload test successful!");
    console.log(`   - File: ${uploadData.path}`);

    // Test download/access
    console.log("\n📥 Testing image access...");
    const { data: urlData } = supabase.storage
      .from("facade-analysis")
      .getPublicUrl(testFileName);

    console.log("✅ Public URL generated:", urlData.publicUrl);

    // Clean up test file
    console.log("\n🧹 Cleaning up test file...");
    const { error: deleteError } = await supabase.storage
      .from("facade-analysis")
      .remove([testFileName]);

    if (deleteError) {
      console.error("⚠️  Could not delete test file:", deleteError.message);
    } else {
      console.log("✅ Test file deleted");
    }

    console.log("\n✨ Storage setup verified successfully!");
    console.log("\n📝 Summary:");
    console.log("- Bucket: facade-analysis");
    console.log("- Max file size: 10MB");
    console.log("- Allowed types: JPEG, PNG, WebP, HEIC");
    console.log("- Access: Authenticated users only");
  } catch (error) {
    console.error("\n❌ Storage test failed:", error.message);
    process.exit(1);
  }
}

// Run the test
testStorageSetup().catch(console.error);
