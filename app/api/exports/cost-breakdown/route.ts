// Cost Breakdown Export API
// Generates exportable cost breakdown data in various formats

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  costBreakdownCache,
  getServerCacheKey,
  serverCached,
  rateLimiters,
} from "@/lib/utils/server-cache";
import { getOptimizedCostBreakdown } from "@/lib/utils/database-query-optimization";

// Request validation schema
const ExportRequestSchema = z.object({
  estimateId: z.string().uuid(),
  format: z.enum(["json", "csv", "pdf"]).default("json"),
  includeLineItems: z.boolean().default(true),
  includeTaxes: z.boolean().default(true),
  includeMarkup: z.boolean().default(true),
});

interface CostBreakdownData {
  estimate: {
    id: string;
    customer_name: string;
    building_address: string;
    total_amount: number;
    created_at: string;
  };
  services: Array<{
    service_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    markup_percentage?: number;
  }>;
  summary: {
    subtotal: number;
    markup_total: number;
    tax_amount: number;
    final_total: number;
  };
}

async function fetchCostBreakdownData(
  supabase: any,
  estimateId: string,
): Promise<CostBreakdownData> {
  // Use optimized query with single JOIN and calculated fields
  const result = await getOptimizedCostBreakdown(supabase, estimateId);

  return result.data;
}

function formatAsCSV(data: CostBreakdownData): string {
  const lines = [];

  // Header information
  lines.push("Cost Breakdown Export");
  lines.push(`Customer,${data.estimate.customer_name}`);
  lines.push(`Address,${data.estimate.building_address}`);
  lines.push(`Date,${new Date(data.estimate.created_at).toLocaleDateString()}`);
  lines.push("");

  // Services header
  lines.push("Service Name,Quantity,Unit Price,Total Price,Markup %");

  // Services data
  data.services.forEach((service) => {
    lines.push(
      [
        service.service_name,
        service.quantity,
        service.unit_price,
        service.total_price,
        service.markup_percentage || 0,
      ].join(","),
    );
  });

  lines.push("");

  // Summary
  lines.push("Summary");
  lines.push(`Subtotal,$${data.summary.subtotal.toFixed(2)}`);
  lines.push(`Markup Total,$${data.summary.markup_total.toFixed(2)}`);
  lines.push(`Tax Amount,$${data.summary.tax_amount.toFixed(2)}`);
  lines.push(`Final Total,$${data.summary.final_total.toFixed(2)}`);

  return lines.join("\n");
}

// Cached cost breakdown data function
const getCachedCostBreakdownData = serverCached(
  costBreakdownCache,
  (supabase: any, estimateId: string, options: string) =>
    getServerCacheKey.costBreakdown(estimateId, "data", options),
  30 * 60 * 1000, // 30 minutes TTL
)(async function _getCachedCostBreakdownData(
  supabase: any,
  estimateId: string,
  options: string,
) {
  return await fetchCostBreakdownData(supabase, estimateId);
});

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

    // Rate limiting check
    const userKey = `cost-breakdown-${user.id}`;
    if (!rateLimiters.costBreakdown.isAllowed(userKey)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(request.url);
    const rawParams = {
      estimateId: searchParams.get("estimateId"),
      format: searchParams.get("format") || "json",
      includeLineItems: searchParams.get("includeLineItems") !== "false",
      includeTaxes: searchParams.get("includeTaxes") !== "false",
      includeMarkup: searchParams.get("includeMarkup") !== "false",
    };

    const validatedParams = ExportRequestSchema.parse(rawParams);

    // Create options string for cache key
    const options = `${validatedParams.includeLineItems}-${validatedParams.includeTaxes}-${validatedParams.includeMarkup}`;

    const costBreakdownData = await getCachedCostBreakdownData(
      supabase,
      validatedParams.estimateId,
      options,
    );

    // Filter data based on options
    if (!validatedParams.includeLineItems) {
      costBreakdownData.services = [];
    }

    if (!validatedParams.includeMarkup) {
      costBreakdownData.services.forEach((service) => {
        delete service.markup_percentage;
      });
      costBreakdownData.summary.markup_total = 0;
    }

    if (!validatedParams.includeTaxes) {
      costBreakdownData.summary.tax_amount = 0;
    }

    // Format response based on requested format
    switch (validatedParams.format) {
      case "csv":
        const csvData = formatAsCSV(costBreakdownData);
        return new NextResponse(csvData, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="cost-breakdown-${validatedParams.estimateId}.csv"`,
          },
        });

      case "pdf":
        // TODO: Implement PDF generation
        return NextResponse.json(
          { error: "PDF export not yet implemented" },
          { status: 501 },
        );

      case "json":
      default:
        return NextResponse.json({
          success: true,
          format: validatedParams.format,
          data: costBreakdownData,
          exported_at: new Date().toISOString(),
        });
    }
  } catch (error) {
    console.error("Cost Breakdown Export API error:", error);

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
        error:
          error instanceof Error
            ? error.message
            : "Cost breakdown export failed",
      },
      { status: 500 },
    );
  }
}

export const GET = handleGET;
