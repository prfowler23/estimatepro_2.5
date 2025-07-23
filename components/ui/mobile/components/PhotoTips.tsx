import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Camera, Settings } from "lucide-react";

interface PhotoTipsProps {
  hasPhotos: boolean;
  isMobile: boolean;
  showCameraControls: boolean;
}

export const PhotoTips: React.FC<PhotoTipsProps> = ({
  hasPhotos,
  isMobile,
  showCameraControls,
}) => {
  return (
    <AnimatePresence>
      {!hasPhotos && (
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
  );
};
