import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Clock, Target, Zap, Bot } from "lucide-react";
import type { AnalyticsData } from "@/lib/analytics/data";
import { AnalyticsMetricsService } from "@/lib/services/analytics-metrics-service";

interface AIBusinessInsightsProps {
  data: AnalyticsData | null;
}

export const AIBusinessInsights: React.FC<AIBusinessInsightsProps> = React.memo(
  ({ data }) => {
    // Calculate metrics using the service with memoization
    const metrics = useMemo(
      () => AnalyticsMetricsService.calculateAIMetrics(data),
      [data],
    );
    return (
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-text-accent" />
              AI Business Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div
                className="text-center p-3 bg-bg-secondary rounded-lg border border-border-success"
                role="group"
                aria-labelledby="ai-saved-hours"
              >
                <Clock
                  className="h-6 w-6 text-text-success mx-auto mb-1"
                  aria-hidden="true"
                />
                <div
                  className="text-lg font-bold text-text-primary"
                  id="ai-saved-hours-value"
                >
                  {metrics.aiSavedHours > 0
                    ? `${metrics.aiSavedHours} hrs`
                    : "0 hrs"}
                </div>
                <div
                  className="text-xs text-text-secondary"
                  id="ai-saved-hours"
                >
                  AI saved this month
                </div>
              </div>
              <div
                className="text-center p-3 bg-bg-secondary rounded-lg border border-border-info"
                role="group"
                aria-labelledby="photo-accuracy"
              >
                <Target
                  className="h-6 w-6 text-text-info mx-auto mb-1"
                  aria-hidden="true"
                />
                <div
                  className="text-lg font-bold text-text-primary"
                  id="photo-accuracy-value"
                >
                  {metrics.photoAccuracy > 0
                    ? `${metrics.photoAccuracy}%`
                    : "N/A"}
                </div>
                <div
                  className="text-xs text-text-secondary"
                  id="photo-accuracy"
                >
                  Photo analysis accuracy
                </div>
              </div>
              <div
                className="text-center p-3 bg-bg-accent rounded-lg border border-border-primary"
                role="group"
                aria-labelledby="avg-estimate-time"
              >
                <Zap
                  className="h-6 w-6 text-text-accent mx-auto mb-1"
                  aria-hidden="true"
                />
                <div
                  className="text-lg font-bold text-text-primary"
                  id="avg-estimate-time-value"
                >
                  {metrics.avgEstimateTime > 0
                    ? `${metrics.avgEstimateTime} min`
                    : "N/A"}
                </div>
                <div
                  className="text-xs text-text-secondary"
                  id="avg-estimate-time"
                >
                  Avg estimate time
                </div>
              </div>
              <div
                className="text-center p-3 bg-bg-warning/10 rounded-lg border border-border-warning"
                role="group"
                aria-labelledby="automation-rate"
              >
                <Bot
                  className="h-6 w-6 text-text-warning mx-auto mb-1"
                  aria-hidden="true"
                />
                <div
                  className="text-lg font-bold text-text-primary"
                  id="automation-rate-value"
                >
                  {metrics.automationRate > 0
                    ? `${metrics.automationRate}%`
                    : "N/A"}
                </div>
                <div
                  className="text-xs text-text-secondary"
                  id="automation-rate"
                >
                  Automation rate
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  },
);

AIBusinessInsights.displayName = "AIBusinessInsights";
