"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FacadeAnalysis } from "@/lib/types/facade-analysis-types";
import {
  Building2,
  Camera,
  Sparkles,
  ChevronRight,
  Square,
  Maximize2,
} from "lucide-react";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface FacadeAnalysisCardProps {
  analysis: FacadeAnalysis;
  imageCount?: number;
  onClick?: () => void;
  className?: string;
}

// Memoize the component to prevent unnecessary re-renders
export const FacadeAnalysisCard = memo(function FacadeAnalysisCard({
  analysis,
  imageCount = 0,
  onClick,
  className,
}: FacadeAnalysisCardProps) {
  const complexityColors = {
    simple: "bg-green-100 text-green-800",
    moderate: "bg-yellow-100 text-yellow-800",
    complex: "bg-red-100 text-red-800",
  };

  const confidenceLevel = analysis.confidence_level || 0;
  const hasAIAnalysis = analysis.ai_model_version !== null;

  return (
    <Card
      className={cn(
        "hover:shadow-lg transition-shadow cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">
              {analysis.building_name || "Facade Analysis"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {hasAIAnalysis && (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI Analyzed
              </Badge>
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Building Info */}
        {(analysis.building_type || analysis.location) && (
          <div className="text-sm text-muted-foreground">
            {analysis.building_type && (
              <span className="capitalize">{analysis.building_type}</span>
            )}
            {analysis.building_type && analysis.location && " • "}
            {analysis.location}
          </div>
        )}

        {/* Measurements */}
        {(analysis.total_facade_sqft || analysis.total_glass_sqft) && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Square className="h-3 w-3" />
                Total Facade
              </div>
              <div className="font-semibold">
                {formatNumber(analysis.total_facade_sqft || 0)} sq ft
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Maximize2 className="h-3 w-3" />
                Glass Area
              </div>
              <div className="font-semibold">
                {formatNumber(analysis.total_glass_sqft || 0)} sq ft
              </div>
            </div>
          </div>
        )}

        {/* Glass to Facade Ratio */}
        {analysis.glass_to_facade_ratio !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Glass Coverage</span>
              <span className="font-medium">
                {Math.round((analysis.glass_to_facade_ratio || 0) * 100)}%
              </span>
            </div>
            <Progress
              value={(analysis.glass_to_facade_ratio || 0) * 100}
              className="h-2"
            />
          </div>
        )}

        {/* Complexity and Confidence */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {analysis.facade_complexity && (
              <Badge
                variant="secondary"
                className={cn(
                  "capitalize",
                  complexityColors[analysis.facade_complexity],
                )}
              >
                {analysis.facade_complexity}
              </Badge>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Camera className="h-4 w-4" />
              {imageCount} {imageCount === 1 ? "image" : "images"}
            </div>
          </div>
          {hasAIAnalysis && confidenceLevel > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Confidence: </span>
              <span
                className={cn(
                  "font-medium",
                  confidenceLevel >= 80
                    ? "text-green-600"
                    : confidenceLevel >= 60
                      ? "text-yellow-600"
                      : "text-red-600",
                )}
              >
                {confidenceLevel}%
              </span>
            </div>
          )}
        </div>

        {/* Field Verification Warning */}
        {analysis.requires_field_verification && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
            Field verification recommended
          </div>
        )}
      </CardContent>
    </Card>
  );
});
