"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FacadeMaterial } from "@/lib/types/facade-analysis-types";
import { Layers, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FacadeMaterialsListProps {
  materials: FacadeMaterial[];
  measurements?: {
    totalFacadeSqft: number;
    totalGlassSqft: number;
    avgConfidence: number;
    materialBreakdown: Record<string, number>;
  };
  className?: string;
}

export function FacadeMaterialsList({
  materials,
  measurements,
  className,
}: FacadeMaterialsListProps) {
  const getMaterialColor = (type: string) => {
    const colors: Record<string, string> = {
      glass: "bg-blue-100 text-blue-800",
      concrete: "bg-gray-100 text-gray-800",
      brick: "bg-red-100 text-red-800",
      metal: "bg-slate-100 text-slate-800",
      stone: "bg-amber-100 text-amber-800",
      wood: "bg-yellow-100 text-yellow-800",
      composite: "bg-purple-100 text-purple-800",
      stucco: "bg-orange-100 text-orange-800",
    };
    return colors[type.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case "excellent":
        return "text-green-600";
      case "good":
        return "text-blue-600";
      case "fair":
        return "text-yellow-600";
      case "poor":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (materials.length === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Layers className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Materials Detected</h3>
          <p className="text-sm text-muted-foreground text-center">
            Run AI analysis to detect facade materials
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Material Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Materials</span>
              <span className="font-semibold">{materials.length}</span>
            </div>
            {measurements && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total Facade Area
                  </span>
                  <span className="font-semibold">
                    {measurements.totalFacadeSqft.toLocaleString()} sq ft
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Average Confidence
                  </span>
                  <span
                    className={cn(
                      "font-semibold",
                      measurements.avgConfidence >= 80
                        ? "text-green-600"
                        : measurements.avgConfidence >= 60
                          ? "text-yellow-600"
                          : "text-red-600",
                    )}
                  >
                    {Math.round(measurements.avgConfidence)}%
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Materials List */}
      <div className="grid gap-4">
        {materials.map((material, index) => (
          <Card key={`${material.type}-${index}`}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Material Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getMaterialColor(material.type)}>
                        {material.type}
                      </Badge>
                      {material.condition && (
                        <span
                          className={cn(
                            "text-sm font-medium",
                            getConditionColor(material.condition),
                          )}
                        >
                          {material.condition} condition
                        </span>
                      )}
                    </div>
                    {material.location && (
                      <p className="text-sm text-muted-foreground">
                        Location: {material.location}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {Math.round(material.coverage_percentage)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      coverage
                    </div>
                  </div>
                </div>

                {/* Coverage Progress Bar */}
                <Progress
                  value={material.coverage_percentage}
                  className="h-2"
                />

                {/* Additional Properties */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {material.estimated_sqft && (
                    <div>
                      <span className="text-muted-foreground">Area: </span>
                      <span className="font-medium">
                        {Math.round(material.estimated_sqft).toLocaleString()}{" "}
                        sq ft
                      </span>
                    </div>
                  )}
                  {material.color && (
                    <div>
                      <span className="text-muted-foreground">Color: </span>
                      <span className="font-medium capitalize">
                        {material.color}
                      </span>
                    </div>
                  )}
                  {material.texture && (
                    <div>
                      <span className="text-muted-foreground">Texture: </span>
                      <span className="font-medium capitalize">
                        {material.texture}
                      </span>
                    </div>
                  )}
                  {material.pattern && (
                    <div>
                      <span className="text-muted-foreground">Pattern: </span>
                      <span className="font-medium capitalize">
                        {material.pattern}
                      </span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {material.notes && (
                  <div className="pt-2 border-t">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        {material.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
