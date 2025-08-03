#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔧 Fixing remaining audit system usages...\n");

// Fix audit-middleware.ts
const middlewarePath = path.join(
  __dirname,
  "..",
  "lib",
  "audit",
  "audit-middleware.ts",
);
if (fs.existsSync(middlewarePath)) {
  let content = fs.readFileSync(middlewarePath, "utf8");

  // Find all instances of auditSystem. and add getInstance if needed
  const lines = content.split("\n");
  let modified = false;
  let auditSystemDeclared = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line contains auditSystem.
    if (line.includes("auditSystem.") && !auditSystemDeclared) {
      // Find the enclosing function
      let functionStartLine = -1;
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].includes("async") || lines[j].includes("function")) {
          functionStartLine = j;
          break;
        }
      }

      if (functionStartLine >= 0) {
        // Find the opening brace
        let braceFound = false;
        for (let j = functionStartLine; j < i; j++) {
          if (lines[j].includes("{")) {
            // Insert getInstance on the next line
            lines.splice(
              j + 1,
              0,
              "    const auditSystem = AuditSystem.getInstance();",
            );
            auditSystemDeclared = true;
            modified = true;
            i++; // Adjust index due to insertion
            break;
          }
        }
      }
    }

    // Reset declaration flag on function boundaries
    if (line.includes("async") || line.includes("function")) {
      auditSystemDeclared = false;
    }
  }

  if (modified) {
    fs.writeFileSync(middlewarePath, lines.join("\n"));
    console.log("✅ Fixed audit-middleware.ts");
  }
}

console.log("\n✨ Remaining audit fixes complete!");
