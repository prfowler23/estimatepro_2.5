import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  productionConfig,
  validateProductionConfig,
} from "@/lib/ai/deployment/production-config";
import { aiFallbackService } from "@/lib/ai/ai-fallback-service";
import { aiGracefulDegradation } from "@/lib/ai/ai-graceful-degradation";
import { getAIConfig } from "@/lib/ai/ai-config";

/**
 * Health check endpoint for monitoring and deployment verification
 */

export async function GET(request: NextRequest) {
  const start = Date.now();

  try {
    // Public health endpoint - returns minimal information
    // For detailed health information, use /api/health/secure

    // Basic health check
    const response = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    };

    // In development, return early if environment variables aren't loaded yet
    if (
      process.env.NODE_ENV === "development" &&
      (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ) {
      return NextResponse.json(
        {
          status: "initializing",
          message: "Environment variables loading",
          checks,
        },
        { status: 200 },
      );
    }

    // Database connection check
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);

      if (error) {
        // Log detailed error server-side
        console.error("Database health check failed:", error);

        checks.database = {
          status: "unhealthy",
          error: "Database connection failed",
          latency: Date.now() - start,
        };
      } else if (!data || data.length === 0) {
        checks.database = {
          status: "unhealthy",
          error: "Database query returned no data",
          latency: Date.now() - start,
        };
      } else {
        checks.database = {
          status: "healthy",
          latency: Date.now() - start,
        };
      }
    } catch (error) {
      // Log detailed error server-side
      console.error("Database health check error:", error);

      checks.database = {
        status: "unhealthy",
        error: "Database health check failed",
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

    // AI Service health check
    try {
      const aiConfig = getAIConfig();
      const isConfigured = aiConfig.isAIAvailable();

      if (!isConfigured) {
        checks.ai_service = {
          status: "unhealthy",
          error: "AI service not configured",
        };
      } else {
        // Get model health status
        const modelHealth = aiFallbackService.getModelHealthStatus();
        const degradationLevel = aiGracefulDegradation.getDegradationLevel();

        // Determine AI health status
        const healthyModels = Object.values(modelHealth).filter(
          (health: any) => health.available,
        ).length;
        const totalModels = Object.keys(modelHealth).length;

        checks.ai_service = {
          status:
            healthyModels === totalModels && degradationLevel.level === "full"
              ? "healthy"
              : healthyModels > 0
                ? "degraded"
                : "unhealthy",
          degradation_level: degradationLevel.level,
          models: modelHealth,
          features: degradationLevel.features,
        };
      }
    } catch (error) {
      checks.ai_service = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Configuration validation
    try {
      const configValidation = validateProductionConfig();
      checks.configuration = {
        status: configValidation.valid ? "healthy" : "unhealthy",
        errors: configValidation.errors,
        warnings: configValidation.warnings,
        environment: productionConfig.getConfig().deployment.environment,
        features: productionConfig.getConfig().features,
      };
    } catch (error) {
      checks.configuration = {
        status: "unhealthy",
        error:
          error instanceof Error
            ? error.message
            : "Configuration validation failed",
      };
    }

    // Overall health determination
    const allChecksHealthy = Object.values(checks).every((check) => {
      return (
        typeof check !== "object" ||
        check.status === "healthy" ||
        (check.status === "degraded" && typeof check === "object")
      );
    });

    const hasUnhealthyCheck = Object.values(checks).some((check) => {
      return typeof check === "object" && check.status === "unhealthy";
    });

    const responseTime = Date.now() - start;
    const overallStatus = hasUnhealthyCheck
      ? "unhealthy"
      : !allChecksHealthy
        ? "degraded"
        : "healthy";

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
    const supabase = createAdminClient();
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
