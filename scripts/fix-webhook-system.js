#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔧 Fixing webhook-system.ts...\n");

const filePath = path.join(
  __dirname,
  "..",
  "lib",
  "integrations",
  "webhook-system.ts",
);

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, "utf8");

  // Replace all occurrences of this.supabase with createClient()
  content = content.replace(/this\.supabase/g, "createClient()");

  // Update the loadActiveWebhooks method to create client
  content = content.replace(
    /async loadActiveWebhooks\(\): Promise<void> {/,
    `async loadActiveWebhooks(): Promise<void> {
    const supabase = createClient();`,
  );

  // Fix the loadActiveWebhooks method - find and add supabase const
  const loadActiveWebhooksPattern =
    /async loadActiveWebhooks\(\): Promise<void> {\s*try {/;
  if (loadActiveWebhooksPattern.test(content)) {
    content = content.replace(
      loadActiveWebhooksPattern,
      `async loadActiveWebhooks(): Promise<void> {
    try {
      const supabase = createClient();`,
    );
  }

  // Update methods that use supabase directly
  const methodsToFix = [
    "registerWebhook",
    "updateWebhook",
    "deleteWebhook",
    "scheduleDelivery",
    "updateDeliveryStatus",
    "updateWebhookStats",
    "getWebhooks",
    "getWebhookDeliveries",
    "getWebhookStats",
    "generateComplianceReport",
    "purgeExpiredEvents",
    "exportUserData",
    "anonymizeUserData",
    "storeComplianceViolation",
    "triggerSecurityAlert",
  ];

  methodsToFix.forEach((methodName) => {
    // Look for method signature and add const supabase = createClient();
    const methodPattern = new RegExp(
      `async ${methodName}\\([^)]*\\):[^{]+{\\s*(?!const supabase)`,
      "g",
    );

    content = content.replace(methodPattern, (match) => {
      // Check if it already has const supabase
      if (!match.includes("const supabase")) {
        return match + "\n    const supabase = createClient();";
      }
      return match;
    });
  });

  fs.writeFileSync(filePath, content);
  console.log("✅ Fixed webhook-system.ts");
}

console.log("\n✨ Webhook system fix complete!");
