import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Upload,
  SwitchCamera,
  Flashlight,
  FlashlightOff,
  Grid3X3,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CameraState } from "../hooks/useCamera";

interface PhotoCaptureControlsProps {
  canAddMore: boolean;
  maxPhotos: number;
  cameraInputRef: React.RefObject<HTMLInputElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  showCameraControls: boolean;
  isMobile: boolean;
  cameraState: CameraState;
  switchCamera: () => void;
  toggleFlash: () => void;
  toggleGrid: () => void;
  setShowFullscreen: (show: boolean) => void;
}

export const PhotoCaptureControls: React.FC<PhotoCaptureControlsProps> = ({
  canAddMore,
  maxPhotos,
  cameraInputRef,
  fileInputRef,
  showCameraControls,
  isMobile,
  cameraState,
  switchCamera,
  toggleFlash,
  toggleGrid,
  setShowFullscreen,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
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
              cameraState.flashEnabled ? "bg-yellow-100 border-yellow-300" : "",
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
    </div>
  );
};
