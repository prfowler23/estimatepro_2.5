import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Ruler, Check, X } from "lucide-react";
import { Point, Scale, ScaleSetterProps } from "./types";

export function ScaleSetter({ scale, onScaleChange }: ScaleSetterProps) {
  const [isSettingScale, setIsSettingScale] = useState(false);
  const [referenceLength, setReferenceLength] = useState(10);
  const [pixelLength, setPixelLength] = useState(0);
  const [scalePoints, setScalePoints] = useState<Point[]>([]);
  const [measurementComplete, setMeasurementComplete] = useState(false);

  const startScaleSetting = useCallback(() => {
    setIsSettingScale(true);
    setScalePoints([]);
    setPixelLength(0);
    setMeasurementComplete(false);
  }, []);

  const cancelScaleSetting = useCallback(() => {
    setIsSettingScale(false);
    setScalePoints([]);
    setPixelLength(0);
    setMeasurementComplete(false);
  }, []);

  const handleScaleClick = useCallback(
    (point: Point) => {
      if (!isSettingScale) return;

      if (scalePoints.length === 0) {
        setScalePoints([point]);
      } else if (scalePoints.length === 1) {
        const distance = Math.sqrt(
          Math.pow(point.x - scalePoints[0].x, 2) +
            Math.pow(point.y - scalePoints[0].y, 2),
        );

        setPixelLength(distance);
        setScalePoints([...scalePoints, point]);
        setMeasurementComplete(true);
      }
    },
    [isSettingScale, scalePoints],
  );

  const confirmScale = useCallback(() => {
    if (pixelLength > 0 && referenceLength > 0) {
      const pixelsPerFoot = pixelLength / referenceLength;
      onScaleChange({ pixelsPerFoot });
      setIsSettingScale(false);
      setScalePoints([]);
      setPixelLength(0);
      setMeasurementComplete(false);
    }
  }, [pixelLength, referenceLength, onScaleChange]);

  const resetMeasurement = useCallback(() => {
    setScalePoints([]);
    setPixelLength(0);
    setMeasurementComplete(false);
  }, []);

  // Handler exposed through props

  return (
    <Card className="p-4 min-w-[280px]">
      <h3 className="font-semibold mb-3 flex items-center">
        <Ruler className="w-4 h-4 mr-2" />
        Scale Calibration
      </h3>

      {/* Current Scale Display */}
      {scale && !isSettingScale && (
        <div className="mb-3 p-2 bg-green-50 rounded">
          <p className="text-sm text-green-700">
            Current scale: {scale.pixelsPerFoot.toFixed(2)} pixels per foot
          </p>
          <p className="text-xs text-green-600">
            1 foot = {scale.pixelsPerFoot.toFixed(1)} pixels
          </p>
        </div>
      )}

      {!isSettingScale ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Set a reference measurement to calibrate the map scale for accurate
            area calculations.
          </p>
          <Button onClick={startScaleSetting} className="w-full">
            <Ruler className="w-4 h-4 mr-2" />
            Set Reference Scale
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Instructions */}
          <div className="space-y-2">
            {scalePoints.length === 0 && (
              <p className="text-sm text-blue-600 font-medium">
                Step 1: Click the first point of a known distance
              </p>
            )}
            {scalePoints.length === 1 && (
              <p className="text-sm text-blue-600 font-medium">
                Step 2: Click the second point to complete the measurement
              </p>
            )}
            {measurementComplete && (
              <p className="text-sm text-green-600 font-medium">
                ✓ Measurement complete! Confirm the scale below.
              </p>
            )}
          </div>

          {/* Reference Length Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Distance between points:
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={referenceLength}
                onChange={(e) => setReferenceLength(Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter distance"
              />
              <span className="text-sm text-gray-600">feet</span>
            </div>
          </div>

          {/* Measurement Display */}
          {pixelLength > 0 && (
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-700">
                <strong>Pixel distance:</strong> {pixelLength.toFixed(1)} pixels
              </p>
              <p className="text-sm text-gray-700">
                <strong>Reference distance:</strong> {referenceLength} feet
              </p>
              <p className="text-sm text-gray-700">
                <strong>Calculated scale:</strong>{" "}
                {(pixelLength / referenceLength).toFixed(2)} pixels/foot
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {measurementComplete ? (
              <>
                <Button
                  onClick={confirmScale}
                  className="flex-1"
                  disabled={referenceLength <= 0}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Confirm Scale
                </Button>
                <Button variant="outline" onClick={resetMeasurement}>
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={cancelScaleSetting}
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Click on two points with a known distance apart</p>
            <p>• Use scale bars, building dimensions, or other references</p>
            <p>• Accurate scale ensures precise area calculations</p>
          </div>
        </div>
      )}

      {/* Quick Scale Presets */}
      {!isSettingScale && (
        <div className="mt-4 pt-3 border-t">
          <p className="text-xs text-gray-500 mb-2">Quick scale presets:</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onScaleChange({ pixelsPerFoot: 10 })}
              className="text-xs"
            >
              1&quot; = 10&apos;
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onScaleChange({ pixelsPerFoot: 20 })}
              className="text-xs"
            >
              1&quot; = 5&apos;
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onScaleChange({ pixelsPerFoot: 5 })}
              className="text-xs"
            >
              1&quot; = 20&apos;
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onScaleChange({ pixelsPerFoot: 50 })}
              className="text-xs"
            >
              1&quot; = 2&apos;
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
