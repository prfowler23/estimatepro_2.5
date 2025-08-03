// BI Integration API Endpoint
// Provides REST API for managing business intelligence tool integrations

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getExternalBIIntegrationService } from "@/lib/services/external-bi-integration-service";
import { logger } from "@/lib/utils/logger";

// Request validation schemas
const CreateConnectionSchema = z.object({
  name: z.string().min(1, "Connection name is required"),
  type: z.enum([
    "tableau",
    "powerbi",
    "looker",
    "metabase",
    "grafana",
    "superset",
  ]),
  endpoint: z.string().url("Valid endpoint URL is required"),
  credentials: z.object({
    type: z.enum(["api_key", "oauth", "basic_auth", "token"]),
    config: z.record(z.any()),
  }),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
});

const ExportDataSchema = z.object({
  connectionId: z.string(),
  exportType: z.enum(["full", "incremental", "snapshot"]),
  dataSource: z.string(),
  format: z.enum(["json", "csv", "parquet", "sql"]),
  filters: z.record(z.any()).optional(),
  transformations: z.array(z.any()).optional(),
  schedule: z
    .object({
      frequency: z.enum(["hourly", "daily", "weekly", "monthly"]),
      interval: z.number(),
      timeZone: z.string(),
      startTime: z.string(),
    })
    .optional(),
});

const StreamingSetupSchema = z.object({
  connectionId: z.string(),
  streamConfig: z.object({
    webhookUrl: z.string().url(),
    events: z.array(z.string()),
    secret: z.string().optional(),
    batchSize: z.number().optional(),
    bufferTimeout: z.number().optional(),
  }),
});

const EmbedDashboardSchema = z.object({
  connectionId: z.string(),
  dashboardConfig: z.object({
    dashboardId: z.string(),
    reportId: z.string().optional(),
    workbook: z.string().optional(),
    view: z.string().optional(),
    uid: z.string().optional(),
    slug: z.string().optional(),
    token: z.string().optional(),
    groupId: z.string().optional(),
    ticketId: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    showTabs: z.boolean().optional(),
    showToolbar: z.boolean().optional(),
  }),
});

/**
 * GET /api/analytics/bi-integration
 * List all BI connections or get specific connection
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get("connectionId");
    const action = searchParams.get("action");

    const biService = getExternalBIIntegrationService();

    // Get specific connection health
    if (connectionId && action === "health") {
      const health = await biService.getConnectionHealth(connectionId);
      return NextResponse.json({
        success: true,
        data: health,
      });
    }

    // Get all connections (simplified response for listing)
    const { data: connections, error } = await supabase
      .from("bi_connections")
      .select("id, name, type, endpoint, is_active, last_sync, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Enhance with health status for each connection
    const connectionsWithHealth = await Promise.all(
      (connections || []).map(async (conn) => {
        try {
          const health = await biService.getConnectionHealth(conn.id);
          return {
            ...conn,
            healthStatus: {
              isHealthy: health.isHealthy,
              successRate: health.successRate,
              uptime: health.uptime,
              latency: health.latency,
            },
          };
        } catch {
          return {
            ...conn,
            healthStatus: {
              isHealthy: false,
              successRate: 0,
              uptime: 0,
              latency: null,
            },
          };
        }
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        connections: connectionsWithHealth,
        total: connectionsWithHealth.length,
      },
    });
  } catch (error) {
    logger.error("Failed to get BI connections:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get connections",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/analytics/bi-integration
 * Create new BI connection or perform operations
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const biService = getExternalBIIntegrationService();

    switch (action) {
      case "create_connection": {
        const validatedData = CreateConnectionSchema.parse(body.data);

        const connectionId = await biService.createConnection({
          ...validatedData,
          metadata: {
            ...validatedData.metadata,
            userId: user.id,
            createdBy: user.email,
          },
        });

        return NextResponse.json({
          success: true,
          data: { connectionId },
          message: "BI connection created successfully",
        });
      }

      case "test_connection": {
        const { connectionId } = body;
        if (!connectionId) {
          return NextResponse.json(
            { error: "Connection ID is required" },
            { status: 400 },
          );
        }

        const health = await biService.getConnectionHealth(connectionId);

        return NextResponse.json({
          success: true,
          data: {
            isHealthy: health.isHealthy,
            message: health.isHealthy
              ? "Connection is healthy"
              : "Connection test failed",
            details: health,
          },
        });
      }

      case "export_data": {
        const validatedData = ExportDataSchema.parse(body.data);

        const syncId = await biService.exportData(validatedData);

        return NextResponse.json({
          success: true,
          data: { syncId },
          message: "Data export initiated successfully",
        });
      }

      case "setup_streaming": {
        const validatedData = StreamingSetupSchema.parse(body.data);

        const streamId = await biService.setupRealTimeStream(
          validatedData.connectionId,
          validatedData.streamConfig,
        );

        return NextResponse.json({
          success: true,
          data: { streamId },
          message: "Real-time streaming setup completed",
        });
      }

      case "create_embed": {
        const validatedData = EmbedDashboardSchema.parse(body.data);

        const embedUrl = await biService.createEmbeddedDashboard(
          validatedData.connectionId,
          validatedData.dashboardConfig,
        );

        return NextResponse.json({
          success: true,
          data: { embedUrl },
          message: "Embedded dashboard created successfully",
        });
      }

      case "sync_data": {
        const { connectionId, syncConfig } = body;
        if (!connectionId || !syncConfig) {
          return NextResponse.json(
            { error: "Connection ID and sync config are required" },
            { status: 400 },
          );
        }

        await biService.syncData(connectionId, syncConfig);

        return NextResponse.json({
          success: true,
          message: "Data synchronization completed successfully",
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("BI integration API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "BI integration operation failed",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/analytics/bi-integration
 * Update BI connection
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId, updates } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: "Connection ID is required" },
        { status: 400 },
      );
    }

    // Update connection in database
    const { error } = await supabase
      .from("bi_connections")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "BI connection updated successfully",
    });
  } catch (error) {
    logger.error("Failed to update BI connection:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update connection",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/analytics/bi-integration
 * Delete BI connection
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get("connectionId");

    if (!connectionId) {
      return NextResponse.json(
        { error: "Connection ID is required" },
        { status: 400 },
      );
    }

    // Delete connection from database
    const { error } = await supabase
      .from("bi_connections")
      .delete()
      .eq("id", connectionId)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "BI connection deleted successfully",
    });
  } catch (error) {
    logger.error("Failed to delete BI connection:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete connection",
      },
      { status: 500 },
    );
  }
}
