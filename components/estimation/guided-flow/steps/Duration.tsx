import { useState, useEffect } from "react";
import { error as logError } from "@/lib/utils/logger";
import {
  Calendar,
  Cloud,
  AlertTriangle,
  Clock,
  TrendingUp,
  Download,
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DurationCalculationService } from "@/lib/duration/calculation-service";
import { WeatherService } from "@/lib/weather/weather-service";
import { TimelineVisualization } from "@/components/duration/TimelineVisualization";
import { DurationSummary } from "@/components/duration/DurationSummary";
import { WeatherImpactChart } from "@/components/duration/WeatherImpactChart";
import { ManualOverride } from "@/components/duration/ManualOverride";
import { CalendarExportService } from "@/lib/duration/calendar-export";
import { DurationStepData } from "@/lib/types/estimate-types";

interface ServiceDuration {
  service: string;
  baseDuration: number;
  weatherImpact: number;
  finalDuration: number;
  startDate: string;
  endDate: string;
  confidence: "high" | "medium" | "low";
  dependencies: string[];
}

interface WeatherAnalysis {
  historical: {
    rainDays: number;
    extremeTempDays: number;
    windyDays: number;
    seasonalRisks: Record<string, number>;
  };
  forecast: {
    nextWeek: Array<{
      date: string;
      risk: "low" | "medium" | "high";
      conditions: string;
    }>;
    nextMonth: { riskLevel: number; recommendations: string[] };
  };
  risks: {
    rain: number;
    temperature: number;
    wind: number;
    overall: number;
  };
  recommendations: string[];
  riskScore?: number;
  serviceImpacts?: Record<string, { delayRisk: number }>;
}

interface TimelineEvent {
  id: string;
  service: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  type: "service" | "dependency" | "weather_buffer";
  status: "scheduled" | "in_progress" | "completed" | "delayed";
  criticalPath: boolean;
}

interface DurationProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

// Service duration rates (hours per sqft or per unit)
const SERVICE_RATES = {
  WC: {
    rate: 0.1,
    unit: "sqft",
    weatherSensitive: true,
    name: "Window Cleaning",
  },
  GR: {
    rate: 0.15,
    unit: "sqft",
    weatherSensitive: true,
    name: "Glass Restoration",
  },
  BWP: {
    rate: 0.08,
    unit: "sqft",
    weatherSensitive: true,
    name: "Building Wash (Pressure)",
  },
  BWS: {
    rate: 0.12,
    unit: "sqft",
    weatherSensitive: true,
    name: "Building Wash (Soft)",
  },
  HBW: {
    rate: 0.2,
    unit: "sqft",
    weatherSensitive: true,
    name: "High-Rise Building Wash",
  },
  PWF: {
    rate: 0.05,
    unit: "sqft",
    weatherSensitive: true,
    name: "Pressure Wash (Flat)",
  },
  HFS: {
    rate: 0.08,
    unit: "sqft",
    weatherSensitive: false,
    name: "Hard Floor Scrubbing",
  },
  PC: {
    rate: 0.5,
    unit: "space",
    weatherSensitive: true,
    name: "Parking Cleaning",
  },
  PWP: {
    rate: 0.06,
    unit: "sqft",
    weatherSensitive: true,
    name: "Parking Pressure Wash",
  },
  IW: {
    rate: 0.15,
    unit: "sqft",
    weatherSensitive: false,
    name: "Interior Wall Cleaning",
  },
  DC: {
    rate: 0.1,
    unit: "sqft",
    weatherSensitive: false,
    name: "Deck Cleaning",
  },
};

// Service dependencies - which services must be completed before others
const SERVICE_DEPENDENCIES = {
  GR: ["WC"], // Glass restoration after window cleaning
  BWS: ["BWP"], // Soft wash after pressure wash (if both selected)
  PC: ["PWP"], // Parking cleaning after pressure wash
  DC: ["IW"], // Deck cleaning after interior walls
};

