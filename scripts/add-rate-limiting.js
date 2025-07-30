#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Find all AI route files
const aiRouteFiles = glob.sync("app/api/ai/**/route.ts", {
  cwd: process.cwd(),
  absolute: true,
});

let updatedCount = 0;
let skippedCount = 0;

for (const file of aiRouteFiles) {
  const content = fs.readFileSync(file, "utf8");

  // Check if it already has rate limiting
  if (
    content.includes("generalRateLimiter") ||
    content.includes("aiRateLimiter") ||
    content.includes("withRateLimit")
  ) {
    console.log(
      `✓ ${path.relative(process.cwd(), file)} - already has rate limiting`,
    );
    skippedCount++;
    continue;
  }

  // Check if it's using authenticateRequest (standard pattern)
  if (content.includes("authenticateRequest")) {
    // Find the line after authentication
    const lines = content.split("\n");
    let insertIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (
        lines[i].includes("authenticateRequest") &&
        lines[i + 1] &&
        lines[i + 2]
      ) {
        // Find the closing of the auth check
        for (let j = i; j < Math.min(i + 10, lines.length); j++) {
          if (lines[j].includes("}")) {
            insertIndex = j + 1;
            break;
          }
        }
        break;
      }
    }

    if (insertIndex > 0) {
      // Add import if not present
      if (!content.includes("import { generalRateLimiter }")) {
        const importIndex = lines.findIndex((line) =>
          line.includes('from "@/lib/api/error-responses"'),
        );
        if (importIndex > 0) {
          lines.splice(
            importIndex,
            0,
            'import { generalRateLimiter } from "@/lib/utils/rate-limit";',
          );
        }
      }

      // Add rate limiting code
      const rateLimitCode = `
    // Apply rate limiting
    const rateLimitResult = await generalRateLimiter(request);
    if (!rateLimitResult.allowed) {
      return ErrorResponses.rateLimitExceeded();
    }`;

      lines.splice(insertIndex, 0, rateLimitCode);

      const updatedContent = lines.join("\n");
      fs.writeFileSync(file, updatedContent);
      console.log(
        `✅ ${path.relative(process.cwd(), file)} - added rate limiting`,
      );
      updatedCount++;
    } else {
      console.log(
        `⚠️  ${path.relative(process.cwd(), file)} - couldn't find insertion point`,
      );
    }
  } else {
    console.log(
      `⚠️  ${path.relative(process.cwd(), file)} - doesn't use standard auth pattern`,
    );
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Updated: ${updatedCount} files`);
console.log(`   Skipped: ${skippedCount} files (already have rate limiting)`);
console.log(
  `   Manual review needed: ${aiRouteFiles.length - updatedCount - skippedCount} files`,
);

// List files that need manual review
console.log(`\n📝 Files needing manual rate limiting implementation:`);
for (const file of aiRouteFiles) {
  const content = fs.readFileSync(file, "utf8");
  if (
    !content.includes("generalRateLimiter") &&
    !content.includes("aiRateLimiter") &&
    !content.includes("withRateLimit") &&
    !content.includes("authenticateRequest")
  ) {
    console.log(`   - ${path.relative(process.cwd(), file)}`);
  }
}
