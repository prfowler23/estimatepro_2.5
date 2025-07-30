// Refactored Facade Analyzer Component
"use client";

import { useState } from "react";
import { AnalysisLoading } from "@/components/ui/analysis-loading";
import { validateImageUrl, isImageUrl } from "@/lib/utils/url-validation";
import { ComponentErrorBoundary } from "@/components/error-handling/component-error-boundary";
import {
  FacadeAnalysisResult,
  FacadeAnalyzerInput,
  AnalysisResults,
} from "./facade-analyzer";

function FacadeAnalyzerComponent() {
  const [imageUrl, setImageUrl] = useState("");
  const [buildingType, setBuildingType] = useState("commercial");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<FacadeAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!imageUrl.trim()) {
      setError("Please enter an image URL");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // Validate URL for security
      const validatedUrl = validateImageUrl(imageUrl.trim());

      // Additional check to ensure it's an image URL
      if (!isImageUrl(validatedUrl)) {
        throw new Error("URL does not appear to point to an image file");
      }

      const response = await fetch("/api/ai/analyze-facade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: validatedUrl,
          buildingType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze facade");
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6" role="region" aria-label="Facade Analyzer">
      <div>
        <h2 className="text-2xl font-bold">Facade Analyzer</h2>
        <p className="text-muted-foreground">
          Comprehensive building facade analysis using AI-powered image
          processing
        </p>
      </div>

      <FacadeAnalyzerInput
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
        buildingType={buildingType}
        setBuildingType={setBuildingType}
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
        error={error}
      />

      {isAnalyzing && (
        <AnalysisLoading
          currentStep="Analyzing facade condition and materials..."
          progress={50}
        />
      )}

      {result && <AnalysisResults result={result} />}
    </div>
  );
}

// Export wrapped with error boundary
export function FacadeAnalyzer() {
  return (
    <ComponentErrorBoundary
      componentName="FacadeAnalyzer"
      showDetails={process.env.NODE_ENV === "development"}
    >
      <FacadeAnalyzerComponent />
    </ComponentErrorBoundary>
  );
}
