import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Health check endpoint for monitoring and deployment verification
 */

export async function GET(request: NextRequest) {
  const start = Date.now();
  const checks: Record<string, any> = {};

  try {
    // Basic application health
    checks.status = "healthy";
    checks.timestamp = new Date().toISOString();
    checks.uptime = process.uptime();
    checks.environment = process.env.NODE_ENV;
    checks.version = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

    // Database connection check
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);

      if (error) {
        checks.database = {
          status: "unhealthy",
          error: error.message,
          latency: Date.now() - start,
        };
      } else {
        checks.database = {
          status: "healthy",
          latency: Date.now() - start,
        };
      }
    } catch (error) {
      checks.database = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        latency: Date.now() - start,
      };
    }

    // Environment variables check
    const requiredEnvVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENAI_API_KEY",
      "RESEND_API_KEY",
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar],
    );

    checks.environment_variables = {
      status: missingEnvVars.length === 0 ? "healthy" : "unhealthy",
      missing: missingEnvVars,
      total_required: requiredEnvVars.length,
      available: requiredEnvVars.length - missingEnvVars.length,
    };

    // Memory usage check
    if (typeof process !== "undefined" && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      checks.memory = {
        status: "healthy",
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        unit: "MB",
      };

      // Flag high memory usage
      if (memUsage.heapUsed > 500 * 1024 * 1024) {
        // 500MB
        checks.memory.status = "warning";
        checks.memory.warning = "High memory usage detected";
      }
    }

    // Overall health determination
    const allChecksHealthy = Object.values(checks).every((check) => {
      return typeof check !== "object" || check.status === "healthy";
    });

    const responseTime = Date.now() - start;
    const overallStatus = allChecksHealthy ? "healthy" : "unhealthy";

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      response_time: responseTime,
      checks,
    };

    // Return appropriate status code
    const statusCode = overallStatus === "healthy" ? 200 : 503;

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Handle unexpected errors
    const errorResponse = {
      status: "error",
      timestamp: new Date().toISOString(),
      response_time: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
      checks,
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Type": "application/json",
      },
    });
  }
}

// Also support HEAD requests for simple health checks
export async function HEAD(request: NextRequest) {
  try {
    // Quick health check without detailed response
    const supabase = createClient();
    await supabase.from("profiles").select("id").limit(1);

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }
}
