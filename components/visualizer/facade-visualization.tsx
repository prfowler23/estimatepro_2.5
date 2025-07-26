"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Maximize, Move3D } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacadeAnalysis } from "@/lib/types/facade-analysis-types";

interface FacadeVisualizationProps {
  analysis: Partial<FacadeAnalysis>;
}

export function FacadeVisualization({ analysis }: FacadeVisualizationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            3D Building Visualization
          </span>
          <Button variant="outline" size="sm">
            <Maximize className="h-4 w-4 mr-2" />
            Fullscreen
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[600px] bg-muted rounded-lg flex items-center justify-center">
          {/* Placeholder for 3D visualization */}
          <div className="text-center">
            <Move3D className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              3D visualization will be rendered here
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Building Height: {analysis.building_height_feet || 0} ft (
              {analysis.building_height_stories || 0} stories)
            </p>
            <p className="text-sm text-muted-foreground">
              Total Facade: {analysis.total_facade_sqft?.toLocaleString() || 0}{" "}
              sq ft
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Complexity</p>
            <p className="font-semibold capitalize">
              {analysis.facade_complexity || "simple"}
            </p>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Glass Ratio</p>
            <p className="font-semibold">
              {analysis.glass_to_facade_ratio?.toFixed(1) || 0}%
            </p>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Confidence</p>
            <p className="font-semibold">{analysis.confidence_level || 0}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
