#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔧 Fixing audit system imports...\n");

const filesToFix = [
  "app/api/audit/compliance/route.ts",
  "app/api/integrations/webhooks/receive/route.ts",
  "lib/integrations/webhook-system.ts",
  "lib/audit/audit-middleware.ts",
];

filesToFix.forEach((file) => {
  const filePath = path.join(__dirname, "..", file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // Fix the import
  if (
    content.includes('import { auditSystem } from "@/lib/audit/audit-system";')
  ) {
    content = content.replace(
      'import { auditSystem } from "@/lib/audit/audit-system";',
      'import { AuditSystem } from "@/lib/audit/audit-system";',
    );
    modified = true;
  }

  // Add getInstance() call before first usage of auditSystem
  const auditSystemUsageRegex =
    /(\s+)(const\s+\w+\s*=\s*await\s+)?auditSystem\./;
  const firstUsage = content.match(auditSystemUsageRegex);

  if (firstUsage) {
    // Find the beginning of the function/block containing the first usage
    const beforeUsage = content.substring(0, firstUsage.index);
    const functionStart = beforeUsage.lastIndexOf("try {");

    if (functionStart !== -1) {
      // Insert getInstance after try {
      const insertPosition = functionStart + 5; // After "try {"
      content =
        content.substring(0, insertPosition) +
        "\n    const auditSystem = AuditSystem.getInstance();" +
        content.substring(insertPosition);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${file}`);
  } else {
    console.log(`ℹ️  No changes needed for ${file}`);
  }
});

console.log("\n✨ Audit system import fixes complete!");
