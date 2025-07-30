// Materials Analysis Component
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FacadeAnalysisResult } from "./types";
import { getRiskColor, getWeatheringRiskLevel } from "./utils";

interface MaterialsAnalysisProps {
  materials: FacadeAnalysisResult["materials"];
}

export function MaterialsAnalysis({ materials }: MaterialsAnalysisProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Materials Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">Dominant Material</p>
            <p className="text-lg">{materials.dominant}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Weathering</p>
            <Badge
              className={getRiskColor(
                getWeatheringRiskLevel(materials.weathering),
              )}
            >
              {materials.weathering}
            </Badge>
          </div>
        </div>

        {Object.keys(materials.breakdown).length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Material Breakdown</p>
            <div className="space-y-1">
              {Object.entries(materials.breakdown).map(
                ([material, percentage]) => (
                  <div key={material} className="flex justify-between">
                    <span className="capitalize">{material}</span>
                    <span>{percentage}%</span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {materials.conditions.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Conditions</p>
            <div className="flex flex-wrap gap-1">
              {materials.conditions.map((condition, index) => (
                <Badge key={index} variant="secondary">
                  {condition}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
