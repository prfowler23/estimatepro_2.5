"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  Camera,
  Upload,
  X,
  RotateCw,
  Download,
  Eye,
  Trash2,
  AlertCircle,
} from "lucide-react";

interface CapturedPhoto {
  id: string;
  file: File;
  url: string;
  timestamp: number;
  analysis?: {
    buildingType?: string;
    surfaces?: string[];
    estimatedArea?: string;
    condition?: string;
    recommendations?: string[];
  };
}

interface MobilePhotoCaptureProps {
  onPhotosChange: (photos: CapturedPhoto[]) => void;
  maxPhotos?: number;
  enableAIAnalysis?: boolean;
  className?: string;
}

export function MobilePhotoCapture({
  onPhotosChange,
  maxPhotos = 10,
  enableAIAnalysis = true,
  className = "",
}: MobilePhotoCaptureProps) {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    files: FileList | null,
    fromCamera = false,
  ) => {
    if (!files) return;

    setError(null);
    const newPhotos: CapturedPhoto[] = [];

    for (
      let i = 0;
      i < files.length && photos.length + newPhotos.length < maxPhotos;
      i++
    ) {
      const file = files[i];

      // Validate file type and size
      if (!file.type.startsWith("image/")) {
        setError("Please select only image files.");
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        setError("Image size must be less than 10MB.");
        continue;
      }

      const photo: CapturedPhoto = {
        id: `photo-${Date.now()}-${i}`,
        file,
        url: URL.createObjectURL(file),
        timestamp: Date.now(),
      };

      newPhotos.push(photo);
    }

    const updatedPhotos = [...photos, ...newPhotos];
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);

    // Analyze photos with AI if enabled
    if (enableAIAnalysis && newPhotos.length > 0) {
      analyzePhotos(newPhotos);
    }
  };

  const analyzePhotos = async (photosToAnalyze: CapturedPhoto[]) => {
    for (const photo of photosToAnalyze) {
      setIsAnalyzing(photo.id);

      try {
        const formData = new FormData();
        formData.append("photo", photo.file);
        formData.append("analysisType", "mobile-quick");

        const response = await fetch("/api/ai/enhanced-photo-analysis", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Analysis failed");

        const analysis = await response.json();

        // Update photo with analysis results
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id ? { ...p, analysis: analysis.analysis } : p,
          ),
        );
      } catch (error) {
        console.error("Photo analysis failed:", error);
        // Continue without analysis
      } finally {
        setIsAnalyzing(null);
      }
    }
  };

  const removePhoto = (photoId: string) => {
    const updatedPhotos = photos.filter((p) => p.id !== photoId);
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);

    // Clean up object URL
    const photo = photos.find((p) => p.id === photoId);
    if (photo) {
      URL.revokeObjectURL(photo.url);
    }
  };

  const retakePhoto = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div>
            <p className="text-sm">{error}</p>
          </div>
        </Alert>
      )}

      {/* Photo Capture Controls */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {/* Camera Capture */}
          <Button
            onClick={() => cameraInputRef.current?.click()}
            disabled={!canAddMore}
            className="flex-1"
            size="lg"
          >
            <Camera className="w-5 h-5 mr-2" />
            Take Photo
          </Button>

          {/* File Upload */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={!canAddMore}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload
          </Button>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {photos.length} of {maxPhotos} photos
          </span>
          {enableAIAnalysis && (
            <Badge variant="secondary" className="text-xs">
              <Camera className="w-3 h-3 mr-1" />
              AI Analysis Enabled
            </Badge>
          )}
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelect(e.target.files, true)}
        className="hidden"
        multiple
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e.target.files, false)}
        className="hidden"
        multiple
      />

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <Card key={photo.id} className="relative overflow-hidden">
              <div className="aspect-square relative">
                <img
                  src={photo.url}
                  alt="Captured photo"
                  className="w-full h-full object-cover"
                />

                {/* Loading Overlay */}
                {isAnalyzing === photo.id && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                      <p className="text-xs">Analyzing...</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removePhoto(photo.id)}
                    className="h-8 w-8 p-0 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>

                {/* AI Analysis Badge */}
                {photo.analysis && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs">
                      AI ✓
                    </Badge>
                  </div>
                )}
              </div>

              {/* Analysis Results */}
              {photo.analysis && (
                <div className="p-3 space-y-2">
                  <div className="text-xs space-y-1">
                    {photo.analysis.buildingType && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Building:</span>
                        <span className="font-medium">
                          {photo.analysis.buildingType}
                        </span>
                      </div>
                    )}
                    {photo.analysis.estimatedArea && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Area:</span>
                        <span className="font-medium">
                          {photo.analysis.estimatedArea}
                        </span>
                      </div>
                    )}
                    {photo.analysis.condition && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Condition:</span>
                        <span
                          className={`font-medium ${
                            photo.analysis.condition
                              .toLowerCase()
                              .includes("good")
                              ? "text-green-600"
                              : photo.analysis.condition
                                    .toLowerCase()
                                    .includes("fair")
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {photo.analysis.condition}
                        </span>
                      </div>
                    )}
                  </div>

                  {photo.analysis.surfaces &&
                    photo.analysis.surfaces.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">
                          Surfaces detected:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {photo.analysis.surfaces.map((surface, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {surface}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Photo Tips */}
      {photos.length === 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="text-center">
            <Camera className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <h3 className="font-medium text-blue-900 mb-2">
              Take Project Photos
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              Capture clear photos of the work area for accurate estimates.
            </p>
            <div className="text-xs text-blue-600 space-y-1">
              <p>📸 Include building facade and windows</p>
              <p>📐 Show scale references when possible</p>
              <p>☀️ Take photos in good lighting</p>
              <p>🔍 Capture any damage or special conditions</p>
            </div>
          </div>
        </Card>
      )}

      {/* AI Analysis Summary */}
      {photos.some((p) => p.analysis) && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="w-4 h-4 text-green-600" />
            <span className="font-medium text-green-900">
              AI Analysis Complete
            </span>
          </div>
          <p className="text-sm text-green-700">
            {photos.filter((p) => p.analysis).length} photo
            {photos.filter((p) => p.analysis).length !== 1 ? "s" : ""} analyzed.
            The analysis results will help with automatic measurements and
            service recommendations.
          </p>
        </Card>
      )}
    </div>
  );
}

export default MobilePhotoCapture;
