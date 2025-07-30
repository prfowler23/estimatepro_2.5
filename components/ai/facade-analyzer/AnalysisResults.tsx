// Analysis Results Component
"use client";

import { Badge } from "@/components/ui/badge";
import { FacadeAnalysisResult } from "./types";
import { WindowsAnalysis } from "./WindowsAnalysis";
import { MaterialsAnalysis } from "./MaterialsAnalysis";
import { DamageAssessment } from "./DamageAssessment";
import { SafetyAnalysis } from "./SafetyAnalysis";
import { BuildingMeasurements } from "./BuildingMeasurements";
import { Recommendations } from "./Recommendations";

interface AnalysisResultsProps {
  result: FacadeAnalysisResult;
}

export function AnalysisResults({ result }: AnalysisResultsProps) {
  return (
    <div className="space-y-6">
      <WindowsAnalysis windows={result.windows} />
      <MaterialsAnalysis materials={result.materials} />
      <DamageAssessment damage={result.damage} />
      <SafetyAnalysis safety={result.safety} />
      <BuildingMeasurements measurements={result.measurements} />
      <Recommendations recommendations={result.recommendations} />

      <div className="text-center">
        <Badge variant="outline" className="text-lg px-4 py-2">
          Overall Analysis Confidence: {Math.round(result.confidence * 100)}%
        </Badge>
      </div>
    </div>
  );
}
