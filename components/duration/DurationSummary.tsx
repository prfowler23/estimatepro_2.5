import { memo, useMemo } from "react";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MetricsGrid } from "./components/MetricsGrid";
import { DurationBreakdown } from "./components/DurationBreakdown";
import { WeatherRiskAssessment } from "./components/WeatherRiskAssessment";
import { CriticalPathAnalysis } from "./components/CriticalPathAnalysis";
import { ProjectConfidence } from "./components/ProjectConfidence";
import type { DurationSummaryProps } from "./types";
import { getConfidenceColor, getRiskLabel } from "./constants";

export const DurationSummary = memo(function DurationSummary({
  serviceDurations,
  totalDuration,
  weatherAnalysis,
  timeline,
  confidence = 85,
}: DurationSummaryProps) {
  // Memoize date calculations with safety checks
  const timelineData = useMemo(() => {
    if (!timeline.entries || timeline.entries.length === 0) {
      return {
        startDate: new Date(),
        endDate: new Date(),
      };
    }

    const validEntries = timeline.entries.filter(
      (entry) =>
        entry.startDate &&
        entry.endDate &&
        entry.startDate instanceof Date &&
        entry.endDate instanceof Date &&
        !isNaN(entry.startDate.getTime()) &&
        !isNaN(entry.endDate.getTime()),
    );

    if (validEntries.length === 0) {
      return {
        startDate: new Date(),
        endDate: new Date(),
      };
    }

    const startDate = validEntries[0].startDate;
    const endDate = new Date(
      Math.max(...validEntries.map((e) => e.endDate.getTime())),
    );

    return { startDate, endDate };
  }, [timeline.entries]);

  // Memoize statistics calculations to prevent unnecessary recalculation
  const statistics = useMemo(() => {
    if (!serviceDurations || serviceDurations.length === 0) {
      return {
        totalBaseDuration: 0,
        totalWeatherImpact: 0,
        weatherSensitiveServices: 0,
        criticalPathDuration: 0,
        highConfidenceServices: 0,
        lowConfidenceServices: 0,
      };
    }

    // Use more efficient single-pass calculations
    let totalBaseDuration = 0;
    let totalWeatherImpact = 0;
    let weatherSensitiveServices = 0;
    let highConfidenceServices = 0;
    let lowConfidenceServices = 0;

    serviceDurations.forEach((sd) => {
      totalBaseDuration += sd.baseDuration || 0;
      totalWeatherImpact += sd.weatherImpact || 0;
      if (sd.weatherImpact > 0) weatherSensitiveServices++;
      if (sd.confidence === "high") highConfidenceServices++;
      if (sd.confidence === "low") lowConfidenceServices++;
    });

    // Optimize critical path calculation
    const criticalPathDuration = timeline.criticalPath.reduce(
      (sum, service) => {
        const serviceEntry = timeline.entries.find(
          (e) => e.service === service,
        );
        return sum + (serviceEntry?.duration || 0);
      },
      0,
    );

    return {
      totalBaseDuration,
      totalWeatherImpact,
      weatherSensitiveServices,
      criticalPathDuration,
      highConfidenceServices,
      lowConfidenceServices,
    };
  }, [serviceDurations, timeline.criticalPath, timeline.entries]);

  const { startDate, endDate } = timelineData;
  const {
    totalBaseDuration,
    totalWeatherImpact,
    weatherSensitiveServices,
    criticalPathDuration,
    highConfidenceServices,
    lowConfidenceServices,
  } = statistics;

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Duration Summary
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Based on measurements, production rates, and weather analysis
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-600">{totalDuration}</p>
            <p className="text-sm text-muted-foreground">Total Days</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <MetricsGrid
          startDate={startDate}
          endDate={endDate}
          confidence={confidence}
          weatherRiskScore={weatherAnalysis.riskScore}
        />

        {/* Duration Breakdown */}
        <DurationBreakdown
          serviceDurations={serviceDurations}
          criticalPath={timeline.criticalPath}
          totalBaseDuration={totalBaseDuration}
          totalWeatherImpact={totalWeatherImpact}
          totalDuration={totalDuration}
        />

        {/* Weather Risk Assessment */}
        <WeatherRiskAssessment
          weatherAnalysis={weatherAnalysis}
          weatherSensitiveServices={weatherSensitiveServices}
        />

        {/* Critical Path Information */}
        <CriticalPathAnalysis
          criticalPath={timeline.criticalPath}
          criticalPathDuration={criticalPathDuration}
        />

        {/* Project Confidence */}
        <ProjectConfidence
          confidence={confidence}
          highConfidenceServices={highConfidenceServices}
          lowConfidenceServices={lowConfidenceServices}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-2xl font-bold text-blue-600">
              {serviceDurations.length}
            </p>
            <p className="text-xs text-muted-foreground">Services</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-2xl font-bold text-purple-600">
              {timeline.criticalPath.length}
            </p>
            <p className="text-xs text-muted-foreground">Critical Path</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-2xl font-bold text-orange-600">
              {weatherSensitiveServices}
            </p>
            <p className="text-xs text-muted-foreground">Weather Dependent</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
