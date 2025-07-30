#!/usr/bin/env node
/**
 * Script to audit and add Zod validation to API endpoints
 */

const fs = require("fs").promises;
const path = require("path");
const glob = require("glob").globSync;

// Find all route.ts files in the api directory
async function findAPIRoutes() {
  const apiPath = path.join(process.cwd(), "app", "api");
  const files = glob("**/route.ts", { cwd: apiPath });
  return files.map((f) => path.join(apiPath, f));
}

// Check if a file already has Zod validation
async function hasZodValidation(filePath) {
  const content = await fs.readFile(filePath, "utf-8");
  return content.includes('from "zod"') || content.includes("from 'zod'");
}

// Analyze endpoint to determine needed validation
async function analyzeEndpoint(filePath) {
  const content = await fs.readFile(filePath, "utf-8");
  const relativePath = path.relative(process.cwd(), filePath);

  const analysis = {
    path: relativePath,
    hasZod: await hasZodValidation(filePath),
    methods: [],
    needsValidation: false,
  };

  // Check for HTTP methods
  if (content.includes("export async function GET")) {
    analysis.methods.push("GET");
    // Check if GET has query params
    if (
      content.includes("searchParams") ||
      content.includes("URLSearchParams")
    ) {
      analysis.needsValidation = true;
    }
  }

  if (content.includes("export async function POST")) {
    analysis.methods.push("POST");
    analysis.needsValidation = true;
  }

  if (content.includes("export async function PUT")) {
    analysis.methods.push("PUT");
    analysis.needsValidation = true;
  }

  if (content.includes("export async function PATCH")) {
    analysis.methods.push("PATCH");
    analysis.needsValidation = true;
  }

  if (content.includes("export async function DELETE")) {
    analysis.methods.push("DELETE");
    // Check if DELETE has params
    if (content.includes("params") || content.includes("searchParams")) {
      analysis.needsValidation = true;
    }
  }

  return analysis;
}

// Generate validation schema suggestion based on endpoint path
function suggestSchema(endpointPath) {
  const suggestions = [];

  // Analyze path segments
  if (endpointPath.includes("ai/")) {
    suggestions.push(
      "- Request body with prompt/message field (string, max 4000 chars)",
    );
    suggestions.push("- Optional context object");
    suggestions.push("- Optional model selection");
  }

  if (endpointPath.includes("analytics")) {
    suggestions.push("- Date range filters (startDate, endDate)");
    suggestions.push("- Pagination params (page, limit)");
    suggestions.push("- Optional userId filter");
  }

  if (endpointPath.includes("photos") || endpointPath.includes("upload")) {
    suggestions.push("- File validation (size, type, name)");
    suggestions.push("- Optional metadata");
  }

  if (endpointPath.includes("estimates")) {
    suggestions.push("- Customer information validation");
    suggestions.push("- Service details validation");
    suggestions.push("- Pricing validation");
  }

  if (endpointPath.includes("[id]")) {
    suggestions.push("- UUID validation for ID parameter");
  }

  if (endpointPath.includes("webhook")) {
    suggestions.push("- URL validation");
    suggestions.push("- Event type validation");
    suggestions.push("- Optional headers validation");
  }

  return suggestions.length > 0
    ? suggestions
    : ["- Analyze endpoint to determine validation needs"];
}

async function main() {
  console.log("🔍 Analyzing API endpoints for Zod validation...\n");

  const routes = await findAPIRoutes();
  const needsValidation = [];
  const hasValidation = [];

  for (const route of routes) {
    const analysis = await analyzeEndpoint(route);

    if (analysis.hasZod) {
      hasValidation.push(analysis);
    } else if (analysis.needsValidation) {
      needsValidation.push(analysis);
    }
  }

  console.log(`✅ Endpoints with Zod validation: ${hasValidation.length}`);
  hasValidation.forEach((endpoint) => {
    console.log(`   - ${endpoint.path} [${endpoint.methods.join(", ")}]`);
  });

  console.log(
    `\n❌ Endpoints needing Zod validation: ${needsValidation.length}`,
  );
  needsValidation.forEach((endpoint) => {
    console.log(`\n   📁 ${endpoint.path}`);
    console.log(`   Methods: ${endpoint.methods.join(", ")}`);
    console.log(`   Suggested validations:`);
    const suggestions = suggestSchema(endpoint.path);
    suggestions.forEach((s) => console.log(`     ${s}`));
  });

  console.log("\n📝 Implementation Guide:");
  console.log("1. Import Zod and validation utilities:");
  console.log("   import { z } from 'zod';");
  console.log(
    "   import { validateRequestBody, validateQueryParams } from '@/lib/validation/api-schemas';",
  );
  console.log("\n2. Define schema for your endpoint");
  console.log("\n3. Use validation helpers in your handler");
  console.log("\n4. Return ErrorResponses.badRequest() for validation errors");

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    totalEndpoints: routes.length,
    withValidation: hasValidation.length,
    needingValidation: needsValidation.length,
    endpoints: needsValidation.map((e) => ({
      path: e.path,
      methods: e.methods,
      suggestions: suggestSchema(e.path),
    })),
  };

  await fs.writeFile(
    "zod-validation-report.json",
    JSON.stringify(report, null, 2),
  );

  console.log("\n📊 Report saved to zod-validation-report.json");
}

main().catch(console.error);
