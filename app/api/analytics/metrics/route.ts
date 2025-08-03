// Analytics Metrics API
// Provides optimized analytics data for dashboard components

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Request validation schema
const AnalyticsRequestSchema = z.object({
  metric: z.enum([
    "monthly_revenue",
    "service_metrics",
    "estimate_trends",
    "conversion_rates",
  ]),
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
  serviceId: z.string().optional(),
});

interface MonthlyRevenue {
  month: string;
  revenue: number;
  estimates: number;
  avgValue: number;
}

interface ServiceMetrics {
  serviceId: string;
  serviceName: string;
  totalRevenue: number;
  completedJobs: number;
  averageValue: number;
  growthRate: number;
}

async function calculateGrowthRate(
  supabase: any,
  serviceId: string,
  periodDays: number,
): Promise<number> {
  try {
    // Get current period data
    const currentStart = new Date(
      Date.now() - periodDays * 24 * 60 * 60 * 1000,
    );
    const currentEnd = new Date();

    // Get previous period data (same length)
    const previousStart = new Date(
      currentStart.getTime() - periodDays * 24 * 60 * 60 * 1000,
    );
    const previousEnd = currentStart;

    const [currentData, previousData] = await Promise.all([
      supabase
        .from("estimate_services")
        .select(`total_price, estimates!inner(status, created_at)`)
        .eq("service_id", serviceId)
        .eq("estimates.status", "accepted")
        .gte("estimates.created_at", currentStart.toISOString())
        .lte("estimates.created_at", currentEnd.toISOString()),

      supabase
        .from("estimate_services")
        .select(`total_price, estimates!inner(status, created_at)`)
        .eq("service_id", serviceId)
        .eq("estimates.status", "accepted")
        .gte("estimates.created_at", previousStart.toISOString())
        .lte("estimates.created_at", previousEnd.toISOString()),
    ]);

    const currentRevenue =
      currentData.data?.reduce(
        (sum: number, item: any) => sum + (item.total_price || 0),
        0,
      ) || 0;
    const previousRevenue =
      previousData.data?.reduce(
        (sum: number, item: any) => sum + (item.total_price || 0),
        0,
      ) || 0;

    if (previousRevenue === 0) return 0;

    return ((currentRevenue - previousRevenue) / previousRevenue) * 100;
  } catch (error) {
    console.warn(
      `Failed to calculate growth rate for service ${serviceId}:`,
      error,
    );
    return 0;
  }
}

async function getMonthlyRevenue(
  supabase: any,
  periodDays: number,
): Promise<MonthlyRevenue[]> {
  const { data, error } = await supabase
    .from("estimates")
    .select(
      `
      created_at,
      total_amount,
      status
    `,
    )
    .gte(
      "created_at",
      new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString(),
    )
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch monthly revenue: ${error.message}`);
  }

  // Group by month and calculate metrics
  const monthlyMap = new Map<string, { revenue: number; estimates: number }>();

  data?.forEach((estimate) => {
    const month = new Date(estimate.created_at).toISOString().slice(0, 7); // YYYY-MM
    const current = monthlyMap.get(month) || { revenue: 0, estimates: 0 };

    current.estimates += 1;
    if (estimate.status === "accepted" && estimate.total_amount) {
      current.revenue += estimate.total_amount;
    }

    monthlyMap.set(month, current);
  });

  return Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    estimates: data.estimates,
    avgValue: data.estimates > 0 ? data.revenue / data.estimates : 0,
  }));
}

async function getServiceMetrics(
  supabase: any,
  periodDays: number,
  serviceId?: string,
): Promise<ServiceMetrics[]> {
  let query = supabase
    .from("estimate_services")
    .select(
      `
      service_id,
      service_name,
      quantity,
      unit_price,
      total_price,
      estimates!inner(status, created_at)
    `,
    )
    .gte(
      "estimates.created_at",
      new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString(),
    );

  if (serviceId) {
    query = query.eq("service_id", serviceId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch service metrics: ${error.message}`);
  }

  // Group by service and calculate metrics
  const serviceMap = new Map<
    string,
    {
      serviceName: string;
      totalRevenue: number;
      completedJobs: number;
    }
  >();

  data?.forEach((service) => {
    const current = serviceMap.get(service.service_id) || {
      serviceName: service.service_name,
      totalRevenue: 0,
      completedJobs: 0,
    };

    if (service.estimates.status === "accepted") {
      current.totalRevenue += service.total_price || 0;
      current.completedJobs += 1;
    }

    serviceMap.set(service.service_id, current);
  });

  const servicesWithGrowth = await Promise.all(
    Array.from(serviceMap.entries()).map(async ([serviceId, data]) => ({
      serviceId,
      serviceName: data.serviceName,
      totalRevenue: data.totalRevenue,
      completedJobs: data.completedJobs,
      averageValue:
        data.completedJobs > 0 ? data.totalRevenue / data.completedJobs : 0,
      growthRate: await calculateGrowthRate(supabase, serviceId, periodDays),
    })),
  );

  return servicesWithGrowth;
}

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

    const { searchParams } = new URL(request.url);
    const rawParams = {
      metric: searchParams.get("metric"),
      period: searchParams.get("period") || "30d",
      serviceId: searchParams.get("serviceId"),
    };

    const validatedParams = AnalyticsRequestSchema.parse(rawParams);

    // Convert period to days
    const periodMap = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "1y": 365,
    };
    const periodDays = periodMap[validatedParams.period];

    let result;

    switch (validatedParams.metric) {
      case "monthly_revenue":
        result = await getMonthlyRevenue(supabase, periodDays);
        break;

      case "service_metrics":
        result = await getServiceMetrics(
          supabase,
          periodDays,
          validatedParams.serviceId,
        );
        break;

      case "estimate_trends":
        // Basic estimate trends
        const { data: trends, error: trendsError } = await supabase
          .from("estimates")
          .select("created_at, status, total_amount")
          .gte(
            "created_at",
            new Date(
              Date.now() - periodDays * 24 * 60 * 60 * 1000,
            ).toISOString(),
          )
          .order("created_at", { ascending: true });

        if (trendsError) {
          throw new Error(
            `Failed to fetch estimate trends: ${trendsError.message}`,
          );
        }

        result = trends;
        break;

      case "conversion_rates":
        const { data: conversion, error: conversionError } = await supabase
          .from("estimates")
          .select("status")
          .gte(
            "created_at",
            new Date(
              Date.now() - periodDays * 24 * 60 * 60 * 1000,
            ).toISOString(),
          );

        if (conversionError) {
          throw new Error(
            `Failed to fetch conversion data: ${conversionError.message}`,
          );
        }

        const total = conversion?.length || 0;
        const accepted =
          conversion?.filter((e) => e.status === "accepted").length || 0;

        result = {
          total_estimates: total,
          accepted_estimates: accepted,
          conversion_rate: total > 0 ? (accepted / total) * 100 : 0,
        };
        break;

      default:
        return NextResponse.json(
          { error: "Invalid metric type" },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      metric: validatedParams.metric,
      period: validatedParams.period,
      data: result,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analytics API error:", error);

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
          error instanceof Error ? error.message : "Analytics request failed",
      },
      { status: 500 },
    );
  }
}

export const GET = handleGET;
