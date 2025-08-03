const fs = require("fs");
const path = require("path");

// Fix the database-query-optimization.ts file
const filePath = path.join(
  __dirname,
  "../lib/utils/database-query-optimization.ts",
);
let content = fs.readFileSync(filePath, "utf8");

// Fix the interface to allow for flexible data return
const interfaceFix = `interface OptimizedQueryResult<T> {
  data: T;
  metadata: {
    executionTime: number;
    rowCount: number;
    cacheHit: boolean;
    optimizations: string[];
  };
}`;

content = content.replace(
  /interface OptimizedQueryResult<T>[\s\S]*?\n}/,
  interfaceFix,
);

// Fix parameter types
content = content.replace(/\((a|acc|event|estimate): any\)/g, "($1: any)");

// Fix the return types to match the expected structure
content = content.replace(
  /export async function getOptimizedHelpAnalytics\([^)]+\): Promise<OptimizedQueryResult<any>>/,
  "export async function getOptimizedHelpAnalytics(\n  supabase: any,\n  workflowId: string | null,\n  timeframe: string,\n  options: QueryOptimizationOptions = {},\n): Promise<OptimizedQueryResult<{ data: any; metrics: any; timeframe: string }>>",
);

content = content.replace(
  /export async function getOptimizedEventMetrics\([^)]+\): Promise<OptimizedQueryResult<any>>/,
  "export async function getOptimizedEventMetrics(\n  supabase: any,\n  userId?: string,\n  eventName?: string,\n  days: number = 30,\n  options: QueryOptimizationOptions = {},\n): Promise<OptimizedQueryResult<{\n  total_events: number;\n  event_counts: { [k: string]: number };\n  daily_activity: { date: string; count: number }[];\n  total_value: number;\n  unique_event_types: number;\n  period_days: number;\n}>>",
);

// Fix other function signatures
content = content.replace(
  /export async function getOptimizedEstimateDetails\([^)]+\): Promise<OptimizedQueryResult<any>>/,
  "export async function getOptimizedEstimateDetails(\n  supabase: any,\n  estimateId: string,\n  options: QueryOptimizationOptions = {},\n): Promise<OptimizedQueryResult<{\n  estimate: any;\n  services: any;\n  summary: any;\n}>>",
);

// Write the fixed content
fs.writeFileSync(filePath, content);

console.log("Fixed database-query-optimization.ts type errors");
