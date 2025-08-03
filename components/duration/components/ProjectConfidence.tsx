import { CheckCircle, Info, AlertTriangle } from "lucide-react";
import { memo } from "react";

interface ProjectConfidenceProps {
  confidence: number;
  highConfidenceServices: number;
  lowConfidenceServices: number;
}

export const ProjectConfidence = memo(function ProjectConfidence({
  confidence,
  highConfidenceServices,
  lowConfidenceServices,
}: ProjectConfidenceProps) {
  const getConfidenceColor = (conf: number): string => {
    if (conf >= 80) return "text-green-600";
    if (conf >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 text-center border">
      <div className="flex items-center justify-center gap-2 mb-2">
        {confidence >= 80 ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : confidence >= 60 ? (
          <Info className="w-5 h-5 text-yellow-500" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-red-500" />
        )}
        <span className="font-semibold">
          Overall Confidence:{" "}
          <span className={getConfidenceColor(confidence)}>{confidence}%</span>
        </span>
      </div>

      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          Based on {highConfidenceServices} high-confidence and{" "}
          {lowConfidenceServices} low-confidence services
        </p>
        <p>Historical weather data and current forecast analysis included</p>
        {confidence < 70 && (
          <p className="text-yellow-600 font-medium">
            Consider adding more detailed measurements to improve accuracy
          </p>
        )}
      </div>
    </div>
  );
});
