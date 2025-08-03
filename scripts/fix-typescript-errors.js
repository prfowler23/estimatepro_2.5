#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔧 Fixing TypeScript errors for Next.js 15 compatibility...\n");

// Fix 1: AI Analytics Service - Fix filter type inference
console.log("1. Fixing AI Analytics Service filter type inference...");
const analyticsPath = path.join(
  __dirname,
  "..",
  "lib",
  "ai",
  "analytics",
  "ai-analytics-service.ts",
);
let analyticsContent = fs.readFileSync(analyticsPath, "utf8");

// Fix the filter(Boolean) issue by providing explicit type
analyticsContent = analyticsContent.replace(
  "data?.map((d) => d.conversation_id).filter(Boolean)",
  "data?.map((d) => d.conversation_id).filter((id): id is string => Boolean(id))",
);

// Fix line 226 as well
analyticsContent = analyticsContent.replace(
  "data?.map((d) => d.endpoint).filter(Boolean)",
  "data?.map((d) => d.endpoint).filter((endpoint): endpoint is string => Boolean(endpoint))",
);

fs.writeFileSync(analyticsPath, analyticsContent);
console.log("✅ Fixed AI Analytics Service");

// Fix 2: Logger - Fix spread operator on console methods
console.log("\n2. Fixing logger spread operator issue...");
const loggerPath = path.join(__dirname, "..", "lib", "utils", "logger.ts");
let loggerContent = fs.readFileSync(loggerPath, "utf8");

// Replace all instances of spread operator with proper handling
loggerContent = loggerContent.replace(
  /console\.(info|warn|error|debug)\(\.\.\.args\)/g,
  "console.$1(...(args as Parameters<typeof console.$1>))",
);

// Also fix the log method parameters
loggerContent = loggerContent.replace(
  "private log(level: LogLevel, message: string, ...args: any[]): void {",
  "private log(level: LogLevel, message: string, ...args: unknown[]): void {",
);

// Fix info, warn, error, debug method signatures
loggerContent = loggerContent.replace(
  /info\(message: string, \.\.\.args: any\[\]\)/g,
  "info(message: string, ...args: unknown[])",
);
loggerContent = loggerContent.replace(
  /warn\(message: string, \.\.\.args: any\[\]\)/g,
  "warn(message: string, ...args: unknown[])",
);
loggerContent = loggerContent.replace(
  /error\(message: string, \.\.\.args: any\[\]\)/g,
  "error(message: string, ...args: unknown[])",
);
loggerContent = loggerContent.replace(
  /debug\(message: string, \.\.\.args: any\[\]\)/g,
  "debug(message: string, ...args: unknown[])",
);

fs.writeFileSync(loggerPath, loggerContent);
console.log("✅ Fixed logger");

// Fix 3: Next.js Config - Import issues
console.log("\n3. Fixing Next.js config import issues...");
const nextConfigPath = path.join(__dirname, "..", "next.config.mjs");
let nextConfigContent = fs.readFileSync(nextConfigPath, "utf8");

// Ensure proper module exports
if (!nextConfigContent.includes("export default")) {
  nextConfigContent = nextConfigContent.replace(
    "module.exports = nextConfig;",
    "export default nextConfig;",
  );
}

fs.writeFileSync(nextConfigPath, nextConfigContent);
console.log("✅ Fixed Next.js config");

// Fix 4: API Route exports
console.log("\n4. Adding missing exports to API routes...");

// AI Assistant route - already has POST export
// Drone operations route
const droneRoutePath = path.join(
  __dirname,
  "..",
  "app",
  "api",
  "drone",
  "operations",
  "route.ts",
);
if (fs.existsSync(droneRoutePath)) {
  let droneContent = fs.readFileSync(droneRoutePath, "utf8");
  if (!droneContent.includes("export async function GET")) {
    // Add GET export if missing
    droneContent += `
export async function GET(request: NextRequest) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}`;
    fs.writeFileSync(droneRoutePath, droneContent);
  }
}

// Health route
const healthRoutePath = path.join(
  __dirname,
  "..",
  "app",
  "api",
  "health",
  "route.ts",
);
if (fs.existsSync(healthRoutePath)) {
  let healthContent = fs.readFileSync(healthRoutePath, "utf8");
  if (!healthContent.includes("export async function POST")) {
    healthContent += `
export async function POST(request: NextRequest) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}`;
    fs.writeFileSync(healthRoutePath, healthContent);
  }
}

// Quotes route
const quotesRoutePath = path.join(
  __dirname,
  "..",
  "app",
  "api",
  "quotes",
  "route.ts",
);
if (fs.existsSync(quotesRoutePath)) {
  let quotesContent = fs.readFileSync(quotesRoutePath, "utf8");
  if (!quotesContent.includes("export async function GET")) {
    quotesContent += `
export async function GET(request: NextRequest) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}`;
    fs.writeFileSync(quotesRoutePath, quotesContent);
  }
}

console.log("✅ Added missing route exports");

console.log("\n✨ TypeScript fixes complete!");
console.log('\n🔍 Run "npm run typecheck" to verify all errors are resolved');
