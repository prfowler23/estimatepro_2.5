#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Read the TypeScript error log
const errorLogPath = path.join(__dirname, "..", "typescript-errors.log");

if (!fs.existsSync(errorLogPath)) {
  console.error(
    "Error: typescript-errors.log not found. Please run: npm run typecheck 2>&1 | tee typescript-errors.log",
  );
  process.exit(1);
}

const logContent = fs.readFileSync(errorLogPath, "utf8");
const lines = logContent.split("\n");

// Error categories
const categories = {
  typeAssignment: {
    pattern: /error TS2322:/,
    description: "Type assignment errors",
    errors: [],
  },
  propertyMissing: {
    pattern: /error TS2339:/,
    description: "Property does not exist",
    errors: [],
  },
  propertyRequired: {
    pattern: /error TS2741:/,
    description: "Property is missing in type",
    errors: [],
  },
  argumentType: {
    pattern: /error TS2345:/,
    description: "Argument type mismatch",
    errors: [],
  },
  possiblyUndefined: {
    pattern: /error TS18048:/,
    description: "Value is possibly undefined",
    errors: [],
  },
  moduleNotFound: {
    pattern: /error TS2307:/,
    description: "Module not found",
    errors: [],
  },
  noExportedMember: {
    pattern: /error TS2305:/,
    description: "Module has no exported member",
    errors: [],
  },
  typeConversion: {
    pattern: /error TS2352:/,
    description: "Type conversion issues",
    errors: [],
  },
  literalMismatch: {
    pattern: /error TS2353:/,
    description: "Object literal property issues",
    errors: [],
  },
  notComparable: {
    pattern: /error TS2678:/,
    description: "Types not comparable",
    errors: [],
  },
  noOverloadMatch: {
    pattern: /error TS2769:/,
    description: "No overload matches call",
    errors: [],
  },
  implicitAny: {
    pattern: /error TS7006:|error TS7031:/,
    description: "Implicit any type",
    errors: [],
  },
  importConflict: {
    pattern: /error TS2865:/,
    description: "Import conflicts",
    errors: [],
  },
  readOnlyProperty: {
    pattern: /error TS2540:/,
    description: "Cannot assign to read-only property",
    errors: [],
  },
  typeOf: {
    pattern: /error TS18046:/,
    description: "Type of value is unknown",
    errors: [],
  },
  other: {
    pattern: null,
    description: "Other errors",
    errors: [],
  },
};

// Parse errors
let currentError = null;
lines.forEach((line) => {
  // Check if this is an error line
  const errorMatch = line.match(/^(.+)\((\d+),(\d+)\): (error TS\d+): (.+)$/);

  if (errorMatch) {
    const [, filePath, line, column, errorCode, message] = errorMatch;
    currentError = {
      file: filePath,
      line: parseInt(line),
      column: parseInt(column),
      code: errorCode,
      message: message,
      fullError: line,
    };

    // Categorize the error
    let categorized = false;
    for (const [key, category] of Object.entries(categories)) {
      if (category.pattern && category.pattern.test(errorCode)) {
        category.errors.push(currentError);
        categorized = true;
        break;
      }
    }

    if (!categorized) {
      categories.other.errors.push(currentError);
    }
  }
});

// Analyze by file
const errorsByFile = {};
lines.forEach((line) => {
  const errorMatch = line.match(/^(.+)\((\d+),(\d+)\): error TS\d+:/);
  if (errorMatch) {
    const filePath = errorMatch[1];
    errorsByFile[filePath] = (errorsByFile[filePath] || 0) + 1;
  }
});

// Sort files by error count
const sortedFiles = Object.entries(errorsByFile)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 20); // Top 20 files

// Generate report
console.log("=== TypeScript Error Analysis Report ===\n");

// Total errors
const totalErrors = Object.values(categories).reduce(
  (sum, cat) => sum + cat.errors.length,
  0,
);
console.log(`Total Errors: ${totalErrors}\n`);

