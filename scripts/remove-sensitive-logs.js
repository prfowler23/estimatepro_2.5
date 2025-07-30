#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Patterns that indicate sensitive information
const sensitivePatterns = [
  /console\.(log|error|warn|info)\s*\([^)]*\b(password|token|secret|api[_-]?key|credentials|auth[_-]?token|access[_-]?token|refresh[_-]?token)\b[^)]*\)/gi,
  /console\.(log|error|warn|info)\s*\([^)]*['"`]Authorization['"`]\s*:/gi,
  /console\.(log|error|warn|info)\s*\([^)]*email\s*:\s*[^,)]+@[^,)]+\)/gi,
  /console\.(log|error|warn|info)\s*\([^)]*Bearer\s+[^)]+\)/gi,
];

// Replacement patterns for different types of sensitive data
const replacements = {
  email: (match) => {
    // Replace email with masked version
    return match.replace(
      /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      (fullEmail, localPart, domain) => {
        const masked =
          localPart.charAt(0) + "***" + localPart.charAt(localPart.length - 1);
        return `${masked}@${domain}`;
      },
    );
  },
  token: (match) => {
    // Remove token values but keep the log structure
    return match.replace(
      /['"](Bearer\s+)?[A-Za-z0-9\-._~+\/]+=*['"]/g,
      '"[REDACTED]"',
    );
  },
  general: (match) => {
    // Comment out the entire console.log line
    return `// ${match} // REMOVED: Contains sensitive data`;
  },
};

// Find all TypeScript/TSX files
const files = glob.sync("**/*.{ts,tsx}", {
  cwd: process.cwd(),
  ignore: ["node_modules/**", "dist/**", ".next/**", "scripts/**"],
  absolute: true,
});

let totalUpdated = 0;
let totalInstances = 0;

console.log("🔍 Scanning for sensitive console.log statements...\n");

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  let originalContent = content;
  let fileUpdated = false;
  let instancesInFile = 0;

  // Check each sensitive pattern
  for (const pattern of sensitivePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        instancesInFile++;
        totalInstances++;

        // Determine the type of sensitive data
        let replacement;
        if (match.includes("email")) {
          replacement = replacements.email(match);
        } else if (match.includes("token") || match.includes("Bearer")) {
          replacement = replacements.token(match);
        } else {
          replacement = replacements.general(match);
        }

        content = content.replace(match, replacement);
        fileUpdated = true;
      });
    }
  }

  // Also check for specific problematic patterns
  const specificPatterns = [
    {
      pattern:
        /console\.log\s*\(\s*['"`]Auth state changed:['"`],\s*event,\s*session\?\.user\?\.email\s*\)/g,
      replacement:
        'console.log("Auth state changed:", event, session?.user ? "[user authenticated]" : null)',
    },
    {
      pattern:
        /console\.log\s*\(\s*['"`].*signIn called with email:['"`],\s*email\s*\)/g,
      replacement: 'console.log("🔐 AuthContext: signIn called")',
    },
    {
      pattern: /console\.log\s*\(`Cache.*for user \${userId}`\)/g,
      replacement: (match) => match.replace("${userId}", '"[user]"'),
    },
  ];

  for (const { pattern, replacement } of specificPatterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      fileUpdated = true;
      instancesInFile++;
      totalInstances++;
    }
  }

  if (fileUpdated) {
    fs.writeFileSync(file, content);
    const relativePath = path.relative(process.cwd(), file);
    console.log(
      `✅ ${relativePath} - Removed ${instancesInFile} sensitive log(s)`,
    );
    totalUpdated++;
  }
}

console.log("\n📊 Summary:");
console.log(`   Files updated: ${totalUpdated}`);
console.log(`   Sensitive logs removed: ${totalInstances}`);
console.log(`   Total files scanned: ${files.length}`);

// Also create a lint rule to prevent future issues
const eslintRule = `
// Add this to your .eslintrc.js
module.exports = {
  rules: {
    'no-console': ['warn', {
      allow: ['warn', 'error']
    }],
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.object.name='console'][callee.property.name=/^(log|info)$/] > Literal[value=/password|token|secret|api[_-]?key/i]",
        message: 'Do not log sensitive information'
      }
    ]
  }
};
`;

console.log(
  "\n💡 Recommendation: Add these ESLint rules to prevent future sensitive logging:",
);
console.log(eslintRule);
