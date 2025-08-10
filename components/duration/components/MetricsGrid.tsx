import { Calendar, TrendingUp, Cloud } from "lucide-react";
import { memo } from "react";
import type { MetricsGridProps } from "../types";
import { getConfidenceColor, getRiskLabel, formatDate } from "../constants";

export const MetricsGrid = memo(function MetricsGrid({
  startDate,
  endDate,
  confidence,
  weatherRiskScore,
}: MetricsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium">Start Date</span>
        </div>
        <p className="font-semibold">{formatDate(startDate)}</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium">End Date</span>
        </div>
        <p className="font-semibold">{formatDate(endDate)}</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium">Confidence</span>
        </div>
        <p className={`font-semibold ${getConfidenceColor(confidence)}`}>
          {confidence}%
        </p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Cloud className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium">Weather Risk</span>
        </div>
        <p className="font-semibold">{getRiskLabel(weatherRiskScore)}</p>
      </div>
    </div>
  );
});