// Category breakdown
console.log("Error Categories:");
console.log("-".repeat(60));
for (const [key, category] of Object.entries(categories)) {
  if (category.errors.length > 0) {
    const percentage = ((category.errors.length / totalErrors) * 100).toFixed(
      1,
    );
    console.log(
      `${category.description.padEnd(35)} ${category.errors.length.toString().padStart(4)} (${percentage}%)`,
    );
  }
}

// Top files with errors
console.log("\n\nTop 20 Files with Most Errors:");
console.log("-".repeat(60));
sortedFiles.forEach(([file, count]) => {
  const shortPath = file.replace(/^.*\/estimatepro\//, "");
  console.log(`${shortPath.padEnd(50)} ${count.toString().padStart(4)}`);
});

// Most common error patterns
console.log("\n\nMost Common Error Patterns:");
console.log("-".repeat(60));

// Extract common patterns
const patterns = {
  "Property does not exist": /Property '(.+)' does not exist on type/,
  "Type not assignable": /Type '(.+)' is not assignable to type '(.+)'/,
  "Property missing": /Property '(.+)' is missing in type/,
  "Possibly undefined": /'(.+)' is possibly 'undefined'/,
  "No overload matches": /No overload matches this call/,
};

const patternCounts = {};
lines.forEach((line) => {
  for (const [name, pattern] of Object.entries(patterns)) {
    if (pattern.test(line)) {
      patternCounts[name] = (patternCounts[name] || 0) + 1;
    }
  }
});

Object.entries(patternCounts)
  .sort(([, a], [, b]) => b - a)
  .forEach(([pattern, count]) => {
    console.log(`${pattern.padEnd(35)} ${count.toString().padStart(4)}`);
  });

// Module-specific analysis
console.log("\n\nErrors by Module Type:");
console.log("-".repeat(60));

const moduleTypes = {
  components: 0,
  hooks: 0,
  lib: 0,
  app: 0,
  types: 0,
  other: 0,
};

for (const [file, count] of Object.entries(errorsByFile)) {
  if (file.includes("/components/")) moduleTypes.components += count;
  else if (file.includes("/hooks/")) moduleTypes.hooks += count;
  else if (file.includes("/lib/")) moduleTypes.lib += count;
  else if (file.includes("/app/")) moduleTypes.app += count;
  else if (file.includes("/types/")) moduleTypes.types += count;
  else moduleTypes.other += count;
}

Object.entries(moduleTypes)
  .sort(([, a], [, b]) => b - a)
  .forEach(([module, count]) => {
    const percentage = ((count / totalErrors) * 100).toFixed(1);
    console.log(
      `${module.padEnd(15)} ${count.toString().padStart(4)} (${percentage}%)`,
    );
  });

// Save detailed report
const detailedReport = {
  summary: {
    totalErrors,
    analyzedAt: new Date().toISOString(),
    categories: Object.entries(categories).map(([key, cat]) => ({
      name: cat.description,
      count: cat.errors.length,
      percentage: ((cat.errors.length / totalErrors) * 100).toFixed(1),
    })),
  },
  errorsByFile,
  topFiles: sortedFiles,
  moduleBreakdown: moduleTypes,
  categories: Object.entries(categories).reduce((acc, [key, cat]) => {
    if (cat.errors.length > 0) {
      acc[key] = {
        description: cat.description,
        count: cat.errors.length,
        examples: cat.errors.slice(0, 3), // First 3 examples
      };
    }
    return acc;
  }, {}),
};

fs.writeFileSync(
  path.join(__dirname, "..", "typescript-error-analysis.json"),
  JSON.stringify(detailedReport, null, 2),
);

console.log("\n\nDetailed analysis saved to: typescript-error-analysis.json");

// Generate fix priority recommendations
console.log("\n\nRecommended Fix Priority:");
console.log("-".repeat(60));
console.log("1. Module not found errors (blocks compilation)");
console.log("2. Type assignment errors in services (core functionality)");
console.log("3. Property missing errors in components (UI functionality)");
console.log("4. Argument type mismatches (function calls)");
console.log("5. Possibly undefined values (runtime safety)");
