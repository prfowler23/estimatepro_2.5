#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔧 Fixing integration-framework.ts...\n");

const filePath = path.join(
  __dirname,
  "..",
  "lib",
  "integrations",
  "integration-framework.ts",
);

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, "utf8");

  // Replace all occurrences of this.supabase with createClient()
  content = content.replace(/this\.supabase/g, "createClient()");

  // Find all async methods that now use createClient() and add const supabase = createClient() at the start
  const methodPatterns = [
    /async (addIntegration|syncAllIntegrations|triggerEvent|updateEventStatus|logWebhookActivity|checkIntegrationHealth)\s*\([^)]*\):[^{]*\{/g,
  ];

  methodPatterns.forEach((pattern) => {
    content = content.replace(pattern, (match) => {
      const methodStart = match.indexOf("{") + 1;
      const beforeBrace = match.substring(0, methodStart);
      const afterBrace = "";

      // Check if it already has const supabase
      if (!match.includes("const supabase")) {
        return (
          beforeBrace + "\n    const supabase = createClient();" + afterBrace
        );
      }
      return match;
    });
  });

  // Fix specific methods that might have multiple createClient() calls
  content = content.replace(/createClient\(\)\./g, "supabase.");

  fs.writeFileSync(filePath, content);
  console.log("✅ Fixed integration-framework.ts");
}

console.log("\n✨ Integration framework fix complete!");
