import { Cloud, Info } from "lucide-react";
import { memo } from "react";
import type { WeatherRiskAssessmentProps } from "../types";

export const WeatherRiskAssessment = memo(function WeatherRiskAssessment({
  weatherAnalysis,
  weatherSensitiveServices,
}: WeatherRiskAssessmentProps) {
  const getWeatherRiskColor = (risk: number): string => {
    if (risk < 0.3) return "bg-green-500";
    if (risk < 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (!weatherAnalysis) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Cloud className="w-4 h-4" />
          Weather Risk Assessment
        </h4>
        <p className="text-muted-foreground text-sm">
          No weather data available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Cloud className="w-4 h-4" />
          Weather Risk Assessment
        </h4>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-gray-200 rounded-full">
            <div
              className={`h-full rounded-full ${getWeatherRiskColor(weatherAnalysis.riskScore)}`}
              style={{ width: `${weatherAnalysis.riskScore * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium">
            {Math.round(weatherAnalysis.riskScore * 100)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
        <div>
          <span className="text-muted-foreground">
            Weather-sensitive services:
          </span>
          <span className="font-medium ml-2">{weatherSensitiveServices}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Location:</span>
          <span className="font-medium ml-2">{weatherAnalysis.location}</span>
        </div>
      </div>

      {/* Weather Recommendations */}
      {weatherAnalysis.forecast.recommendations.length > 0 && (
        <div className="space-y-2">
          <h5 className="font-medium text-sm">Recommendations:</h5>
          {weatherAnalysis.forecast.recommendations
            .slice(0, 3)
            .map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Info className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                <span className="text-muted-foreground">{rec}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
});
