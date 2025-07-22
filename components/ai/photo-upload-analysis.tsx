import { useState, useCallback, useRef } from "react";
import { Button, Card, Progress, Alert } from "@/components/ui";
import {
  Upload,
  Image,
  FileText,
  Video,
  Map,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  Eye,
  BarChart3,
  Clock,
} from "lucide-react";
import { analyzePhotosClient, AI_FALLBACKS } from "@/lib/ai/client-utils";

interface FileData {
  id: string;
  file: File;
  type: "photo" | "video" | "area_map" | "measurement_screenshot" | "plan";
  url: string;
  uploaded?: boolean;
  photoId?: string;
  analysis?: {
    windows?: {
      count: number;
      totalArea: number;
      gridPattern: string;
      confidence: number;
    };
    materials?: {
      breakdown: Record<string, number>;
      conditions: string[];
      cleaningDifficulty: number;
    };
    measurements?: {
      buildingHeight: number;
      facadeWidth: number;
      confidence: number;
    };
    damage?: {
      staining: string[];
      oxidation: string[];
      etching: string[];
      other: string[];
    };
  };
}

interface AnalysisProgress {
  totalPhotos: number;
  processedPhotos: number;
  currentStep: string;
  isComplete: boolean;
  errors: string[];
}

export function PhotoUploadAnalysis({
  data,
  onUpdate,
  onNext,
  onBack,
  estimateId,
}: {
  data?: FileData[];
  onUpdate: (data: { files: FileData[] }) => void;
  onNext: () => void;
  onBack: () => void;
  estimateId?: string;
}) {
  const [files, setFiles] = useState<FileData[]>(data || []);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress>({
    totalPhotos: 0,
    processedPhotos: 0,
    currentStep: "",
    isComplete: false,
    errors: [],
  });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createFileData = useCallback((file: File): FileData => {
    const url = URL.createObjectURL(file);
    let type: FileData["type"] = "photo";

    if (file.type.startsWith("video/")) type = "video";
    else if (file.name.toLowerCase().includes("map")) type = "area_map";
    else if (file.name.toLowerCase().includes("plan")) type = "plan";
    else if (file.name.toLowerCase().includes("measurement"))
      type = "measurement_screenshot";

    return {
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      file,
      type,
      url,
      uploaded: false,
    };
  }, []);

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const newFiles: FileData[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        if (file.type.startsWith("image/")) {
          newFiles.push(createFileData(file));
        }
      }

      if (newFiles.length === 0) {
        setError("Please select valid image files");
        return;
      }

      setFiles((prev) => [...prev, ...newFiles]);
      setError(null);
    },
    [createFileData],
  );

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const analyzePhotos = async () => {
    const photoFiles = files
      .filter((f) => f.type === "photo")
      .map((f) => f.file);

    if (photoFiles.length === 0) {
      setError("Please add photos to analyze");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const result = await analyzePhotosClient(photoFiles, {
        estimateId,
        analysisTypes: ["comprehensive"],
        compress: true,
      });

      if (result.success && result.data) {
        // Update files with analysis results
        setFiles((prev) =>
          prev.map((file) => {
            if (file.type === "photo") {
              const photoIndex = photoFiles.indexOf(file.file);
              const analysisResult = result.data.analysisResults[photoIndex];

              return {
                ...file,
                uploaded: true,
                photoId: result.data.photoIds[photoIndex],
                analysis: analysisResult
                  ? {
                      windows: analysisResult.windows,
                      materials: analysisResult.materials,
                      measurements: analysisResult.measurements,
                      damage: analysisResult.damage,
                    }
                  : undefined,
              };
            }
            return file;
          }),
        );

        setProgress({
          totalPhotos: photoFiles.length,
          processedPhotos: photoFiles.length,
          currentStep: "Analysis complete",
          isComplete: true,
          errors: [],
        });
      } else {
        throw new Error(result.error || "Analysis failed");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Analysis failed";
      setError(errorMessage);
      setProgress((prev) => ({
        ...prev,
        errors: [...prev.errors, errorMessage],
      }));
    } finally {
      setAnalyzing(false);
    }
  };

  const getAnalysisSummary = () => {
    const analyzedFiles = files.filter((f) => f.analysis);
    if (analyzedFiles.length === 0) return null;

    const totalWindows = analyzedFiles.reduce(
      (sum, file) => sum + (file.analysis?.windows?.count || 0),
      0,
    );

    const totalArea = analyzedFiles.reduce(
      (sum, file) => sum + (file.analysis?.windows?.totalArea || 0),
      0,
    );

    const avgHeight =
      analyzedFiles.reduce(
        (sum, file) => sum + (file.analysis?.measurements?.buildingHeight || 0),
        0,
      ) / analyzedFiles.length;

    return {
      totalWindows,
      totalArea,
      avgHeight,
      analyzedCount: analyzedFiles.length,
    };
  };

  const summary = getAnalysisSummary();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Photo Upload & Analysis</h2>
        <p className="text-gray-600">
          Upload photos of the building for AI analysis. We&apos;ll detect
          windows, materials, damage, and provide quantity estimates for your
          estimate.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <strong>Error:</strong> {error}
          </div>
        </Alert>
      )}

      {/* File Upload Area */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors">
        <div
          className="p-8 text-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Upload Building Photos</h3>
          <p className="text-gray-500 mb-4">
            Click to select or drag and drop images here
          </p>
          <Button variant="outline" type="button">
            Select Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>
      </Card>

      {/* File Preview Grid */}
      {files.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            Uploaded Files ({files.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file) => (
              <Card key={file.id} className="relative">
                <div className="aspect-square relative overflow-hidden rounded-lg">
                  <img
                    src={file.url}
                    alt={file.file.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    {file.uploaded && (
                      <div className="bg-green-500 text-white p-1 rounded">
                        <CheckCircle className="h-3 w-3" />
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(file.id)}
                      className="bg-red-500 text-white p-1 rounded hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="p-3">
                  <p className="text-sm font-medium truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {file.type}
                  </p>
                  {file.analysis && (
                    <div className="text-xs text-green-600 mt-1">
                      {file.analysis.windows?.count &&
                        `${file.analysis.windows.count} windows`}
                      {file.analysis.materials?.dominant &&
                        `, ${file.analysis.materials.dominant}`}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Progress */}
      {analyzing && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <div className="flex-1">
              <p className="font-medium">Analyzing Photos...</p>
              <p className="text-sm text-gray-600">
                {progress.currentStep || "Processing images with AI..."}
              </p>
            </div>
          </div>
          {progress.totalPhotos > 0 && (
            <Progress
              value={(progress.processedPhotos / progress.totalPhotos) * 100}
              className="mt-3"
            />
          )}
        </Card>
      )}

      {/* Analysis Summary */}
      {summary && (
        <Card className="p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analysis Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Photos Analyzed</p>
              <p className="text-xl font-bold">{summary.analyzedCount}</p>
            </div>
            <div>
              <p className="text-gray-500">Total Windows</p>
              <p className="text-xl font-bold">{summary.totalWindows}</p>
            </div>
            <div>
              <p className="text-gray-500">Window Area (sq ft)</p>
              <p className="text-xl font-bold">
                {Math.round(summary.totalArea)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Avg Building Height</p>
              <p className="text-xl font-bold">
                {Math.round(summary.avgHeight)}ft
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        {files.length > 0 && !analyzing && (
          <Button
            onClick={analyzePhotos}
            disabled={files.filter((f) => f.type === "photo").length === 0}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Analyze Photos
          </Button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={() => {
            onUpdate({ files });
            onNext();
          }}
          disabled={files.length === 0}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
