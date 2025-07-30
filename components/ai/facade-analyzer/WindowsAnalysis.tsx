// Windows Analysis Component
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FacadeAnalysisResult } from "./types";
import { getRiskColor } from "./utils";

interface WindowsAnalysisProps {
  windows: FacadeAnalysisResult["windows"];
}

export function WindowsAnalysis({ windows }: WindowsAnalysisProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Windows Analysis
          <Badge variant="outline">
            Confidence: {Math.round(windows.confidence * 100)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm font-medium">Count</p>
            <p className="text-2xl font-bold">{windows.count}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Total Area</p>
            <p className="text-2xl font-bold">{windows.totalArea} sq ft</p>
          </div>
          <div>
            <p className="text-sm font-medium">Grid Pattern</p>
            <p className="text-lg">{windows.gridPattern}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Cleaning Difficulty</p>
            <Badge className={getRiskColor(windows.cleaningDifficulty)}>
              {windows.cleaningDifficulty}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
