// Safety Analysis Component
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FacadeAnalysisResult } from "./types";
import { getRiskColor } from "./utils";

interface SafetyAnalysisProps {
  safety: FacadeAnalysisResult["safety"];
}

export function SafetyAnalysis({ safety }: SafetyAnalysisProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Safety Analysis
          <Badge className={getRiskColor(safety.riskLevel)}>
            {safety.riskLevel} risk
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {safety.hazards.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Identified Hazards</p>
            <div className="flex flex-wrap gap-1">
              {safety.hazards.map((hazard, index) => (
                <Badge key={index} variant="destructive">
                  {hazard}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {safety.accessChallenges.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Access Challenges</p>
            <div className="flex flex-wrap gap-1">
              {safety.accessChallenges.map((challenge, index) => (
                <Badge key={index} variant="outline">
                  {challenge}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {safety.requirements.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Safety Requirements</p>
            <div className="space-y-1">
              {safety.requirements.map((requirement, index) => (
                <p key={index} className="text-sm">
                  • {requirement}
                </p>
              ))}
            </div>
          </div>
        )}

        {safety.equipmentNeeded.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Equipment Needed</p>
            <div className="flex flex-wrap gap-1">
              {safety.equipmentNeeded.map((equipment, index) => (
                <Badge key={index} variant="secondary">
                  {equipment}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
