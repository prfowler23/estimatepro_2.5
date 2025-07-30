// Recommendations Component
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FacadeAnalysisResult } from "./types";
import { getRiskColor } from "./utils";

interface RecommendationsProps {
  recommendations: FacadeAnalysisResult["recommendations"];
}

export function Recommendations({ recommendations }: RecommendationsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Recommendations
          <Badge className={getRiskColor(recommendations.priority)}>
            {recommendations.priority} priority
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.services.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Recommended Services</p>
            <div className="flex flex-wrap gap-1">
              {recommendations.services.map((service, index) => (
                <Badge key={index} variant="default">
                  {service}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.timeline && (
            <div>
              <p className="text-sm font-medium">Timeline</p>
              <p className="text-lg">{recommendations.timeline}</p>
            </div>
          )}

          {recommendations.estimatedCost.min > 0 && (
            <div>
              <p className="text-sm font-medium">Estimated Cost</p>
              <p className="text-lg">
                ${recommendations.estimatedCost.min.toLocaleString()} - $
                {recommendations.estimatedCost.max.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
