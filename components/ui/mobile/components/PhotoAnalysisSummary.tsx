import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Volume2 } from "lucide-react";
import { CapturedPhoto } from "../MobilePhotoCapture";

interface PhotoAnalysisSummaryProps {
  analyzedPhotos: CapturedPhoto[];
  photos: CapturedPhoto[];
  formatFileSize: (bytes: number) => string;
}

export const PhotoAnalysisSummary: React.FC<PhotoAnalysisSummaryProps> = ({
  analyzedPhotos,
  photos,
  formatFileSize,
}) => {
  return (
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
                {analyzedPhotos.length !== 1 ? "s" : ""} analyzed successfully.
                Results will be used for automatic measurements and service
                recommendations.
              </p>

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
                      analyzedPhotos.filter((p) => p.analysis?.surfaces?.length)
                        .length
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
  );
};
