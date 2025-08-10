"use client";

// PHASE 3 FIX: Enhanced mobile camera integration with advanced features
import React, { useState, useRef, useCallback, useEffect } from "react";
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
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  Grid3X3,
  Crop,
  RefreshCw,
  CheckCircle,
  Timer,
  Settings,
  Maximize2,
  Volume2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { cn } from "@/lib/utils";
import { PhotoGrid } from "./components/PhotoGrid";

// PHASE 3 FIX: Enhanced photo interface with camera metadata and compression
export interface CapturedPhoto {
  id: string;
  file: File;
  url: string;
  thumbnail: string;
  timestamp: number;
  metadata: {
    width: number;
    height: number;
    size: number;
    type: string;
    orientation?: string;
    location?: GeolocationCoordinates;
    deviceInfo?: string;
  };
  analysis?: {
    buildingType?: string;
    surfaces?: string[];
    estimatedArea?: string;
    condition?: string;
    recommendations?: string[];
    confidence?: number;
    processingTime?: number;
  };
  status: "capturing" | "processing" | "analyzed" | "error";
  compressionApplied?: boolean;
}

// PHASE 3 FIX: Enhanced props with camera controls and quality settings
interface MobilePhotoCaptureProps {
  onPhotosChange: (photos: CapturedPhoto[]) => void;
  maxPhotos?: number;
  enableAIAnalysis?: boolean;
  className?: string;
  autoCompress?: boolean;
  maxFileSize?: number; // in bytes
  imageQuality?: number; // 0.1 to 1.0
  enableLocation?: boolean;
  showCameraControls?: boolean;
  gridLines?: boolean;
  flashMode?: "auto" | "on" | "off";
  onCameraError?: (error: string) => void;
  onAnalysisComplete?: (photo: CapturedPhoto, analysis: any) => void;
}

// PHASE 3 FIX: Camera control state interface
interface CameraState {
  isActive: boolean;
  facingMode: "user" | "environment";
  flashEnabled: boolean;
  gridEnabled: boolean;
  stream: MediaStream | null;
  error: string | null;
  permissions: {
    camera: boolean;
    location: boolean;
  };
}

