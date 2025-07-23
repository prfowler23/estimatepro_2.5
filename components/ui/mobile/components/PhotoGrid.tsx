import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, RefreshCw, CheckCircle, Crop } from "lucide-react";
import { CapturedPhoto } from "../MobilePhotoCapture";

interface PhotoGridProps {
  photos: CapturedPhoto[];
  showFullscreen: boolean;
  isAnalyzing: string | null;
  compressionProgress: Record<string, number>;
  retryAnalysis: (photo: CapturedPhoto) => void;
  removePhoto: (photoId: string) => void;
  formatFileSize: (bytes: number) => string;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  showFullscreen,
  isAnalyzing,
  compressionProgress,
  retryAnalysis,
  removePhoto,
  formatFileSize,
}) => {
  return (
    <AnimatePresence>
      {photos.length > 0 && (
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden group">
                <div className="aspect-square relative">
                  <img
                    src={showFullscreen ? photo.url : photo.thumbnail}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />

                  {photo.status === "processing" && (
                    <motion.div
                      className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="text-center text-white">
                        <motion.div
                          className="rounded-full h-8 w-8 border-2 border-white border-t-transparent mx-auto mb-2"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                        <p className="text-xs">
                          {isAnalyzing === photo.id
                            ? "Analyzing..."
                            : "Processing..."}
                        </p>
                        {compressionProgress[photo.id] && (
                          <div className="mt-1">
                            <div className="w-16 bg-gray-700 rounded-full h-1 mx-auto">
                              <motion.div
                                className="bg-white h-1 rounded-full"
                                style={{
                                  width: `${compressionProgress[photo.id]}%`,
                                }}
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${compressionProgress[photo.id]}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  <div className="absolute top-2 right-2 flex gap-1">
                    {photo.status === "error" && (
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryAnalysis(photo)}
                          className="h-7 w-7 p-0 rounded-full bg-yellow-500 hover:bg-yellow-600 border-none"
                          title="Retry Analysis"
                        >
                          <RefreshCw className="w-3 h-3 text-white" />
                        </Button>
                      </motion.div>
                    )}

                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removePhoto(photo.id)}
                        className="h-7 w-7 p-0 rounded-full"
                        title="Remove Photo"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </motion.div>
                  </div>

                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {photo.status === "analyzed" && photo.analysis && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500 }}
                      >
                        <Badge
                          variant="secondary"
                          className="text-xs bg-green-500 text-white"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          AI ✓
                        </Badge>
                      </motion.div>
                    )}

                    {photo.compressionApplied && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-blue-100 text-blue-700"
                      >
                        <Crop className="w-3 h-3 mr-1" />
                        Compressed
                      </Badge>
                    )}

                    {photo.metadata.location && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-purple-100 text-purple-700"
                      >
                        📍 Located
                      </Badge>
                    )}
                  </div>

                  <div className="absolute bottom-1 left-1 right-1">
                    <div className="bg-black bg-opacity-50 text-white text-xs p-1 rounded text-center">
                      {formatFileSize(photo.metadata.size)}
                      {photo.analysis?.confidence && (
                        <span className="ml-2">
                          ⚡ {Math.round(photo.analysis.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {photo.analysis && (
                  <motion.div
                    className="p-3 space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="text-xs space-y-1">
                      {photo.analysis.buildingType && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Building:</span>
                          <span className="font-medium text-right">
                            {photo.analysis.buildingType}
                          </span>
                        </div>
                      )}
                      {photo.analysis.estimatedArea && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Area:</span>
                          <span className="font-medium text-right">
                            {photo.analysis.estimatedArea}
                          </span>
                        </div>
                      )}
                      {photo.analysis.condition && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Condition:</span>
                          <span
                            className={`font-medium text-right ${
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
                      {photo.analysis.confidence && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Confidence:</span>
                          <div className="flex items-center gap-2">
                            <div className="w-8 bg-gray-200 rounded-full h-1">
                              <div
                                className="bg-blue-500 h-1 rounded-full"
                                style={{
                                  width: `${photo.analysis.confidence * 100}%`,
                                }}
                              />
                            </div>
                            <span className="font-medium text-right">
                              {Math.round(photo.analysis.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                      {photo.analysis.processingTime && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Processed in:</span>
                          <span className="font-medium text-right">
                            {(photo.analysis.processingTime / 1000).toFixed(1)}s
                          </span>
                        </div>
                      )}
                    </div>

                    {photo.analysis.surfaces &&
                      photo.analysis.surfaces.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-600 mb-2">
                            Surfaces detected:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {photo.analysis.surfaces.map((surface, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                              >
                                <Badge variant="outline" className="text-xs">
                                  {surface}
                                </Badge>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                    {photo.analysis.recommendations &&
                      photo.analysis.recommendations.length > 0 && (
                        <div className="mt-2 p-2 bg-blue-50 rounded">
                          <p className="text-xs font-medium text-blue-800 mb-1">
                            AI Recommendations:
                          </p>
                          <ul className="text-xs text-blue-700 space-y-0.5">
                            {photo.analysis.recommendations
                              .slice(0, 2)
                              .map((rec, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-1"
                                >
                                  <span className="text-blue-500 text-xs mt-0.5">
                                    •
                                  </span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                  </motion.div>
                )}
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
