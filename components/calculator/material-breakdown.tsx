"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FacadeMaterial } from "@/lib/types/facade-analysis-types";

interface MaterialBreakdownProps {
  materials: FacadeMaterial[];
}

const materialColors: Record<string, string> = {
  brick: "bg-red-500",
  stone: "bg-gray-500",
  concrete: "bg-gray-400",
  eifs: "bg-yellow-500",
  metal: "bg-blue-500",
  wood: "bg-amber-700",
  glass: "bg-cyan-500",
  other: "bg-purple-500",
};

export function MaterialBreakdown({ materials }: MaterialBreakdownProps) {
  const totalSqft = materials.reduce((sum, mat) => sum + mat.sqft, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Material Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {materials.map((material, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded ${materialColors[material.type] || "bg-gray-500"}`}
                />
                <span className="font-medium capitalize">{material.type}</span>
                {material.location && (
                  <Badge variant="outline" className="text-xs">
                    {material.location}
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {material.sqft.toLocaleString()} sq ft
                </p>
                <p className="text-sm text-muted-foreground">
                  {material.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
            <Progress value={material.percentage} className="h-2" />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Confidence: {material.confidence}%</span>
              <span>
                {((material.sqft / totalSqft) * 100).toFixed(1)}% of total
              </span>
            </div>
          </div>
        ))}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="font-medium">Total Measured Area</span>
            <span className="font-bold text-lg">
              {totalSqft.toLocaleString()} sq ft
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