export function MobilePhotoCapture({
  onPhotosChange,
  maxPhotos = 10,
  enableAIAnalysis = true,
  className = "",
  autoCompress = true,
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  imageQuality = 0.8,
  enableLocation = true,
  showCameraControls = true,
  gridLines = true,
  flashMode = "auto",
  onCameraError,
  onAnalysisComplete,
}: MobilePhotoCaptureProps) {
  const { isMobile, platform, touchDevice } = useMobileDetection();
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<
    Record<string, number>
  >({});

  // PHASE 3 FIX: Enhanced camera state management
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    facingMode: "environment",
    flashEnabled: flashMode === "on",
    gridEnabled: gridLines,
    stream: null,
    error: null,
    permissions: {
      camera: false,
      location: false,
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // PHASE 3 FIX: Enhanced file processing with compression and metadata extraction
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

      if (file.size > maxFileSize) {
        setError(
          `Image size must be less than ${Math.round(maxFileSize / 1024 / 1024)}MB.`,
        );
        continue;
      }

      const photoId = `photo-${Date.now()}-${i}`;

      // Get location if enabled
      let location: GeolocationCoordinates | undefined;
      if (enableLocation && navigator.geolocation) {
        try {
          const position = await getCurrentPosition();
          location = position.coords;
        } catch (err) {
          console.log("Location access denied or unavailable");
        }
      }

      // Extract image metadata
      const { width, height } = await getImageDimensions(file);

      // Create thumbnail and apply compression if needed
      const { compressedFile, thumbnail } = await processImage(file, photoId);

      const photo: CapturedPhoto = {
        id: photoId,
        file: compressedFile,
        url: URL.createObjectURL(compressedFile),
        thumbnail,
        timestamp: Date.now(),
        metadata: {
          width,
          height,
          size: compressedFile.size,
          type: compressedFile.type,
          location,
          deviceInfo: `${platform} - ${navigator.userAgent.split("(")[1]?.split(")")[0] || "Unknown"}`,
        },
        status: "processing",
        compressionApplied: compressedFile.size !== file.size,
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

  // PHASE 3 FIX: Image processing utilities
  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 5000,
        maximumAge: 300000, // 5 minutes
        enableHighAccuracy: false,
      });
    });
  };

  const getImageDimensions = (
    file: File,
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const processImage = async (
    file: File,
    photoId: string,
  ): Promise<{ compressedFile: File; thumbnail: string }> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new Image();

      img.onload = () => {
        // Determine target dimensions
        const maxWidth = 1920;
        const maxHeight = 1920;
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Main canvas for compressed image
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Create thumbnail
        const thumbCanvas = document.createElement("canvas");
        const thumbCtx = thumbCanvas.getContext("2d")!;
        const thumbSize = 200;
        thumbCanvas.width = thumbSize;
        thumbCanvas.height = thumbSize;

        const scale = Math.min(thumbSize / width, thumbSize / height);
        const thumbWidth = width * scale;
        const thumbHeight = height * scale;
        const offsetX = (thumbSize - thumbWidth) / 2;
        const offsetY = (thumbSize - thumbHeight) / 2;

        thumbCtx.fillStyle = "#f3f4f6";
        thumbCtx.fillRect(0, 0, thumbSize, thumbSize);
        thumbCtx.drawImage(img, offsetX, offsetY, thumbWidth, thumbHeight);

        const thumbnail = thumbCanvas.toDataURL("image/jpeg", 0.7);

        // Convert to compressed file if auto-compress is enabled
        if (autoCompress) {
          setCompressionProgress({ [photoId]: 50 });

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                setCompressionProgress({ [photoId]: 100 });
                setTimeout(() => setCompressionProgress({}), 2000);
                resolve({ compressedFile, thumbnail });
              } else {
                resolve({ compressedFile: file, thumbnail });
              }
            },
            "image/jpeg",
            imageQuality,
          );
        } else {
          resolve({ compressedFile: file, thumbnail });
        }
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // PHASE 3 FIX: Enhanced AI analysis with progress tracking and error recovery
  const analyzePhotos = async (photosToAnalyze: CapturedPhoto[]) => {
    for (const photo of photosToAnalyze) {
      setIsAnalyzing(photo.id);

      // Update photo status to processing
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

        // Include metadata for better analysis
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

        // Update photo with analysis results
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id
              ? { ...p, analysis: enhancedAnalysis, status: "analyzed" }
              : p,
          ),
        );

        // Trigger completion callback
        onAnalysisComplete?.(photo, enhancedAnalysis);

        // Haptic feedback on successful analysis
        if (touchDevice && "vibrate" in navigator) {
          navigator.vibrate(50);
        }
      } catch (error) {
        console.error("Photo analysis failed:", error);

        // Update photo status to error
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

        // Show user-friendly error message
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Analysis failed - you can retry or continue without analysis";
        setError(errorMessage);

        onCameraError?.(errorMessage);
      } finally {
        setIsAnalyzing(null);
      }
    }
  };

  // PHASE 3 FIX: Retry analysis for failed photos
  const retryAnalysis = async (photo: CapturedPhoto) => {
    await analyzePhotos([photo]);
  };

  // Enhanced photo management with optimized cleanup and animations
  const removePhoto = useCallback(
    (photoId: string) => {
      const photoToRemove = photos.find((p) => p.id === photoId);
      const updatedPhotos = photos.filter((p) => p.id !== photoId);

      // Update state immediately for better UX
      setPhotos(updatedPhotos);
      onPhotosChange(updatedPhotos);

      // Clean up object URLs asynchronously to prevent blocking
      if (photoToRemove) {
        const scheduleCleanup =
          typeof window !== "undefined" && "requestIdleCallback" in window
            ? requestIdleCallback
            : (callback: () => void) => setTimeout(callback, 0);

        scheduleCleanup(() => {
          cleanupPhotoUrls([photoToRemove]);
        });
      }

      // Clean up compression progress
      setCompressionProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[photoId];
        return newProgress;
      });

      // Haptic feedback
      if (touchDevice && "vibrate" in navigator) {
        navigator.vibrate(30);
      }
    },
    [photos, onPhotosChange, touchDevice, cleanupPhotoUrls],
  );

  const retakePhoto = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  // PHASE 3 FIX: Enhanced camera controls
  const switchCamera = () => {
    setCameraState((prev) => ({
      ...prev,
      facingMode: prev.facingMode === "user" ? "environment" : "user",
    }));
  };

  const toggleFlash = () => {
    setCameraState((prev) => ({ ...prev, flashEnabled: !prev.flashEnabled }));
  };

  const toggleGrid = () => {
    setCameraState((prev) => ({ ...prev, gridEnabled: !prev.gridEnabled }));
  };

  const canAddMore = photos.length < maxPhotos;
  const hasPhotos = photos.length > 0;
  const analyzedPhotos = photos.filter((p) => p.status === "analyzed");
  const processingPhotos = photos.filter((p) => p.status === "processing");
  const errorPhotos = photos.filter((p) => p.status === "error");

  // Enhanced cleanup with memory management
  const cleanupPhotoUrls = useCallback((photosToCleanup: CapturedPhoto[]) => {
    photosToCleanup.forEach((photo) => {
      if (photo.url && photo.url.startsWith("blob:")) {
        URL.revokeObjectURL(photo.url);
      }
      if (photo.thumbnail && photo.thumbnail.startsWith("blob:")) {
        URL.revokeObjectURL(photo.thumbnail);
      }
    });
  }, []);

  // Cleanup on unmount and when photos change
  useEffect(() => {
    return () => {
      cleanupPhotoUrls(photos);
    };
  }, [cleanupPhotoUrls, photos]);

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

      {/* PHASE 3 FIX: Enhanced photo capture controls with camera options */}
      <div className="space-y-4">
        <div className="flex gap-2">
          {/* Camera Capture */}
          <motion.div className="flex-1">
            <Button
              onClick={() => cameraInputRef.current?.click()}
              disabled={!canAddMore}
              className="w-full relative overflow-hidden"
              size="lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Camera className="w-5 h-5 mr-2" />
              Take Photo
              {!canAddMore && (
                <Badge className="ml-2 bg-red-500 text-white text-xs">
                  Max {maxPhotos}
                </Badge>
              )}
            </Button>
          </motion.div>

          {/* File Upload */}
          <motion.div className="flex-1">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={!canAddMore}
              variant="outline"
              className="w-full"
              size="lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload
            </Button>
          </motion.div>
        </div>

        {/* PHASE 3 FIX: Advanced camera controls for mobile */}
        {showCameraControls && isMobile && (
          <motion.div
            className="grid grid-cols-4 gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={switchCamera}
              className="p-2"
              title="Switch Camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleFlash}
              className={cn(
                "p-2",
                cameraState.flashEnabled
                  ? "bg-yellow-100 border-yellow-300"
                  : "",
              )}
              title={`Flash ${cameraState.flashEnabled ? "On" : "Off"}`}
            >
              {cameraState.flashEnabled ? (
                <Flashlight className="w-4 h-4 text-yellow-600" />
              ) : (
                <FlashlightOff className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleGrid}
              className={cn(
                "p-2",
                cameraState.gridEnabled ? "bg-blue-100 border-blue-300" : "",
              )}
              title={`Grid ${cameraState.gridEnabled ? "On" : "Off"}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFullscreen(true)}
              className="p-2"
              title="Fullscreen Camera"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {/* PHASE 3 FIX: Enhanced status display */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="text-gray-600">
              {photos.length} of {maxPhotos} photos
            </span>
            {processingPhotos.length > 0 && (
              <Badge variant="secondary" className="text-xs animate-pulse">
                <Timer className="w-3 h-3 mr-1" />
                Processing {processingPhotos.length}
              </Badge>
            )}
            {analyzedPhotos.length > 0 && (
              <Badge
                variant="secondary"
                className="text-xs bg-green-100 text-green-800"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Analyzed {analyzedPhotos.length}
              </Badge>
            )}
            {errorPhotos.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                {errorPhotos.length} Failed
              </Badge>
            )}
          </div>
          {enableAIAnalysis && (
            <Badge variant="secondary" className="text-xs">
              <Camera className="w-3 h-3 mr-1" />
              AI Analysis
            </Badge>
          )}
        </div>

        {/* PHASE 3 FIX: File size and compression info */}
        {autoCompress && hasPhotos && (
          <motion.div
            className="text-xs text-gray-500 text-center p-2 bg-gray-50 rounded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Crop className="w-3 h-3" />
              Auto-compression enabled (Quality:{" "}
              {Math.round(imageQuality * 100)}%)
            </div>
            <div>
              Total size:{" "}
              {formatFileSize(
                photos.reduce((sum, p) => sum + p.metadata.size, 0),
              )}
              {photos.some((p) => p.compressionApplied) && (
                <span className="text-green-600 ml-1">⚡ Optimized</span>
              )}
            </div>
          </motion.div>
        )}
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

      {/* PHASE 3 FIX: Enhanced photo grid with animations and advanced features */}
      <PhotoGrid
        photos={photos}
        showFullscreen={showFullscreen}
        isAnalyzing={isAnalyzing}
        compressionProgress={compressionProgress}
        retryAnalysis={retryAnalysis}
        removePhoto={removePhoto}
        formatFileSize={formatFileSize}
      />

      {/* PHASE 3 FIX: Enhanced photo tips with animations */}
      <AnimatePresence>
        {photos.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, delay: 0.5 }}
                >
                  <Camera className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                </motion.div>
                <motion.h3
                  className="font-semibold text-blue-900 mb-2 text-base"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  Take Project Photos
                </motion.h3>
                <motion.p
                  className="text-sm text-blue-700 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  Capture clear photos of the work area for AI-powered accurate
                  estimates.
                </motion.p>
                <motion.div
                  className="grid grid-cols-2 gap-2 text-xs text-blue-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 }}
                >
                  <div className="flex items-center gap-1">
                    <span>📸</span>
                    <span>Building facade & windows</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>📐</span>
                    <span>Show scale references</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>☀️</span>
                    <span>Good lighting conditions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>🔍</span>
                    <span>Damage & special areas</span>
                  </div>
                </motion.div>

                {isMobile && showCameraControls && (
                  <motion.div
                    className="mt-4 p-3 bg-white bg-opacity-50 rounded-lg"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.3 }}
                  >
                    <div className="flex items-center justify-center gap-2 text-xs text-blue-700">
                      <Settings className="w-4 h-4" />
                      <span>Use camera controls above for best results</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHASE 3 FIX: Enhanced AI Analysis Summary with detailed metrics */}
      <AnimatePresence>
        {analyzedPhotos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                    }}
                  >
                    <Camera className="w-4 h-4 text-green-600" />
                  </motion.div>
                  <span className="font-semibold text-green-900">
                    AI Analysis Complete
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
                  {analyzedPhotos.length}/{photos.length}
                </Badge>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-green-700">
                  {analyzedPhotos.length} photo
                  {analyzedPhotos.length !== 1 ? "s" : ""} analyzed
                  successfully. Results will be used for automatic measurements
                  and service recommendations.
                </p>

                {/* PHASE 3 FIX: Analysis metrics */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="text-center p-2 bg-white bg-opacity-50 rounded">
                    <div className="font-semibold text-green-800">
                      {Math.round(
                        (analyzedPhotos.reduce(
                          (sum, p) => sum + (p.analysis?.confidence || 0),
                          0,
                        ) /
                          analyzedPhotos.length) *
                          100,
                      )}
                      %
                    </div>
                    <div className="text-green-600">Avg Confidence</div>
                  </div>
                  <div className="text-center p-2 bg-white bg-opacity-50 rounded">
                    <div className="font-semibold text-green-800">
                      {Math.round(
                        (analyzedPhotos.reduce(
                          (sum, p) => sum + (p.analysis?.processingTime || 0),
                          0,
                        ) /
                          analyzedPhotos.length /
                          1000) *
                          10,
                      ) / 10}
                      s
                    </div>
                    <div className="text-green-600">Avg Process Time</div>
                  </div>
                  <div className="text-center p-2 bg-white bg-opacity-50 rounded">
                    <div className="font-semibold text-green-800">
                      {formatFileSize(
                        analyzedPhotos.reduce(
                          (sum, p) => sum + p.metadata.size,
                          0,
                        ),
                      )}
                    </div>
                    <div className="text-green-600">Total Size</div>
                  </div>
                </div>

                {/* PHASE 3 FIX: Quick insights */}
                {analyzedPhotos.some(
                  (p) => p.analysis?.recommendations?.length,
                ) && (
                  <motion.div
                    className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2 className="w-3 h-3 text-blue-600" />
                      <span className="text-xs font-medium text-blue-800">
                        Key Insights
                      </span>
                    </div>
                    <div className="text-xs text-blue-700">
                      AI has detected{" "}
                      {
                        analyzedPhotos.filter((p) => p.analysis?.buildingType)
                          .length
                      }{" "}
                      building types,{" "}
                      {
                        analyzedPhotos.filter(
                          (p) => p.analysis?.surfaces?.length,
                        ).length
                      }{" "}
                      surface analyses, and{" "}
                      {analyzedPhotos.reduce(
                        (sum, p) =>
                          sum + (p.analysis?.recommendations?.length || 0),
                        0,
                      )}{" "}
                      recommendations.
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // PHASE 3 FIX: File size formatting utility
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }
}

export default MobilePhotoCapture;
