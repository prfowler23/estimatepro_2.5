#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔧 Fixing client/server import issues...\n");

// Fix 1: Comment out analytics-service imports in HelpProvider
console.log("1. Fixing HelpProvider analytics imports...");
const helpProviderPath = path.join(
  __dirname,
  "..",
  "components",
  "help",
  "HelpProvider.tsx",
);
if (fs.existsSync(helpProviderPath)) {
  let content = fs.readFileSync(helpProviderPath, "utf8");

  // Comment out the analytics service dynamic imports
  content = content.replace(
    /const analyticsService = new \(\s*await import\("@\/lib\/services\/analytics-service"\)\s*\)\.AnalyticsService\(/g,
    '// TODO: Move to API route\n        // const analyticsService = new (\n        //   await import("@/lib/services/analytics-service")\n        // ).AnalyticsService(',
  );

  // Comment out the analytics calls
  content = content.replace(
    /await analyticsService\.record/g,
    "// await analyticsService.record",
  );

  fs.writeFileSync(helpProviderPath, content);
  console.log("✅ Fixed HelpProvider");
}

// Fix 2: Update analytics-service to not use server modules
console.log("\n2. Fixing analytics-service imports...");
const analyticsServicePath = path.join(
  __dirname,
  "..",
  "lib",
  "services",
  "analytics-service.ts",
);
if (fs.existsSync(analyticsServicePath)) {
  let content = fs.readFileSync(analyticsServicePath, "utf8");

  // Change server import to client-compatible
  content = content.replace(
    'import { createClient } from "@/lib/supabase/server";',
    '// Using client-compatible supabase\nimport { createBrowserClient } from "@supabase/ssr";\nimport type { Database } from "@/types/supabase";\n\nconst createClient = () => createBrowserClient<Database>(\n  process.env.NEXT_PUBLIC_SUPABASE_URL!,\n  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!\n);',
  );

  fs.writeFileSync(analyticsServicePath, content);
  console.log("✅ Fixed analytics-service");
}

console.log("\n✨ Client/server import fixes complete!");
console.log('\n🔍 Run "npm run build" to verify the fixes');
