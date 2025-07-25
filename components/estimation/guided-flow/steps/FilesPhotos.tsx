import React, { useState, useCallback, useEffect, memo } from "react";
import { error as logError, warn as logWarn } from "@/lib/utils/logger";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import {
  Upload,
  Camera,
  FileImage,
  FileVideo,
  Map,
  Ruler,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { analyzePhotosClient, AI_FALLBACKS } from "@/lib/ai/client-utils";
import {
  FilesPhotosData,
  GuidedFlowData,
  UploadedFile,
} from "@/lib/types/estimate-types";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { MobilePhotoCapture } from "@/components/ui/mobile/MobilePhotoCapture";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { StepComponentProps } from "../index";

interface FileData {
  id: string;
  file: File;
  type: "photo" | "video" | "area_map" | "measurement_screenshot" | "plan";
  url: string;
  analysis?: AnalysisResult;
  status: "pending" | "analyzing" | "complete" | "error";
  errorMessage?: string;
}

interface AnalysisResult {
  windowCount?: number;
  totalArea?: number;
  materials?: Array<{
    type: string;
    percentage: number;
    condition?: string;
  }>;
  damageLevel?: "none" | "minor" | "moderate" | "severe";
  safetyHazards?: string[];
  measurements?: {
    height?: number;
    width?: number;
    stories?: number;
  };
}

const FILE_TYPE_ICONS = {
  photo: FileImage,
  video: FileVideo,
  area_map: Map,
  measurement_screenshot: Ruler,
  plan: FileText,
};

const FILE_TYPE_LABELS = {
  photo: "Building Photo",
  video: "Video Walkthrough",
  area_map: "Area Map",
  measurement_screenshot: "Measurements",
  plan: "Floor Plan",
};

interface FilesPhotosProps extends StepComponentProps {}

function FilesPhotosComponent({
  data,
  onUpdate,
  onNext,
  onBack,
}: FilesPhotosProps) {
  const { isMobile, isTablet } = useMobileDetection();
  const [filesData, setFilesData] = useState<FilesPhotosData>({
    files: data?.filesPhotos?.files || [],
    analysisComplete: data?.filesPhotos?.analysisComplete || false,
    summary: data?.filesPhotos?.summary || {
      totalPhotos: 0,
      analyzedPhotos: 0,
      totalWindows: 0,
      totalArea: 0,
      avgDamageLevel: "none",
      safetyHazards: [],
      materials: {},
    },
  });

  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Sync local state with parent data
  useEffect(() => {
    if (data?.filesPhotos) {
      setFilesData(data.filesPhotos);
    }
  }, [data?.filesPhotos]);

  // File type detection based on filename and content
  const detectFileType = (file: File): FileData["type"] => {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();

    if (fileType.startsWith("video/")) return "video";

    if (fileName.includes("map") || fileName.includes("layout"))
      return "area_map";
    if (fileName.includes("measure") || fileName.includes("dimension"))
      return "measurement_screenshot";
    if (fileName.includes("plan") || fileName.includes("blueprint"))
      return "plan";

    // Default to photo for images
    if (fileType.startsWith("image/")) return "photo";

    return "photo";
  };

  // Helper to get icon type from MIME type
  const getIconType = (mimeType: string): keyof typeof FILE_TYPE_ICONS => {
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("image/")) return "photo";
    return "photo";
  };

  // Handle file upload
  const handleFileUpload = useCallback((files: FileList) => {
    const newFiles = Array.from(files).map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      uploadedAt: new Date(),
      file,
      status: "pending" as const,
    }));

    setFilesData((prev) => ({
      ...prev,
      files: [...prev.files, ...newFiles],
    }));
  }, []);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload],
  );

  // File input change handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
    }
  };

  // Remove file
  const removeFile = (fileId: string) => {
    setFilesData((prev) => ({
      ...prev,
      files: prev.files.filter((f) => {
        if (f.id === fileId) {
          URL.revokeObjectURL(f.url);
          return false;
        }
        return true;
      }),
    }));
  };

  // Retry analysis for a specific file
  const retryAnalysis = async (fileId: string) => {
    const file = filesData.files.find((f) => f.id === fileId);
    if (!file || !file.type.startsWith("image/")) return;

    // Reset status to analyzing
    setFilesData((prev) => ({
      ...prev,
      files: prev.files.map((f) =>
        f.id === fileId
          ? { ...f, status: "analyzing", errorMessage: undefined }
          : f,
      ),
    }));

    try {
      const analysis = await analyzePhoto(file);

      // Update with results
      setFilesData((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          f.id === fileId ? { ...f, analysis, status: "complete" } : f,
        ),
      }));

      calculateSummary();
    } catch (error) {
      logError(
        `Photo analysis retry failed for ${file.file?.name || file.name}`,
        {
          error,
          fileName: file.file?.name || file.name,
          component: "FilesPhotos",
          action: "photo_analysis_retry",
        },
      );

      let errorMessage = "Retry failed";
      if (error instanceof Error) {
        if (error.message.includes("Rate limit")) {
          errorMessage = "Rate limit exceeded. Please wait before retrying.";
        } else if (error.message.includes("Network")) {
          errorMessage = "Network error. Check your connection.";
        } else {
          errorMessage = error.message || "Retry failed";
        }
      }

      setFilesData((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          f.id === fileId ? { ...f, status: "error", errorMessage } : f,
        ),
      }));
    }
  };

  // Analyze individual photo using AI API
  const analyzePhoto = async (
    fileData: UploadedFile,
  ): Promise<AnalysisResult> => {
    try {
      if (!fileData.file) {
        throw new Error("File object not available");
      }
      const result = await analyzePhotosClient([fileData.file]);

      if (!result.success) {
        logWarn("Photo analysis failed, using fallback", {
          error: result.error,
          component: "FilesPhotos",
          action: "photo_analysis_fallback",
        });
        return {
          windowCount: 0,
          totalArea: 0,
          materials: [],
          damageLevel: "none",
          safetyHazards: [],
          measurements: { height: 0, width: 0, stories: 1 },
        };
      }

      // Transform API response to match our interface
      const apiResult = result.data;

      // Handle case where apiResult might be undefined or have unexpected structure
      if (!apiResult) {
        return {
          windowCount: 0,
          totalArea: 0,
          materials: [],
          damageLevel: "none",
          safetyHazards: [],
          measurements: { height: 0, width: 0, stories: 1 },
        };
      }

      return {
        windowCount: (apiResult as any)?.windows?.count || 0,
        totalArea:
          (apiResult as any)?.measurements?.estimatedSqft ||
          (apiResult as any)?.estimatedSqft ||
          0,
        materials: (apiResult as any)?.materials?.breakdown
          ? Object.entries((apiResult as any).materials.breakdown).map(
              ([type, percentage]) => ({
                type: type.charAt(0).toUpperCase() + type.slice(1),
                percentage: percentage as number,
                condition:
                  (apiResult as any)?.materials?.weathering || "unknown",
              }),
            )
          : [],
        damageLevel: (apiResult as any)?.damage?.severity || "none",
        safetyHazards: (apiResult as any)?.safety?.hazards || [],
        measurements: {
          height:
            (apiResult as any)?.measurements?.buildingHeight ||
            (apiResult as any)?.buildingHeight ||
            0,
          width:
            (apiResult as any)?.measurements?.facadeWidth ||
            (apiResult as any)?.facadeWidth ||
            0,
          stories:
            (apiResult as any)?.measurements?.stories ||
            (apiResult as any)?.stories ||
            1,
        },
      };
    } catch (error) {
      logError("Photo analysis failed", {
        error,
        component: "FilesPhotos",
        action: "photo_analysis",
      });
      // Return fallback data instead of throwing
      return {
        windowCount: 0,
        totalArea: 0,
        materials: [],
        damageLevel: "none",
        safetyHazards: [],
        measurements: { height: 0, width: 0, stories: 1 },
      };
    }
  };

  // Analyze all photos
  const analyzeAllPhotos = async () => {
    setIsAnalyzing(true);
    const photoFiles = filesData.files.filter((f) => f.type === "photo");

    for (const file of photoFiles) {
      if (file.status === "pending") {
        // Update status to analyzing
        setFilesData((prev) => ({
          ...prev,
          files: prev.files.map((f) =>
            f.id === file.id ? { ...f, status: "analyzing" } : f,
          ),
        }));

        try {
          const analysis = await analyzePhoto(file);

          // Update with results
          setFilesData((prev) => ({
            ...prev,
            files: prev.files.map((f) =>
              f.id === file.id ? { ...f, analysis, status: "complete" } : f,
            ),
          }));
        } catch (error) {
          logError(`Failed to analyze ${file.file?.name || file.name}`, {
            error,
            fileName: file.file?.name || file.name,
            component: "FilesPhotos",
            action: "file_analysis",
          });

          // Determine error message based on error type
          let errorMessage = "Analysis failed";
          if (error instanceof Error) {
            if (error.message.includes("Rate limit")) {
              errorMessage =
                "Rate limit exceeded. Please wait before retrying.";
            } else if (error.message.includes("Network")) {
              errorMessage = "Network error. Check your connection.";
            } else if (error.message.includes("Authentication")) {
              errorMessage =
                "Authentication failed. Please refresh and try again.";
            } else if (error.message.includes("file size")) {
              errorMessage = "File too large. Please use a smaller image.";
            } else {
              errorMessage = error.message || "Analysis failed";
            }
          }

          // Mark as error with specific message
          setFilesData((prev) => ({
            ...prev,
            files: prev.files.map((f) =>
              f.id === file.id ? { ...f, status: "error", errorMessage } : f,
            ),
          }));
        }
      }
    }

    setIsAnalyzing(false);
    calculateSummary();
  };

  // Calculate analysis summary
  const calculateSummary = () => {
    const photoFiles = filesData.files.filter((f) => f.type === "photo");
    const analyzedFiles = photoFiles.filter(
      (f) => f.status === "complete" && f.analysis,
    );

    let totalWindows = 0;
    let totalArea = 0;
    const allHazards: string[] = [];
    const materialCounts: Record<string, number> = {};
    const damageLevels: string[] = [];

    analyzedFiles.forEach((file) => {
      if (file.analysis) {
        totalWindows += file.analysis.windowCount || 0;
        totalArea += file.analysis.totalArea || 0;

        if (file.analysis.safetyHazards) {
          allHazards.push(...file.analysis.safetyHazards);
        }

        if (file.analysis.materials) {
          file.analysis.materials.forEach((material: any) => {
            materialCounts[material.type] =
              (materialCounts[material.type] || 0) + material.percentage;
          });
        }

        if (file.analysis.damageLevel) {
          damageLevels.push(file.analysis.damageLevel);
        }
      }
    });

    // Calculate average damage level
    const damageWeight = { none: 0, minor: 1, moderate: 2, severe: 3 };
    const avgDamageScore =
      damageLevels.reduce(
        (sum, level) =>
          sum + (damageWeight[level as keyof typeof damageWeight] || 0),
        0,
      ) / damageLevels.length;
    const avgDamageLevel =
      Object.keys(damageWeight).find(
        (key) =>
          damageWeight[key as keyof typeof damageWeight] ===
          Math.round(avgDamageScore),
      ) || "none";

    setFilesData((prev) => ({
      ...prev,
      analysisComplete:
        analyzedFiles.length === photoFiles.length && photoFiles.length > 0,
      summary: {
        totalPhotos: photoFiles.length,
        analyzedPhotos: analyzedFiles.length,
        totalWindows,
        totalArea,
        avgDamageLevel,
        safetyHazards: [...new Set(allHazards)],
        materials: materialCounts,
      },
    }));
  };

  // Get status icon
  const getStatusIcon = (status: FileData["status"]) => {
    switch (status) {
      case "analyzing":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case "complete":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const handleNext = () => {
    onUpdate({ filesPhotos: filesData });
    onNext();
  };

  // Mobile-specific photo handling
  const handleMobilePhotosChange = (photos: any[]) => {
    const newFileData = photos.map((photo) => ({
      id: photo.id,
      name: photo.file?.name || `photo-${photo.id}`,
      size: photo.file?.size || 0,
      type: photo.file?.type || "image/jpeg",
      url: photo.url,
      uploadedAt: new Date(),
      file: photo.file,
      status: photo.analysis ? ("complete" as const) : ("pending" as const),
      analysis: photo.analysis,
    }));

    setFilesData((prev) => ({
      ...prev,
      files: newFileData,
    }));

    calculateSummary();
  };

  return (
    <ErrorBoundary
      stepId="files-photos"
      stepNumber={3}
      userId={data?.userId}
      flowData={data}
      fallback={
        <div className="p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            File Upload Error
          </h3>
          <p className="text-gray-600 mb-4">
            There was an issue with file uploading or photo analysis. You can
            continue with the estimation without photos.
          </p>
          <Button onClick={onNext} className="mr-2">
            Continue Without Photos
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Files & Photos</h2>
          <p className="text-gray-600 text-sm sm:text-base">
            {isMobile
              ? "Capture or upload building photos for AI analysis."
              : "Upload building photos, videos, plans, and measurements for AI analysis."}
          </p>
        </div>

        {/* Mobile-optimized photo capture */}
        {isMobile ? (
          <MobilePhotoCapture
            onPhotosChange={handleMobilePhotosChange}
            maxPhotos={10}
            enableAIAnalysis={true}
          />
        ) : (
          /* Desktop Upload Area */
          <Card
            className={`border-2 border-dashed p-6 sm:p-8 text-center transition-colors touch-manipulation ${
              dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              accept="image/*,video/*,.pdf"
              onChange={handleFileInputChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer block py-4 touch-manipulation"
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">
                Drop files here or click to upload
              </h3>
              <p className="text-sm sm:text-base text-gray-500">
                Support for photos, videos, plans, and measurement screenshots
              </p>
            </label>
          </Card>
        )}

        {/* Files Grid */}
        {filesData.files.length > 0 && !isMobile && (
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold">
                Uploaded Files ({filesData.files.length})
              </h3>
              <Button
                onClick={analyzeAllPhotos}
                disabled={
                  isAnalyzing ||
                  filesData.files.filter((f) => f.type === "photo").length === 0
                }
                className="flex items-center justify-center w-full sm:w-auto"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 mr-2" />
                )}
                Analyze All Photos
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filesData.files.map((fileData) => {
                const IconComponent =
                  FILE_TYPE_ICONS[getIconType(fileData.type)];

                return (
                  <Card key={fileData.id} className="p-4 relative">
                    <button
                      onClick={() => removeFile(fileData.id)}
                      className="absolute top-2 right-2 p-2 bg-red-100 hover:bg-red-200 rounded-full touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>

                    <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {fileData.type.startsWith("image/") ? (
                        <img
                          src={fileData.url}
                          alt={fileData.file?.name || fileData.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <IconComponent className="w-12 h-12 text-gray-400" />
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {FILE_TYPE_LABELS[
                            fileData.type as keyof typeof FILE_TYPE_LABELS
                          ] || "File"}
                        </span>
                        {getStatusIcon(fileData.status || "pending")}
                      </div>

                      <h4
                        className="text-sm font-medium truncate"
                        title={fileData.file?.name || fileData.name}
                      >
                        {fileData.file?.name || fileData.name}
                      </h4>

                      {/* Analysis Results */}
                      {fileData.analysis && fileData.status === "complete" && (
                        <div className="text-xs space-y-1 bg-gray-50 p-2 rounded">
                          {fileData.analysis.windowCount && (
                            <div>Windows: {fileData.analysis.windowCount}</div>
                          )}
                          {fileData.analysis.totalArea && (
                            <div>
                              Area:{" "}
                              {fileData.analysis.totalArea.toLocaleString()} sq
                              ft
                            </div>
                          )}
                          {fileData.analysis.damageLevel && (
                            <div
                              className={`capitalize ${
                                fileData.analysis.damageLevel === "severe"
                                  ? "text-red-600"
                                  : fileData.analysis.damageLevel === "moderate"
                                    ? "text-yellow-600"
                                    : fileData.analysis.damageLevel === "minor"
                                      ? "text-blue-600"
                                      : "text-green-600"
                              }`}
                            >
                              Damage: {fileData.analysis.damageLevel}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Error Messages */}
                      {fileData.status === "error" && (
                        <div className="text-xs space-y-2 bg-red-50 p-2 rounded border border-red-200">
                          <div className="text-red-600 font-medium">
                            Analysis Failed
                          </div>
                          <div className="text-red-500">
                            {fileData.errorMessage || "Unknown error occurred"}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryAnalysis(fileData.id)}
                            className="w-full text-xs h-8 min-h-[44px] sm:h-6 sm:min-h-[32px] border-red-300 text-red-600 hover:bg-red-50 touch-manipulation"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Retry Analysis
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Analysis Summary */}
        {filesData.summary.analyzedPhotos > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Analysis Summary
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {filesData.summary.analyzedPhotos}/
                  {filesData.summary.totalPhotos}
                </div>
                <div className="text-sm text-gray-500">Photos Analyzed</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filesData.summary.totalWindows}
                </div>
                <div className="text-sm text-gray-500">Total Windows</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {filesData.summary.totalArea.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Total Area (sq ft)</div>
              </div>

              <div className="text-center">
                <div
                  className={`text-2xl font-bold capitalize ${
                    filesData.summary.avgDamageLevel === "severe"
                      ? "text-red-600"
                      : filesData.summary.avgDamageLevel === "moderate"
                        ? "text-yellow-600"
                        : filesData.summary.avgDamageLevel === "minor"
                          ? "text-blue-600"
                          : "text-green-600"
                  }`}
                >
                  {filesData.summary.avgDamageLevel}
                </div>
                <div className="text-sm text-gray-500">Avg Damage</div>
              </div>
            </div>

            {/* Materials Breakdown */}
            {Object.keys(filesData.summary.materials).length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Material Breakdown</h4>
                <div className="space-y-2">
                  {Object.entries(filesData.summary.materials).map(
                    ([material, percentage]) => (
                      <div
                        key={material}
                        className="flex justify-between text-sm"
                      >
                        <span>{material}</span>
                        <span>{Math.round(Number(percentage))}%</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Safety Hazards */}
            {filesData.summary.safetyHazards.length > 0 && (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <span>
                  <strong>Safety Hazards Detected:</strong>{" "}
                  {filesData.summary.safetyHazards.join(", ")}
                </span>
              </Alert>
            )}
          </Card>
        )}

        {/* Navigation - Hidden on mobile (handled by MobileStepNavigation) */}
        {!isMobile && (
          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-6">
            <Button
              variant="outline"
              onClick={onBack}
              className="w-full sm:w-auto"
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={filesData.files.length === 0}
              className="w-full sm:w-auto"
            >
              Continue to Area Map
            </Button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

// PHASE 3 FIX: Memoize to prevent expensive file processing and AI photo analysis
export const FilesPhotos = memo(
  FilesPhotosComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.data?.filesPhotos === nextProps.data?.filesPhotos &&
      prevProps.onUpdate === nextProps.onUpdate &&
      prevProps.onNext === nextProps.onNext &&
      prevProps.onBack === nextProps.onBack
    );
  },
);
