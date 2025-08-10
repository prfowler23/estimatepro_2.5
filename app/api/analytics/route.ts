import { NextRequest, NextResponse } from "next/server";
import { unifiedAnalyticsService } from "@/lib/services/analytics-service-unified";
import { getHandler, postHandler } from "@/lib/api/api-handler";
import { z } from "zod";

const analyticsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

export async function GET(request: NextRequest) {
  return getHandler(
    request,
    async (context) => {
      const searchParams = new URL(request.url).searchParams;
      const params = analyticsQuerySchema.parse(
        Object.fromEntries(searchParams),
      );

      // Use unified analytics service
      const analyticsService = unifiedAnalyticsService;

      const analytics = await analyticsService.getAnalyticsMetrics({
        startDate: params.startDate ? new Date(params.startDate) : undefined,
        endDate: params.endDate ? new Date(params.endDate) : undefined,
        userIds: params.userId
          ? [params.userId]
          : context.user?.id
            ? [context.user.id]
            : undefined,
      });

      return analytics;
    },
    { requireAuth: true },
  );
}

const eventSchema = z.object({
  eventType: z.string(),
  eventData: z.record(z.any()),
  sessionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  return postHandler(
    request,
    eventSchema,
    async (data, context) => {
      // Use unified analytics service
      const analyticsService = unifiedAnalyticsService;

      // Use updateWorkflowStep to track the event
      const result = await analyticsService.updateWorkflowStep(
        data.sessionId || "unknown",
        data.eventType,
        data.eventType,
        {
          stepId: data.eventType,
          stepName: data.eventType,
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          visitCount: 1,
          backtrackCount: 0,
          validationErrors: 0,
          aiAssistanceUsed: false,
          helpViewCount: 0,
          timeSpentInHelp: 0,
        },
      );

      return result;
    },
    { requireAuth: true },
  );
}
