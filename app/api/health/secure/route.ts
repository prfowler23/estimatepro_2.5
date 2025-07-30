import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/server";
import { ErrorResponses } from "@/lib/api/error-responses";

/**
 * Secure health check endpoint - requires authentication
 * Returns detailed health information for monitoring
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request - only allow authenticated users
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return ErrorResponses.unauthorized(authError || "Unauthorized");
    }

    // Additional check: only allow admin users or monitoring service
    const isAdmin = user.email?.endsWith("@estimatepro.com") || false;
    const isMonitoringService =
      request.headers.get("x-monitoring-key") === process.env.MONITORING_KEY;

    if (!isAdmin && !isMonitoringService) {
      return ErrorResponses.forbidden("Access denied");
    }

    // Return detailed health information
    const checks = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
      database: await checkDatabase(),
      ai_service: await checkAIService(),
      memory: getMemoryUsage(),
    };

    return NextResponse.json(checks);
  } catch (error) {
    return ErrorResponses.internalError("Health check failed");
  }
}

async function checkDatabase() {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);

    return {
      status: error ? "unhealthy" : "healthy",
      message: error ? "Database connection failed" : "Connected",
    };
  } catch {
    return { status: "unhealthy", message: "Database check failed" };
  }
}

async function checkAIService() {
  try {
    const { getAIConfig } = await import("@/lib/ai/ai-config");
    const aiConfig = getAIConfig();
    const isAvailable = aiConfig.isAIAvailable();

    return {
      status: isAvailable ? "healthy" : "unhealthy",
      configured: isAvailable,
    };
  } catch {
    return { status: "unhealthy", configured: false };
  }
}

function getMemoryUsage() {
  if (typeof process !== "undefined" && process.memoryUsage) {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      unit: "MB",
    };
  }
  return { status: "unavailable" };
}
