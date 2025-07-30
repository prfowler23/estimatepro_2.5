// Building Measurements Component
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FacadeAnalysisResult } from "./types";

interface BuildingMeasurementsProps {
  measurements: FacadeAnalysisResult["measurements"];
}

export function BuildingMeasurements({
  measurements,
}: BuildingMeasurementsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Building Measurements
          <Badge variant="outline">
            Confidence: {Math.round(measurements.confidence * 100)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm font-medium">Height</p>
            <p className="text-2xl font-bold">
              {measurements.buildingHeight} ft
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Width</p>
            <p className="text-2xl font-bold">{measurements.facadeWidth} ft</p>
          </div>
          <div>
            <p className="text-sm font-medium">Stories</p>
            <p className="text-2xl font-bold">{measurements.stories}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Total Area</p>
            <p className="text-2xl font-bold">
              {measurements.estimatedSqft} sq ft
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
