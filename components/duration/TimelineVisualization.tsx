import { useState } from "react";
import {
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Info,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface TimelineEntry {
  service: string;
  serviceName: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  dependencies: string[];
  weatherRisk: "low" | "medium" | "high";
  isOnCriticalPath: boolean;
  crewSize?: number;
  status?: "scheduled" | "in_progress" | "completed" | "delayed";
  confidence?: "high" | "medium" | "low";
}

interface TimelineVisualizationProps {
  timeline: TimelineEntry[];
  onAdjust?: (service: string, newStart: Date) => void;
  showDetails?: boolean;
}

export function TimelineVisualization({
  timeline,
  onAdjust,
  showDetails = true,
}: TimelineVisualizationProps) {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "details">("timeline");
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    startDate: "",
    duration: "",
    reason: "",
    adjustmentType: "delay" as "delay" | "advance" | "extend" | "reduce",
  });

  if (!timeline || timeline.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No timeline data available</p>
          <p className="text-sm">
            Add services and set a start date to view the project timeline
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate timeline bounds with safety checks
  const validEntries = timeline.filter(
    (entry) =>
      entry.startDate &&
      entry.endDate &&
      entry.startDate instanceof Date &&
      entry.endDate instanceof Date,
  );

  if (validEntries.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Invalid timeline data</p>
        </CardContent>
      </Card>
    );
  }

  const startDate = validEntries.reduce(
    (min, entry) => (entry.startDate < min ? entry.startDate : min),
    validEntries[0].startDate,
  );

  const endDate = validEntries.reduce(
    (max, entry) => (entry.endDate > max ? entry.endDate : max),
    validEntries[0].endDate,
  );

  const totalDays =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;

  const handleOpenAdjustmentDialog = (serviceEntry: TimelineEntry) => {
    setSelectedService(serviceEntry.service);
    setAdjustmentForm({
      startDate: serviceEntry.startDate.toISOString().split("T")[0],
      duration: serviceEntry.duration.toString(),
      reason: "",
      adjustmentType: "delay",
    });
    setIsAdjustmentDialogOpen(true);
  };

  const handleAdjustmentSubmit = () => {
    if (selectedService && onAdjust) {
      const adjustment = {
        service: selectedService,
        newStartDate: new Date(adjustmentForm.startDate),
        newDuration: parseInt(adjustmentForm.duration),
        adjustmentType: adjustmentForm.adjustmentType,
        reason: adjustmentForm.reason,
      };

      onAdjust(selectedService, new Date(adjustmentForm.startDate));
      setIsAdjustmentDialogOpen(false);
      setAdjustmentForm({
        startDate: "",
        duration: "",
        reason: "",
        adjustmentType: "delay",
      });
    }
  };

  const getServiceColor = (
    service: string,
    weatherRisk: string,
    status?: string,
  ) => {
    const baseColors: Record<string, string> = {
      WC: "bg-blue-500",
      GR: "bg-green-500",
      BWP: "bg-purple-500",
      BWS: "bg-indigo-500",
      HBW: "bg-red-500",
      PWF: "bg-cyan-500",
      HFS: "bg-teal-500",
      PC: "bg-orange-500",
      PWP: "bg-yellow-500",
      IW: "bg-pink-500",
      DC: "bg-gray-500",
    };

    let baseColor = baseColors[service] || "bg-gray-500";

    // Adjust for status
    if (status === "completed") {
      baseColor = baseColor.replace("500", "600");
    } else if (status === "delayed") {
      baseColor = "bg-red-400";
    } else if (status === "in_progress") {
      baseColor = baseColor.replace("500", "400");
    }

    // Adjust opacity for weather risk
    const riskOpacity = {
      low: "",
      medium: "opacity-80",
      high: "opacity-60",
    };

    return `${baseColor} ${riskOpacity[weatherRisk as keyof typeof riskOpacity]}`;
  };

  const calculatePosition = (date: Date): number => {
    const daysSinceStart = Math.max(
      0,
      Math.ceil((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    );
    return Math.min(100, (daysSinceStart / totalDays) * 100);
  };

  const calculateWidth = (start: Date, end: Date): number => {
    const duration = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
    );
    return Math.min(100, (duration / totalDays) * 100);
  };

  // Generate week markers (every 7 days or at most 10 markers)
  const markerInterval = Math.max(1, Math.floor(totalDays / 10));
  const weekMarkers: Array<{
    date: Date;
    position: number;
    label: string;
    isWeekend: boolean;
  }> = [];
  for (let i = 0; i <= totalDays; i += markerInterval) {
    const markerDate = new Date(startDate);
    markerDate.setDate(markerDate.getDate() + i);
    weekMarkers.push({
      position: (i / totalDays) * 100,
      date: markerDate,
      label: markerDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      isWeekend: markerDate.getDay() === 0 || markerDate.getDay() === 6,
    });
  }

  // Find overlapping services
  const findOverlaps = (entry: TimelineEntry): TimelineEntry[] => {
    return timeline.filter(
      (other) =>
        other.service !== entry.service &&
        other.startDate < entry.endDate &&
        other.endDate > entry.startDate,
    );
  };

  const getSelectedServiceDetails = () => {
    const entry = timeline.find((t) => t.service === selectedService);
    if (!entry) return null;

    const overlaps = findOverlaps(entry);
    const criticalPathServices = timeline
      .filter((t) => t.isOnCriticalPath)
      .map((t) => t.service);

    return {
      ...entry,
      overlaps,
      isCriticalPath: criticalPathServices.includes(entry.service),
    };
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Project Timeline
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "timeline" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("timeline")}
              >
                Timeline
              </Button>
              <Button
                variant={viewMode === "details" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("details")}
              >
                Details
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {timeline.length} services • {totalDays} days •{" "}
            {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}
          </div>
        </CardHeader>

        <CardContent>
          {viewMode === "timeline" ? (
            <div className="space-y-4">
              {/* Timeline header with dates */}
              <div className="relative h-8 mb-4 border-b border-gray-200">
                {weekMarkers.map((marker, index) => (
                  <div
                    key={index}
                    className={`absolute text-xs transform -translate-x-1/2 ${
                      marker.isWeekend ? "text-red-400" : "text-gray-500"
                    }`}
                    style={{ left: `${marker.position}%` }}
                  >
                    <div className="text-center">
                      <div>
                        {marker.date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="text-xs opacity-60">
                        {marker.date.toLocaleDateString("en-US", {
                          weekday: "short",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Weekend shading */}
              <div className="relative h-2 mb-2">
                {weekMarkers
                  .filter((m) => m.isWeekend)
                  .map((marker, index) => (
                    <div
                      key={index}
                      className="absolute bg-red-50 border-l border-r border-red-100"
                      style={{
                        left: `${marker.position}%`,
                        width: `${100 / totalDays}%`,
                        height: "100%",
                      }}
                    />
                  ))}
              </div>

              {/* Service timeline bars */}
              <div className="relative space-y-3">
                {timeline.map((entry, index) => {
                  const left = calculatePosition(entry.startDate);
                  const width = calculateWidth(entry.startDate, entry.endDate);
                  const overlaps = findOverlaps(entry);

                  return (
                    <div key={entry.service} className="relative h-12">
                      {/* Service label */}
                      <div className="absolute left-0 w-20 text-sm font-medium flex items-center h-full z-10">
                        <div>
                          <div className="font-semibold">{entry.service}</div>
                          <div className="text-xs text-muted-foreground">
                            {entry.crewSize ? `${entry.crewSize} crew` : ""}
                          </div>
                        </div>
                      </div>

                      {/* Timeline container */}
                      <div className="ml-22 relative h-full">
                        {/* Weekend background for this row */}
                        {weekMarkers
                          .filter((m) => m.isWeekend)
                          .map((marker, weekIndex) => (
                            <div
                              key={weekIndex}
                              className="absolute bg-gray-50 opacity-50"
                              style={{
                                left: `${marker.position}%`,
                                width: `${100 / totalDays}%`,
                                height: "100%",
                              }}
                            />
                          ))}

                        {/* Timeline bar */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`absolute h-8 rounded-md cursor-pointer transition-all hover:shadow-md ${getServiceColor(
                                entry.service,
                                entry.weatherRisk,
                                entry.status,
                              )} ${entry.isOnCriticalPath ? "ring-2 ring-red-400 ring-offset-1" : ""} ${
                                selectedService === entry.service
                                  ? "ring-2 ring-blue-400 ring-offset-1"
                                  : ""
                              }`}
                              style={{
                                left: `${left}%`,
                                width: `${Math.max(width, 2)}%`,
                                top: "50%",
                                transform: "translateY(-50%)",
                              }}
                              onClick={() => setSelectedService(entry.service)}
                            >
                              <div className="px-2 py-1 text-white text-xs flex items-center justify-between h-full">
                                <span className="font-medium">
                                  {entry.duration}d
                                </span>
                                <div className="flex items-center gap-1">
                                  {entry.weatherRisk === "high" && (
                                    <AlertTriangle className="w-3 h-3" />
                                  )}
                                  {entry.status === "completed" && (
                                    <CheckCircle className="w-3 h-3" />
                                  )}
                                  {entry.confidence === "low" && (
                                    <Info className="w-3 h-3" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <div className="font-semibold">
                                {entry.serviceName || entry.service}
                              </div>
                              <div>Duration: {entry.duration} days</div>
                              <div>
                                Dates: {entry.startDate.toLocaleDateString()} -{" "}
                                {entry.endDate.toLocaleDateString()}
                              </div>
                              <div>
                                Weather Risk:{" "}
                                <span
                                  className={`capitalize ${
                                    entry.weatherRisk === "high"
                                      ? "text-red-500"
                                      : entry.weatherRisk === "medium"
                                        ? "text-yellow-500"
                                        : "text-green-500"
                                  }`}
                                >
                                  {entry.weatherRisk}
                                </span>
                              </div>
                              {entry.isOnCriticalPath && (
                                <div className="text-red-500 font-medium">
                                  Critical Path
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>

                        {/* Dependency arrows */}
                        {entry.dependencies.map((dep) => {
                          const depEntry = timeline.find(
                            (t) => t.service === dep,
                          );
                          if (!depEntry) return null;

                          const depEnd = calculatePosition(depEntry.endDate);
                          const thisStart = calculatePosition(entry.startDate);

                          if (thisStart <= depEnd) return null; // No space for arrow

                          return (
                            <div
                              key={dep}
                              className="absolute top-1/2 transform -translate-y-1/2"
                            >
                              {/* Dependency line */}
                              <div
                                className="h-0.5 bg-gray-400"
                                style={{
                                  left: `${depEnd + 1}%`,
                                  width: `${thisStart - depEnd - 2}%`,
                                }}
                              />
                              {/* Arrow head */}
                              <div
                                className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1"
                                style={{ left: `${thisStart - 1}%` }}
                              >
                                <ArrowRight className="w-3 h-3 text-gray-400" />
                              </div>
                            </div>
                          );
                        })}

                        {/* Overlap indicators */}
                        {overlaps.length > 0 && (
                          <div className="absolute -bottom-1 left-0 right-0 h-1 bg-yellow-400 opacity-50 rounded" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-2" />
                  <span>Normal Risk</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 opacity-60 rounded mr-2" />
                  <span>Weather Risk</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded ring-2 ring-red-400 mr-2" />
                  <span>Critical Path</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-1 bg-yellow-400 mr-2" />
                  <span>Overlapping Work</span>
                </div>
              </div>
            </div>
          ) : (
            /* Details View */
            <div className="space-y-4">
              {timeline.map((entry) => (
                <Card
                  key={entry.service}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedService(entry.service)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          {entry.serviceName || entry.service}
                          {entry.isOnCriticalPath && (
                            <Badge variant="destructive" className="text-xs">
                              Critical Path
                            </Badge>
                          )}
                        </h4>
                        <div className="text-sm text-muted-foreground mt-1">
                          {entry.startDate.toLocaleDateString()} -{" "}
                          {entry.endDate.toLocaleDateString()}
                        </div>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {entry.duration} days
                          </span>
                          {entry.crewSize && (
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {entry.crewSize} crew
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant={
                            entry.weatherRisk === "high"
                              ? "destructive"
                              : entry.weatherRisk === "medium"
                                ? "secondary"
                                : "default"
                          }
                        >
                          {entry.weatherRisk} weather risk
                        </Badge>
                        {entry.status && (
                          <Badge variant="outline">{entry.status}</Badge>
                        )}
                      </div>
                    </div>

                    {entry.dependencies.length > 0 && (
                      <div className="mt-3 text-sm">
                        <span className="text-muted-foreground">
                          Depends on:{" "}
                        </span>
                        {entry.dependencies.map((dep, index) => (
                          <span key={dep}>
                            {dep}
                            {index < entry.dependencies.length - 1 && ", "}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Selected service details panel */}
          {selectedService && showDetails && (
            <Card className="mt-6 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">
                  Service Details: {selectedService}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const details = getSelectedServiceDetails();
                  if (!details) return null;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium mb-2">Schedule</h5>
                        <div className="space-y-1 text-sm">
                          <div>
                            Start: {details.startDate.toLocaleDateString()}
                          </div>
                          <div>End: {details.endDate.toLocaleDateString()}</div>
                          <div>Duration: {details.duration} days</div>
                          {details.crewSize && (
                            <div>Crew Size: {details.crewSize} people</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium mb-2">Risk Factors</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Weather Risk:</span>
                            <Badge
                              variant={
                                details.weatherRisk === "high"
                                  ? "destructive"
                                  : details.weatherRisk === "medium"
                                    ? "secondary"
                                    : "default"
                              }
                              className="text-xs"
                            >
                              {details.weatherRisk}
                            </Badge>
                          </div>
                          {details.confidence && (
                            <div className="flex justify-between">
                              <span>Confidence:</span>
                              <Badge variant="outline" className="text-xs">
                                {details.confidence}
                              </Badge>
                            </div>
                          )}
                          {details.isCriticalPath && (
                            <div className="text-red-600 font-medium">
                              ⚠️ This service is on the critical path
                            </div>
                          )}
                        </div>
                      </div>

                      {details.dependencies.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-2">Dependencies</h5>
                          <div className="space-y-1 text-sm">
                            {details.dependencies.map((dep) => (
                              <div key={dep}>• {dep}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {details.overlaps.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-2">
                            Overlapping Services
                          </h5>
                          <div className="space-y-1 text-sm">
                            {details.overlaps.map((overlap) => (
                              <div key={overlap.service}>
                                • {overlap.service}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {onAdjust && (
                  <div className="mt-4 pt-4 border-t">
                    <Dialog
                      open={isAdjustmentDialogOpen}
                      onOpenChange={setIsAdjustmentDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const entry = timeline.find(
                              (t) => t.service === selectedService,
                            );
                            if (entry) {
                              handleOpenAdjustmentDialog(entry);
                            }
                          }}
                        >
                          Adjust Schedule
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Adjust Service Schedule</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="adjustment-type">
                              Adjustment Type
                            </Label>
                            <Select
                              value={adjustmentForm.adjustmentType}
                              onValueChange={(
                                value:
                                  | "delay"
                                  | "advance"
                                  | "extend"
                                  | "reduce",
                              ) =>
                                setAdjustmentForm((prev) => ({
                                  ...prev,
                                  adjustmentType: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="delay">
                                  Delay Start
                                </SelectItem>
                                <SelectItem value="advance">
                                  Advance Start
                                </SelectItem>
                                <SelectItem value="extend">
                                  Extend Duration
                                </SelectItem>
                                <SelectItem value="reduce">
                                  Reduce Duration
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="start-date">Start Date</Label>
                            <Input
                              id="start-date"
                              type="date"
                              value={adjustmentForm.startDate}
                              onChange={(e) =>
                                setAdjustmentForm((prev) => ({
                                  ...prev,
                                  startDate: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <div>
                            <Label htmlFor="duration">Duration (days)</Label>
                            <Input
                              id="duration"
                              type="number"
                              min="1"
                              value={adjustmentForm.duration}
                              onChange={(e) =>
                                setAdjustmentForm((prev) => ({
                                  ...prev,
                                  duration: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <div>
                            <Label htmlFor="reason">
                              Reason for Adjustment
                            </Label>
                            <Textarea
                              id="reason"
                              placeholder="Explain why this adjustment is needed..."
                              value={adjustmentForm.reason}
                              onChange={(e) =>
                                setAdjustmentForm((prev) => ({
                                  ...prev,
                                  reason: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => setIsAdjustmentDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleAdjustmentSubmit}
                              disabled={
                                !adjustmentForm.startDate ||
                                !adjustmentForm.duration ||
                                !adjustmentForm.reason
                              }
                            >
                              Apply Adjustment
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
