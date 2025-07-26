#!/usr/bin/env node

/**
 * Test OpenAI Vision API for facade analysis
 */

const OpenAI = require("openai");
require("dotenv").config({ path: ".env.local" });

const openaiKey = process.env.OPENAI_API_KEY;
const visionModel = process.env.AI_VISION_MODEL || "gpt-4-vision-preview";

if (!openaiKey) {
  console.error("❌ Missing OPENAI_API_KEY environment variable");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: openaiKey,
});

async function testVisionAPI() {
  console.log("🔍 Testing OpenAI Vision API for Facade Analysis\n");
  console.log(`📊 Configuration:`);
  console.log(`   - Model: ${visionModel}`);
  console.log(
    `   - API Key: ${openaiKey.substring(0, 10)}...${openaiKey.substring(openaiKey.length - 4)}\n`,
  );

  try {
    // Test with a simple image analysis request
    console.log("🖼️  Testing vision analysis with a sample building image...");

    // Using a small test image URL (a simple building facade)
    const testImageUrl =
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop";

    const response = await openai.chat.completions.create({
      model: visionModel,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "This is a test request. Please confirm you can see the image and provide a very brief (1-2 sentences) description of what you see.",
            },
            {
              type: "image_url",
              image_url: {
                url: testImageUrl,
                detail: "low",
              },
            },
          ],
        },
      ],
      max_tokens: 100,
    });

    console.log("✅ Vision API test successful!");
    console.log(`   - Model used: ${response.model}`);
    console.log(`   - Tokens used: ${response.usage?.total_tokens || "N/A"}`);
    console.log(`   - Response: ${response.choices[0]?.message?.content}\n`);

    // Test facade-specific analysis
    console.log("🏢 Testing facade-specific analysis...");

    const facadeResponse = await openai.chat.completions.create({
      model: visionModel,
      messages: [
        {
          role: "system",
          content:
            "You are an expert at analyzing building facades. This is a test request - provide a brief analysis.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Test: Can you identify the number of floors and primary material of this building? Respond in 1-2 sentences only.",
            },
            {
              type: "image_url",
              image_url: {
                url: testImageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 150,
    });

    console.log("✅ Facade analysis test successful!");
    console.log(
      `   - Response: ${facadeResponse.choices[0]?.message?.content}\n`,
    );

    // Check rate limits
    console.log("📈 Checking API limits...");
    console.log(
      "   - Rate limit headers are not available in completion responses",
    );
    console.log("   - Monitor usage at: https://platform.openai.com/usage\n");

    console.log("✨ OpenAI Vision API is ready for facade analysis!");
    console.log("\n📝 Recommendations:");
    console.log("- Use 'detail: low' for initial processing to save tokens");
    console.log("- Use 'detail: high' only for detailed measurements");
    console.log("- Implement retry logic for rate limits");
    console.log("- Cache results to minimize API calls");
  } catch (error) {
    console.error("\n❌ Vision API test failed:", error.message);

    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Error:", error.response.data?.error?.message);
    }

    console.log("\n💡 Troubleshooting:");
    console.log("1. Verify your OpenAI API key has access to GPT-4 Vision");
    console.log(
      "2. Check your usage limits at https://platform.openai.com/usage",
    );
    console.log("3. Ensure you have billing set up and credits available");
    console.log(
      "4. The model name might be 'gpt-4-vision-preview' or 'gpt-4-turbo'",
    );

    process.exit(1);
  }
}

// Run the test
testVisionAPI().catch(console.error);