export function Duration({ data, onUpdate, onNext, onBack }: DurationProps) {
  const [loading, setLoading] = useState(true);
  const [serviceDurations, setServiceDurations] = useState<any[]>([]);
  const [weatherAnalysis, setWeatherAnalysis] =
    useState<WeatherAnalysis | null>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [proposedStartDate, setProposedStartDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
  );

  const selectedServices = data.scopeDetails?.selectedServices || [];
  const measurements = Object.values(data.takeoff?.measurements || {}).flat();
  const location =
    data.initialContact?.extractedData?.requirements?.location ||
    data.initialContact?.extractedData?.location ||
    "Unknown Location";
  const buildingHeight = Math.ceil(
    (data.filesPhotos?.summary?.measurements?.buildingHeight || 40) / 10,
  );

  useEffect(() => {
    calculateDurations();
  }, [selectedServices, measurements, proposedStartDate]);

  const calculateDurations = async () => {
    setLoading(true);

    try {
      // Calculate base durations using the calculation service
      const calcService = new DurationCalculationService();
      const baseDurations = selectedServices.map((service: string) => {
        return calcService.calculateServiceDuration(
          service,
          measurements as any,
          buildingHeight,
          "medium", // Default difficulty
        );
      });

      // Get weather analysis
      const weatherService = new WeatherService();
      const weather = await weatherService.analyzeWeatherForLocation(
        location,
        selectedServices,
        proposedStartDate,
      );

      // Generate timeline
      const newTimeline = calcService.scheduleServices(
        baseDurations,
        proposedStartDate,
      );

      setServiceDurations(baseDurations);
      setWeatherAnalysis(weather as unknown as WeatherAnalysis);
      setTimeline(newTimeline);
    } catch (error) {
      logError("Duration calculation failed", {
        error,
        component: "Duration",
        action: "duration_calculation",
      });
      // Fallback to basic calculations
      const fallbackDurations = selectedServices.map((service: string) => ({
        service,
        baseDuration: 2,
        weatherImpact: 0.5,
        finalDuration: 2.5,
        confidence: "medium" as const,
        dependencies:
          SERVICE_DEPENDENCIES[service as keyof typeof SERVICE_DEPENDENCIES] ||
          [],
      }));
      setServiceDurations(fallbackDurations);
    } finally {
      setLoading(false);
    }
  };

  const handleManualOverride = (
    service: string,
    newDuration: number,
    reason: string,
  ) => {
    const updated = serviceDurations.map((sd: any) =>
      sd.service === service
        ? {
            ...sd,
            finalDuration: newDuration,
            isOverridden: true,
            overrideReason: reason,
          }
        : sd,
    );
    setServiceDurations(updated);

    // Recalculate timeline with new duration
    if (timeline) {
      const calcService = new DurationCalculationService();
      const newTimeline = calcService.scheduleServices(
        updated,
        proposedStartDate,
      );
      setTimeline(newTimeline);
    }
  };

  const handleStartDateChange = (date: string) => {
    setProposedStartDate(new Date(date));
    calculateDurations(); // Recalculate with new date
  };

  const handleExportCalendar = () => {
    if (timeline) {
      const calendarService = new CalendarExportService();
      const projectInfo = {
        name:
          data.initialContact?.extractedData?.customer?.company ||
          "Cleaning Project",
        location: location,
        clientName: data.initialContact?.extractedData?.customer?.name,
        projectManager: "EstimatePro",
        estimateNumber: data.initialContact?.extractedData?.estimateNumber,
      };
      calendarService.downloadICS(timeline, projectInfo);
    }
  };

  const getOptimalStartDate = (): string => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 14); // 2 weeks from now

    if (weatherAnalysis?.forecast?.nextWeek) {
      const bestDate = weatherAnalysis.forecast.nextWeek
        .filter((day: any) => day.risk === "low")
        .map((day: any) => day.date)[0];
      return bestDate || nextWeek.toISOString().split("T")[0];
    }

    return nextWeek.toISOString().split("T")[0];
  };

  const handleNext = () => {
    onUpdate({
      duration: {
        serviceDurations,
        totalDuration: timeline?.totalDuration || 0,
        timeline,
        weatherAnalysis,
        startDate: proposedStartDate,
      },
    });
    onNext();
  };

  const totalDuration = timeline?.totalDuration || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Analyzing weather patterns and calculating durations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Duration & Timeline</h2>
        <p className="text-muted-foreground">
          Intelligent duration calculation with weather analysis and timeline
          optimization
        </p>
      </div>

      {/* Start Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Project Schedule</CardTitle>
          <CardDescription>
            Set start date and view calculated timeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Proposed Start Date
              </label>
              <Input
                type="date"
                value={proposedStartDate.toISOString().split("T")[0]}
                onChange={(e) => handleStartDateChange(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Optimal Start Date
              </label>
              <div className="flex space-x-2">
                <Input
                  value={getOptimalStartDate()}
                  disabled
                  className="bg-muted"
                />
                <Button
                  variant="outline"
                  onClick={() => handleStartDateChange(getOptimalStartDate())}
                >
                  Use
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Weather Risk
              </label>
              <p className="text-sm px-3 py-2 bg-muted rounded">
                {weatherAnalysis?.riskScore
                  ? weatherAnalysis.riskScore < 0.3
                    ? "✅ Low Risk"
                    : weatherAnalysis.riskScore < 0.6
                      ? "⚠️ Medium Risk"
                      : "❌ High Risk"
                  : "Calculating..."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Visualization */}
      {timeline && (
        <TimelineVisualization
          timeline={timeline.entries.map((entry: any) => ({
            ...entry,
            serviceName:
              SERVICE_RATES[entry.service as keyof typeof SERVICE_RATES]?.name,
            weatherRisk:
              (weatherAnalysis?.serviceImpacts?.[entry.service]?.delayRisk ||
                0) > 0.6
                ? "high"
                : (weatherAnalysis?.serviceImpacts?.[entry.service]
                      ?.delayRisk || 0) > 0.3
                  ? "medium"
                  : "low",
            isOnCriticalPath: timeline.criticalPath.includes(entry.service),
            confidence:
              serviceDurations.find((sd: any) => sd.service === entry.service)
                ?.confidence || "medium",
          }))}
          onAdjust={(service, newStart) => {
            // Handle timeline adjustments if needed
          }}
        />
      )}

      {/* Weather Analysis */}
      {weatherAnalysis && (
        <WeatherImpactChart
          historical={weatherAnalysis.historical as any}
          services={selectedServices}
          location={location}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Duration Summary */}
        <div className="lg:col-span-2">
          {weatherAnalysis && timeline && (
            <DurationSummary
              serviceDurations={serviceDurations}
              totalDuration={totalDuration}
              weatherAnalysis={weatherAnalysis as any}
              timeline={timeline}
            />
          )}
        </div>

        {/* Manual Overrides */}
        <div>
          <ManualOverride
            serviceDurations={serviceDurations}
            onOverride={handleManualOverride}
            allowRemoval={true}
          />
        </div>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>Export timeline and schedule data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={handleExportCalendar} disabled={!timeline}>
              <Download className="h-4 w-4 mr-2" />
              Export to Calendar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!proposedStartDate || serviceDurations.length === 0}
        >
          Continue to Expenses
        </Button>
      </div>
    </div>
  );
}
