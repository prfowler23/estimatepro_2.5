// AI Predictive Analytics API
// Provides advanced AI-powered predictions and anomaly detection

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AIPredictiveAnalyticsService } from "@/lib/services/ai-predictive-analytics-service";
import { z } from "zod";

// Request validation schema
const AIPredictionsRequestSchema = z.object({
  action: z.enum(["predict", "detect_anomalies"]),
  predictionType: z
    .enum([
      "revenue_forecast",
      "demand_prediction",
      "seasonal_trends",
      "customer_behavior",
      "service_optimization",
      "risk_assessment",
    ])
    .optional(),
  timeHorizon: z
    .enum(["1week", "1month", "3months", "6months", "1year"])
    .optional(),
  confidence: z.number().min(0.1).max(1.0).optional(),
  dataSource: z
    .enum(["estimates", "revenue", "user_activity", "ai_usage", "performance"])
    .optional(),
  detectionMethod: z
    .enum(["statistical", "ml_based", "rule_based", "hybrid"])
    .optional(),
  sensitivity: z.enum(["low", "medium", "high"]).optional(),
  timeWindow: z.string().optional(),
  thresholds: z
    .object({
      deviation: z.number(),
      confidence: z.number(),
    })
    .optional(),
  includeFactors: z.array(z.string()).optional(),
  customParameters: z.record(z.any()).optional(),
});

async function handlePOST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedParams = AIPredictionsRequestSchema.parse(body);

    const aiService = new AIPredictiveAnalyticsService();

    if (validatedParams.action === "predict") {
      if (!validatedParams.predictionType) {
        return NextResponse.json(
          { error: "predictionType is required for predict action" },
          { status: 400 },
        );
      }

      const predictions = await aiService.generatePredictions({
        predictionType: validatedParams.predictionType,
        timeHorizon: validatedParams.timeHorizon || "1month",
        confidence: validatedParams.confidence || 0.8,
        includeFactors: validatedParams.includeFactors,
        customParameters: validatedParams.customParameters,
      });

      return NextResponse.json({
        success: true,
        action: "predict",
        data: predictions,
        timestamp: new Date().toISOString(),
      });
    } else if (validatedParams.action === "detect_anomalies") {
      if (!validatedParams.dataSource) {
        return NextResponse.json(
          { error: "dataSource is required for detect_anomalies action" },
          { status: 400 },
        );
      }

      const anomalies = await aiService.detectAnomalies({
        dataSource: validatedParams.dataSource,
        detectionMethod: validatedParams.detectionMethod || "hybrid",
        sensitivity: validatedParams.sensitivity || "medium",
        timeWindow: validatedParams.timeWindow || "24h",
        thresholds: validatedParams.thresholds,
      });

      return NextResponse.json({
        success: true,
        action: "detect_anomalies",
        data: anomalies,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: "Invalid action specified" },
      { status: 400 },
    );
  } catch (error) {
    console.error("AI Predictions API error:", error);

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
            : "AI prediction request failed",
      },
      { status: 500 },
    );
  }
}

async function handleGET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const predictionType = searchParams.get("predictionType") as any;
    const timeHorizon = searchParams.get("timeHorizon") as any;

    if (!predictionType) {
      return NextResponse.json(
        { error: "predictionType parameter is required" },
        { status: 400 },
      );
    }

    const aiService = new AIPredictiveAnalyticsService();

    // Quick prediction with default parameters
    const quickPrediction = await aiService.generatePredictions({
      predictionType,
      timeHorizon: timeHorizon || "1month",
      confidence: 0.8,
    });

    return NextResponse.json({
      success: true,
      action: "quick_predict",
      data: {
        predictionId: quickPrediction.predictionId,
        type: quickPrediction.type,
        overallScore: quickPrediction.modelMetrics.accuracy,
        keyInsights: quickPrediction.insights.slice(0, 3),
        topRecommendations: quickPrediction.recommendations.slice(0, 3),
        dataQuality: quickPrediction.dataQuality.score,
        nextPredictions: quickPrediction.predictions.slice(0, 5),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Predictions API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI prediction request failed",
      },
      { status: 500 },
    );
  }
}

export const GET = handleGET;
export const POST = handlePOST;
