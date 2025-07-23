import { useState, useCallback } from "react";
import { CapturedPhoto } from "../MobilePhotoCapture";

export const useAIAnalysis = (
  onAnalysisComplete?: (photo: CapturedPhoto, analysis: any) => void,
) => {
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzePhotos = useCallback(
    async (
      photosToAnalyze: CapturedPhoto[],
      setPhotos: React.Dispatch<React.SetStateAction<CapturedPhoto[]>>,
    ) => {
      for (const photo of photosToAnalyze) {
        setIsAnalyzing(photo.id);

        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id ? { ...p, status: "processing" } : p,
          ),
        );

        const startTime = Date.now();

        try {
          const formData = new FormData();
          formData.append("photo", photo.file);
          formData.append("analysisType", "mobile-enhanced");

          formData.append(
            "metadata",
            JSON.stringify({
              dimensions: {
                width: photo.metadata.width,
                height: photo.metadata.height,
              },
              location: photo.metadata.location,
              timestamp: photo.timestamp,
              device: photo.metadata.deviceInfo,
            }),
          );

          const response = await fetch("/api/ai/enhanced-photo-analysis", {
            method: "POST",
            body: formData,
            headers: {
              "X-Analysis-Priority": "mobile-realtime",
            },
          });

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ error: "Network error" }));
            throw new Error(errorData.error || "Analysis failed");
          }

          const result = await response.json();
          const processingTime = Date.now() - startTime;

          const enhancedAnalysis = {
            ...result.analysis,
            confidence: result.confidence || 0.8,
            processingTime,
          };

          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photo.id
                ? { ...p, analysis: enhancedAnalysis, status: "analyzed" }
                : p,
            ),
          );

          onAnalysisComplete?.(photo, enhancedAnalysis);
        } catch (error) {
          console.error("Photo analysis failed:", error);

          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photo.id
                ? {
                    ...p,
                    status: "error",
                    analysis: {
                      confidence: 0,
                      processingTime: Date.now() - startTime,
                    },
                  }
                : p,
            ),
          );

          const errorMessage =
            error instanceof Error
              ? error.message
              : "Analysis failed - you can retry or continue without analysis";
          setError(errorMessage);
        } finally {
          setIsAnalyzing(null);
        }
      }
    },
    [onAnalysisComplete],
  );

  const retryAnalysis = useCallback(
    async (
      photo: CapturedPhoto,
      setPhotos: React.Dispatch<React.SetStateAction<CapturedPhoto[]>>,
    ) => {
      await analyzePhotos([photo], setPhotos);
    },
    [analyzePhotos],
  );

  return {
    isAnalyzing,
    error,
    analyzePhotos,
    retryAnalysis,
    setError,
  };
};
