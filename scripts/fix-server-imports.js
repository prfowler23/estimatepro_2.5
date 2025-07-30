#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Files that need to be fixed
const filesToFix = [
  "lib/services/estimate-service.ts",
  "lib/analytics/enhanced-analytics-service.ts",
  "lib/services/calculator-service.ts",
  "lib/services/ai-service.ts",
  "lib/services/facade-analysis-service.ts",
  "lib/services/photo-service.ts",
  "lib/services/session-recovery-service.ts",
];

// Fix imports in service files
filesToFix.forEach((file) => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, "utf8");

    // Replace client import with server import
    content = content.replace(
      'import { supabase } from "@/lib/supabase/client";',
      'import { createClient } from "@/lib/supabase/server";',
    );

    // Add const supabase = createClient(); at the beginning of class methods
    // This is a temporary fix - proper fix would be to pass client as parameter
    content = content.replace(/async\s+(\w+)\s*\([^)]*\)\s*{/g, (match) => {
      return match + "\n    const supabase = createClient();";
    });

    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${file}`);
  }
});

console.log("Server import fixes complete");
