import { AlertTriangle } from "lucide-react";
import { memo } from "react";

interface CriticalPathAnalysisProps {
  criticalPath: string[];
  criticalPathDuration: number;
}

export const CriticalPathAnalysis = memo(function CriticalPathAnalysis({
  criticalPath,
  criticalPathDuration,
}: CriticalPathAnalysisProps) {
  if (!criticalPath || criticalPath.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h4 className="font-semibold mb-2 flex items-center gap-2 text-red-800">
        <AlertTriangle className="w-4 h-4" />
        Critical Path Analysis
      </h4>
      <div className="text-sm space-y-2">
        <p className="text-red-700">
          Critical path duration:{" "}
          <span className="font-semibold">{criticalPathDuration} days</span>
        </p>
        <p className="text-red-600">
          Services on critical path: {criticalPath.join(", ")}
        </p>
        <p className="text-red-600 text-xs">
          Delays to these services will directly impact the project completion
          date.
        </p>
      </div>
    </div>
  );
});
