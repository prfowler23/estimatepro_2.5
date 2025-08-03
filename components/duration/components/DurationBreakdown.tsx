import { Clock, Cloud } from "lucide-react";
import { memo } from "react";
import { Badge } from "@/components/ui/badge";

interface ServiceDuration {
  service: string;
  serviceName?: string;
  baseDuration: number;
  weatherImpact: number;
  finalDuration: number;
  confidence: "high" | "medium" | "low";
  dependencies: string[];
}

interface DurationBreakdownProps {
  serviceDurations: ServiceDuration[];
  criticalPath: string[];
  totalBaseDuration: number;
  totalWeatherImpact: number;
  totalDuration: number;
}

const SERVICE_NAMES: Record<string, string> = {
  WC: "Window Cleaning",
  GR: "Glass Restoration",
  BWP: "Building Wash (Pressure)",
  BWS: "Building Wash (Soft)",
  HBW: "High-Rise Building Wash",
  PWF: "Pressure Wash (Flat)",
  HFS: "Hard Floor Scrubbing",
  PC: "Parking Cleaning",
  PWP: "Parking Pressure Wash",
  IW: "Interior Wall Cleaning",
  DC: "Deck Cleaning",
};

export const DurationBreakdown = memo(function DurationBreakdown({
  serviceDurations,
  criticalPath,
  totalBaseDuration,
  totalWeatherImpact,
  totalDuration,
}: DurationBreakdownProps) {
  if (!serviceDurations || serviceDurations.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Service Duration Breakdown
        </h4>
        <p className="text-muted-foreground text-sm">
          No service durations available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Service Duration Breakdown
      </h4>

      <div className="space-y-3">
        {serviceDurations.map((sd) => (
          <div key={sd.service} className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="font-medium">
                {SERVICE_NAMES[sd.service] || sd.serviceName || sd.service}
              </span>
              <Badge
                variant={
                  sd.confidence === "high"
                    ? "default"
                    : sd.confidence === "medium"
                      ? "secondary"
                      : "destructive"
                }
                className="text-xs"
              >
                {sd.confidence} confidence
              </Badge>
              {criticalPath.includes(sd.service) && (
                <Badge variant="destructive" className="text-xs">
                  Critical Path
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                {sd.baseDuration}d base
              </span>
              {sd.weatherImpact > 0 && (
                <span className="text-orange-600 flex items-center gap-1">
                  <Cloud className="w-3 h-3" />+{sd.weatherImpact}d weather
                </span>
              )}
              <span className="font-semibold min-w-[3rem] text-right">
                {sd.finalDuration}d total
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary totals */}
      <div className="border-t pt-3 mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Base Duration:</span>
          <span className="font-medium">{totalBaseDuration} days</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Weather Buffer:</span>
          <span className="font-medium text-orange-600">
            +{totalWeatherImpact} days
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Parallel Work Savings:</span>
          <span className="font-medium text-green-600">
            -
            {Math.max(
              0,
              totalBaseDuration + totalWeatherImpact - totalDuration,
            )}{" "}
            days
          </span>
        </div>
        <div className="flex justify-between font-semibold text-base border-t pt-2">
          <span>Project Total:</span>
          <span>{totalDuration} days</span>
        </div>
      </div>
    </div>
  );
});
