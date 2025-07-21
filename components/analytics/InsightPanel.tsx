"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PredictiveInsight, ActionItem } from "@/lib/types/analytics-types";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  Zap,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  ArrowRight,
  ExternalLink,
  Lightbulb,
  Settings,
  BarChart3,
} from "lucide-react";

interface InsightPanelProps {
  insights: PredictiveInsight[];
  onInsightClick?: (insight: PredictiveInsight) => void;
  onActionItemClick?: (actionItem: ActionItem) => void;
  className?: string;
}

export function InsightPanel({
  insights,
  onInsightClick,
  onActionItemClick,
  className = "",
}: InsightPanelProps) {
  const [selectedInsight, setSelectedInsight] =
    useState<PredictiveInsight | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "completion_prediction":
        return <Target className="w-5 h-5" />;
      case "quality_prediction":
        return <CheckCircle className="w-5 h-5" />;
      case "bottleneck_detection":
        return <AlertTriangle className="w-5 h-5" />;
      case "resource_optimization":
        return <Zap className="w-5 h-5" />;
      default:
        return <Brain className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-800",
          badge: "bg-red-100 text-red-800",
        };
      case "medium":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          text: "text-yellow-800",
          badge: "bg-yellow-100 text-yellow-800",
        };
      case "low":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-800",
          badge: "bg-blue-100 text-blue-800",
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          text: "text-gray-800",
          badge: "bg-gray-100 text-gray-800",
        };
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "high":
        return <TrendingUp className="w-4 h-4 text-red-600" />;
      case "medium":
        return <BarChart3 className="w-4 h-4 text-yellow-600" />;
      case "low":
        return <Lightbulb className="w-4 h-4 text-blue-600" />;
      default:
        return <Settings className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionItemColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-200 bg-red-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      case "low":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const filteredInsights = insights.filter((insight) => {
    if (filterType === "all") return true;
    return insight.type === filterType;
  });

  const insightTypes = [
    { id: "all", label: "All Insights", count: insights.length },
    {
      id: "completion_prediction",
      label: "Completion",
      count: insights.filter((i) => i.type === "completion_prediction").length,
    },
    {
      id: "quality_prediction",
      label: "Quality",
      count: insights.filter((i) => i.type === "quality_prediction").length,
    },
    {
      id: "bottleneck_detection",
      label: "Bottlenecks",
      count: insights.filter((i) => i.type === "bottleneck_detection").length,
    },
    {
      id: "resource_optimization",
      label: "Optimization",
      count: insights.filter((i) => i.type === "resource_optimization").length,
    },
  ];

  const handleInsightClick = (insight: PredictiveInsight) => {
    setSelectedInsight(insight);
    onInsightClick?.(insight);
  };

  if (insights.length === 0) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">
          No Insights Available
        </h3>
        <p className="text-gray-500">
          Insights will appear here as we analyze your workflow data.
        </p>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {insightTypes.map((type) => (
          <Button
            key={type.id}
            variant={filterType === type.id ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType(type.id)}
            className="flex items-center gap-2"
          >
            {type.label}
            {type.count > 0 && (
              <Badge variant="secondary" className="ml-1">
                {type.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Insights Grid */}
      <div className="grid gap-4">
        {filteredInsights.map((insight) => {
          const colors = getSeverityColor(insight.severity);

          return (
            <Card
              key={insight.insightId}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${colors.bg} ${colors.border}`}
              onClick={() => handleInsightClick(insight)}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${colors.bg} ${colors.border}`}
                    >
                      {getInsightIcon(insight.type)}
                    </div>
                    <div>
                      <h4 className={`font-semibold ${colors.text}`}>
                        {insight.type
                          .replace("_", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {insight.prediction}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={colors.badge}>{insight.severity}</Badge>
                    <div className="flex items-center gap-1">
                      {getImpactIcon(insight.impact)}
                      <span className="text-xs text-gray-500">
                        {insight.impact} impact
                      </span>
                    </div>
                  </div>
                </div>

                {/* Confidence and Probability */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Confidence</span>
                      <span className="font-medium">
                        {(insight.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={insight.confidence * 100}
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Probability</span>
                      <span className="font-medium">
                        {(insight.probability * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={insight.probability * 100}
                      className="h-2"
                    />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {insight.affectedUsers.length} user
                      {insight.affectedUsers.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {insight.affectedWorkflows.length} workflow
                      {insight.affectedWorkflows.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {new Date(insight.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Top Recommendations */}
                {insight.recommendations.length > 0 && (
                  <div className="bg-white rounded-lg p-3 border">
                    <h5 className="font-medium mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-600" />
                      Top Recommendations
                    </h5>
                    <ul className="space-y-1">
                      {insight.recommendations.slice(0, 3).map((rec, index) => (
                        <li
                          key={index}
                          className="text-sm text-gray-600 flex items-start gap-2"
                        >
                          <ArrowRight className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                    {insight.recommendations.length > 3 && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-blue-600 mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInsightClick(insight);
                        }}
                      >
                        View all {insight.recommendations.length}{" "}
                        recommendations
                      </Button>
                    )}
                  </div>
                )}

                {/* Action Items Preview */}
                {insight.actionItems.length > 0 && (
                  <div className="bg-white rounded-lg p-3 border">
                    <h5 className="font-medium mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Action Items ({insight.actionItems.length})
                    </h5>
                    <div className="space-y-2">
                      {insight.actionItems.slice(0, 2).map((item, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded border ${getActionItemColor(item.priority)}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {item.title}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {item.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>
                    {insight.actionItems.length > 2 && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-blue-600 mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInsightClick(insight);
                        }}
                      >
                        View all action items
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detailed View Modal/Panel */}
      {selectedInsight && (
        <Card className="fixed inset-4 z-50 overflow-auto bg-white">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Insight Details</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedInsight(null)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="recommendations">
                  Recommendations
                </TabsTrigger>
                <TabsTrigger value="actions">Action Items</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Insight Summary</h4>
                    <p className="text-gray-600">
                      {selectedInsight.prediction}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Confidence:</span>
                        <span>
                          {(selectedInsight.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Probability:</span>
                        <span>
                          {(selectedInsight.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Impact:</span>
                        <Badge variant="outline">
                          {selectedInsight.impact}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Affected Resources</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Users:</span>
                      <p className="text-sm">
                        {selectedInsight.affectedUsers.join(", ")}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Workflows:</span>
                      <p className="text-sm">
                        {selectedInsight.affectedWorkflows.length} workflows
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                <div className="space-y-3">
                  {selectedInsight.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-blue-600">
                            {index + 1}
                          </span>
                        </div>
                        <p className="text-sm">{rec}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <div className="space-y-3">
                  {selectedInsight.actionItems.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium">{item.title}</h5>
                        <Badge variant="outline">{item.priority}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {item.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Category: {item.category}</span>
                        <span>Status: {item.status}</span>
                      </div>
                      <div className="mt-3">
                        <Button
                          size="sm"
                          onClick={() => onActionItemClick?.(item)}
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Take Action
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      )}
    </div>
  );
}

export default InsightPanel;
