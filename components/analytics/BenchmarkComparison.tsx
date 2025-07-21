"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  WorkflowBenchmark,
  AnalyticsMetric,
} from "@/lib/types/analytics-types";
import {
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Award,
} from "lucide-react";

interface BenchmarkComparisonProps {
  benchmarks: WorkflowBenchmark[];
  currentMetrics: AnalyticsMetric[];
  onBenchmarkSelect?: (benchmark: WorkflowBenchmark) => void;
  className?: string;
}

export function BenchmarkComparison({
  benchmarks,
  currentMetrics,
  onBenchmarkSelect,
  className = "",
}: BenchmarkComparisonProps) {
  const [selectedBenchmark, setSelectedBenchmark] =
    useState<WorkflowBenchmark | null>(null);

  const getBenchmarkIcon = (type: string) => {
    switch (type) {
      case "completion_time":
        return <Target className="w-5 h-5" />;
      case "quality_score":
        return <Award className="w-5 h-5" />;
      case "error_rate":
        return <TrendingDown className="w-5 h-5" />;
      default:
        return <BarChart3 className="w-5 h-5" />;
    }
  };

  const getBenchmarkTitle = (type: string) => {
    switch (type) {
      case "completion_time":
        return "Completion Time";
      case "quality_score":
        return "Quality Score";
      case "error_rate":
        return "Error Rate";
      default:
        return type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const getCurrentValue = (benchmarkType: string) => {
    const metricMap = {
      completion_time: "avg_completion_time",
      quality_score: "avg_quality_score",
      error_rate: "avg_error_rate",
    };

    const metricId = metricMap[benchmarkType as keyof typeof metricMap];
    const metric = currentMetrics.find((m) => m.id === metricId);
    return metric?.value || 0;
  };

  const getPerformanceStatus = (
    currentValue: number,
    benchmark: WorkflowBenchmark,
  ) => {
    const isGoodDirection =
      benchmark.benchmarkType === "error_rate"
        ? currentValue <= benchmark.p50
        : currentValue >= benchmark.p50;

    if (isGoodDirection) {
      return {
        status: "above_average",
        color: "text-green-600",
        bg: "bg-green-50 border-green-200",
        icon: <TrendingUp className="w-4 h-4 text-green-600" />,
      };
    } else {
      return {
        status: "below_average",
        color: "text-red-600",
        bg: "bg-red-50 border-red-200",
        icon: <TrendingDown className="w-4 h-4 text-red-600" />,
      };
    }
  };

  const calculatePercentile = (value: number, benchmark: WorkflowBenchmark) => {
    if (value <= benchmark.p25) return 25;
    if (value <= benchmark.p50) return 50;
    if (value <= benchmark.p75) return 75;
    if (value <= benchmark.p90) return 90;
    if (value <= benchmark.p95) return 95;
    return 100;
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return "text-green-600";
    if (percentile >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const handleBenchmarkClick = (benchmark: WorkflowBenchmark) => {
    setSelectedBenchmark(benchmark);
    onBenchmarkSelect?.(benchmark);
  };

  if (benchmarks.length === 0) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">
          No Benchmarks Available
        </h3>
        <p className="text-gray-500">
          Benchmark comparisons will appear here as more data becomes available.
        </p>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Benchmark Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {benchmarks.map((benchmark) => {
          const currentValue = getCurrentValue(benchmark.benchmarkType);
          const performance = getPerformanceStatus(currentValue, benchmark);
          const percentile = calculatePercentile(currentValue, benchmark);

          return (
            <Card
              key={benchmark.benchmarkType}
              className={`p-6 cursor-pointer transition-all hover:shadow-md ${performance.bg}`}
              onClick={() => handleBenchmarkClick(benchmark)}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      {getBenchmarkIcon(benchmark.benchmarkType)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {getBenchmarkTitle(benchmark.benchmarkType)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {benchmark.sampleSize} workflows
                      </p>
                    </div>
                  </div>
                  {performance.icon}
                </div>

                {/* Current vs Benchmark */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Your Performance
                    </span>
                    <span className={`font-bold text-lg ${performance.color}`}>
                      {currentValue.toFixed(1)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Benchmark Average
                    </span>
                    <span className="font-medium text-gray-800">
                      {benchmark.average.toFixed(1)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Your Percentile
                    </span>
                    <Badge className={getPercentileColor(percentile)}>
                      {percentile}th
                    </Badge>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Bottom 25%</span>
                    <span>Top 25%</span>
                  </div>
                  <div className="relative">
                    <Progress value={percentile} className="h-2" />
                    <div
                      className="absolute top-0 w-1 h-2 bg-gray-600 rounded"
                      style={{ left: "50%", transform: "translateX(-50%)" }}
                    />
                  </div>
                  <div className="text-center text-xs text-gray-500">
                    50th percentile (median)
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center p-2 bg-white rounded">
                    <div className="font-medium">
                      {benchmark.p75.toFixed(1)}
                    </div>
                    <div className="text-gray-500">75th %ile</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded">
                    <div className="font-medium">
                      {benchmark.p90.toFixed(1)}
                    </div>
                    <div className="text-gray-500">90th %ile</div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detailed Benchmark View */}
      {selectedBenchmark && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">
                {getBenchmarkTitle(selectedBenchmark.benchmarkType)} Benchmark
                Details
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBenchmark(null)}
              >
                Close
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Percentile Distribution */}
              <div className="space-y-4">
                <h4 className="font-semibold">Percentile Distribution</h4>
                <div className="space-y-3">
                  {[
                    {
                      label: "25th Percentile",
                      value: selectedBenchmark.p25,
                      color: "bg-red-100",
                    },
                    {
                      label: "50th Percentile (Median)",
                      value: selectedBenchmark.p50,
                      color: "bg-yellow-100",
                    },
                    {
                      label: "75th Percentile",
                      value: selectedBenchmark.p75,
                      color: "bg-green-100",
                    },
                    {
                      label: "90th Percentile",
                      value: selectedBenchmark.p90,
                      color: "bg-blue-100",
                    },
                    {
                      label: "95th Percentile",
                      value: selectedBenchmark.p95,
                      color: "bg-purple-100",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded ${item.color}`} />
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                      </div>
                      <span className="font-bold">{item.value.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Analysis */}
              <div className="space-y-4">
                <h4 className="font-semibold">Performance Analysis</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      Current Performance
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {getCurrentValue(selectedBenchmark.benchmarkType).toFixed(
                        1,
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      Benchmark Average
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                      {selectedBenchmark.average.toFixed(1)}
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      Sample Size
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                      {selectedBenchmark.sampleSize.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      Last Updated
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedBenchmark.lastUpdated.toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Improvement Suggestions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">
                Improvement Opportunities
              </h4>
              <div className="space-y-2 text-sm text-blue-700">
                {selectedBenchmark.benchmarkType === "completion_time" && (
                  <>
                    <p>• Focus on streamlining your slowest workflow steps</p>
                    <p>• Consider using more AI assistance and templates</p>
                    <p>
                      • Review and optimize your most time-consuming processes
                    </p>
                  </>
                )}
                {selectedBenchmark.benchmarkType === "quality_score" && (
                  <>
                    <p>• Increase validation checkpoints in your workflow</p>
                    <p>• Spend more time on data verification steps</p>
                    <p>• Use AI suggestions to improve estimate accuracy</p>
                  </>
                )}
                {selectedBenchmark.benchmarkType === "error_rate" && (
                  <>
                    <p>• Implement additional validation steps</p>
                    <p>• Use templates to reduce manual entry errors</p>
                    <p>
                      • Review common error patterns and create prevention
                      strategies
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default BenchmarkComparison;
