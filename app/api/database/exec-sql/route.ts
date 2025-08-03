// Database SQL Execution API
// Provides secure SQL execution for database management operations

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  sqlExecutionCache,
  getServerCacheKey,
  serverCached,
  rateLimiters,
} from "@/lib/utils/server-cache";

// Request validation schema
const ExecSqlRequestSchema = z.object({
  sql: z.string().min(1).max(10000),
  operation_type: z
    .enum(["index", "schema", "maintenance"])
    .default("maintenance"),
  description: z.string().optional(),
});

// Whitelist of allowed SQL operations for security
const ALLOWED_SQL_PATTERNS = [
  /^CREATE INDEX/i,
  /^DROP INDEX/i,
  /^ALTER TABLE.*ADD INDEX/i,
  /^ANALYZE TABLE/i,
  /^OPTIMIZE TABLE/i,
  /^SHOW INDEX/i,
  /^EXPLAIN/i,
];

function validateSqlSecurity(sql: string): boolean {
  // Check if SQL matches allowed patterns
  return ALLOWED_SQL_PATTERNS.some((pattern) => pattern.test(sql.trim()));
}

async function executeSql(
  supabase: any,
  sql: string,
  operationType: string,
): Promise<any> {
  // Security validation
  if (!validateSqlSecurity(sql)) {
    throw new Error("SQL operation not allowed for security reasons");
  }

  // Use Supabase's rpc function for safe SQL execution
  const { data, error } = await supabase.rpc("execute_sql", {
    query: sql,
  });

  if (error) {
    throw new Error(`SQL execution failed: ${error.message}`);
  }

  return data;
}

async function logSqlExecution(
  supabase: any,
  userId: string,
  sql: string,
  operationType: string,
  result: any,
  description?: string,
) {
  try {
    await supabase.from("sql_execution_log").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      sql_statement: sql,
      operation_type: operationType,
      description: description || `${operationType} operation`,
      result_summary: JSON.stringify({
        success: true,
        affected_rows: result?.length || 0,
      }),
      executed_at: new Date().toISOString(),
    });
  } catch (logError) {
    console.warn("Failed to log SQL execution:", logError);
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting check - very strict for SQL execution
    const userKey = `sql-execution-${user.id}`;
    if (!rateLimiters.sqlExecution.isAllowed(userKey)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    // Check if user has admin privileges
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = ExecSqlRequestSchema.parse(body);

    const result = await executeSql(
      supabase,
      validatedData.sql,
      validatedData.operation_type,
    );

    // Log the execution
    await logSqlExecution(
      supabase,
      user.id,
      validatedData.sql,
      validatedData.operation_type,
      result,
      validatedData.description,
    );

    return NextResponse.json({
      success: true,
      result,
      operation_type: validatedData.operation_type,
      executed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database SQL Execution API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "SQL execution failed",
      },
      { status: 500 },
    );
  }
}

// Cached SQL execution history fetch function
const getCachedSqlExecutionHistory = serverCached(
  sqlExecutionCache,
  (supabase: any, userId: string, operationType: string, limit: number) =>
    getServerCacheKey.sqlExecution(userId, operationType, limit),
  30 * 60 * 1000, // 30 minutes TTL
)(async function _getCachedSqlExecutionHistory(
  supabase: any,
  userId: string,
  operationType: string,
  limit: number,
) {
  let query = supabase
    .from("sql_execution_log")
    .select("*")
    .order("executed_at", { ascending: false })
    .limit(limit);

  if (operationType && operationType !== "all") {
    query = query.eq("operation_type", operationType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch execution history: ${error.message}`);
  }

  return data || [];
});

// GET endpoint to retrieve execution history
async function handleGET(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting check for GET requests
    const userKey = `sql-execution-get-${user.id}`;
    if (!rateLimiters.sqlExecution.isAllowed(userKey)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const operationType = searchParams.get("operation_type") || "all";

    const data = await getCachedSqlExecutionHistory(
      supabase,
      user.id,
      operationType,
      limit,
    );

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
      generated_at: new Date().toISOString(),
      cached: true,
    });
  } catch (error) {
    console.error("Database SQL History API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch history",
      },
      { status: 500 },
    );
  }
}

export const POST = handlePOST;
export const GET = handleGET;
