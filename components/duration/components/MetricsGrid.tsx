import { Calendar, TrendingUp, Cloud } from "lucide-react";
import { memo } from "react";

interface MetricsGridProps {
  startDate: Date;
  endDate: Date;
  confidence: number;
  weatherRiskScore: number;
}

export const MetricsGrid = memo(function MetricsGrid({
  startDate,
  endDate,
  confidence,
  weatherRiskScore,
}: MetricsGridProps) {
  const getConfidenceColor = (conf: number): string => {
    if (conf >= 80) return "text-green-600";
    if (conf >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getWeatherRiskLabel = (risk: number): string => {
    if (risk < 0.3) return "Low Risk";
    if (risk < 0.6) return "Medium Risk";
    return "High Risk";
  };

  // Add validation for dates
  const formatDate = (date: Date): string => {
    if (!date || isNaN(date.getTime())) {
      return "Invalid Date";
    }
    return date.toLocaleDateString();
  };

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
        <p className="font-semibold">{getWeatherRiskLabel(weatherRiskScore)}</p>
      </div>
    </div>
  );
});
