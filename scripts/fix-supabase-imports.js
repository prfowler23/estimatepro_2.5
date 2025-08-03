#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const glob = require("glob");

console.log("🔧 Fixing Supabase client imports...\n");

// Find all TypeScript files
const files = glob.sync("**/*.ts", {
  ignore: ["node_modules/**", ".next/**", "dist/**"],
});

let fixedCount = 0;

files.forEach((file) => {
  let content = fs.readFileSync(file, "utf8");
  let modified = false;

  // Check if file is in API routes
  const isApiRoute = file.includes("/app/api/") || file.includes("/pages/api/");

  // Check if file imports from universal-client
  if (content.includes("@/lib/supabase/universal-client")) {
    // For API routes, we should use server client
    if (isApiRoute) {
      content = content.replace(
        /import\s*{\s*createClient\s*}\s*from\s*["']@\/lib\/supabase\/universal-client["'];?/g,
        'import { createClient } from "@/lib/supabase/server";',
      );
      modified = true;
    }
  }

  // Fix direct supabase-js imports in services
  if (
    content.includes("@supabase/supabase-js") &&
    !file.includes("/lib/supabase/")
  ) {
    // Services should use our server client
    content = content.replace(
      /import\s*{\s*createClient\s*}\s*from\s*["']@supabase\/supabase-js["'];?/g,
      'import { createClient } from "@/lib/supabase/server";',
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`✅ Fixed imports in ${file}`);
    fixedCount++;
  }
});

console.log(`\n✨ Fixed ${fixedCount} files!`);
console.log('\n🔍 Run "npm run build" to verify the fixes');
