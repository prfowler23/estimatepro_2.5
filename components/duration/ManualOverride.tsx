import { useState } from "react";
import { Plus, X, Edit3, AlertTriangle, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ServiceDuration {
  service: string;
  serviceName?: string;
  baseDuration: number;
  weatherImpact: number;
  finalDuration: number;
  confidence: "high" | "medium" | "low";
  dependencies: string[];
  isOverridden?: boolean;
  overrideReason?: string;
  originalDuration?: number;
  overrideBy?: string;
  overrideDate?: Date;
}

interface ManualOverrideProps {
  serviceDurations: ServiceDuration[];
  onOverride: (service: string, newDuration: number, reason: string) => void;
  onRemoveOverride?: (service: string) => void;
  allowRemoval?: boolean;
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

const OVERRIDE_REASONS = [
  "Client request for extended timeline",
  "Additional work discovered",
  "Equipment/crew availability constraints",
  "Site access limitations",
  "Weather contingency adjustment",
  "Quality assurance requirements",
  "Coordination with other trades",
  "Safety considerations",
  "Custom work requirements",
  "Other (specify below)",
];

export function ManualOverride({
  serviceDurations,
  onOverride,
  onRemoveOverride,
  allowRemoval = true,
}: ManualOverrideProps) {
  const [selectedService, setSelectedService] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const validateForm = (): boolean => {
    const validationErrors: string[] = [];

    if (!selectedService) {
      validationErrors.push("Please select a service");
    }

    if (!newDuration || parseFloat(newDuration) <= 0) {
      validationErrors.push("Duration must be greater than 0");
    }

    if (parseFloat(newDuration) > 365) {
      validationErrors.push("Duration cannot exceed 365 days");
    }

    if (!reason) {
      validationErrors.push("Please provide a reason for the override");
    }

    if (reason === "Other (specify below)" && !customReason.trim()) {
      validationErrors.push("Please specify the custom reason");
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const finalReason =
      reason === "Other (specify below)" ? customReason : reason;
    onOverride(selectedService, parseFloat(newDuration), finalReason);

    // Reset form
    setShowForm(false);
    setSelectedService("");
    setNewDuration("");
    setReason("");
    setCustomReason("");
    setErrors([]);
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedService("");
    setNewDuration("");
    setReason("");
    setCustomReason("");
    setErrors([]);
  };

  const getSelectedServiceData = () => {
    return serviceDurations.find((sd) => sd.service === selectedService);
  };

  const formatDurationChange = (original: number, newDur: number): string => {
    const diff = newDur - original;
    if (diff > 0) {
      return `+${diff.toFixed(1)} days longer`;
    } else if (diff < 0) {
      return `${Math.abs(diff).toFixed(1)} days shorter`;
    }
    return "No change";
  };

  // Filter out already overridden services from dropdown (unless allowing re-override)
  const availableServices = serviceDurations.filter((sd) => !sd.isOverridden);
  const overriddenServices = serviceDurations.filter((sd) => sd.isOverridden);

  return (
    <Card className="bg-gray-50/50">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Duration Adjustments
          </CardTitle>
          <Button
            variant={showForm ? "outline" : "default"}
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Override
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Override Form */}
        {showForm && (
          <Card className="border border-blue-200 bg-blue-50/50">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Service
                  </label>
                  <Select
                    value={selectedService}
                    onValueChange={setSelectedService}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service to override" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableServices.map((sd) => (
                        <SelectItem key={sd.service} value={sd.service}>
                          <div className="flex justify-between items-center w-full">
                            <span>
                              {SERVICE_NAMES[sd.service] ||
                                sd.serviceName ||
                                sd.service}
                            </span>
                            <span className="text-muted-foreground ml-4">
                              Current: {sd.finalDuration} days
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    New Duration (days)
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="365"
                    placeholder="Enter new duration"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                  />
                  {selectedService && newDuration && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Change:{" "}
                      {formatDurationChange(
                        getSelectedServiceData()?.finalDuration || 0,
                        parseFloat(newDuration) || 0,
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Reason for Override
                  </label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {OVERRIDE_REASONS.map((reasonOption) => (
                        <SelectItem key={reasonOption} value={reasonOption}>
                          {reasonOption}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {reason === "Other (specify below)" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Custom Reason
                    </label>
                    <Textarea
                      placeholder="Please specify the reason for this duration override..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}

                {/* Validation Errors */}
                {errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Impact Preview */}
                {selectedService && newDuration && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-3">
                      <h5 className="font-medium text-sm mb-2">
                        Impact Preview
                      </h5>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Original Duration:</span>
                          <span>
                            {getSelectedServiceData()?.baseDuration || 0} days
                            (base)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Weather Impact:</span>
                          <span>
                            +{getSelectedServiceData()?.weatherImpact || 0} days
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Current Total:</span>
                          <span>
                            {getSelectedServiceData()?.finalDuration || 0} days
                          </span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-1">
                          <span>New Total:</span>
                          <span>{parseFloat(newDuration) || 0} days</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedService || !newDuration || !reason}
                >
                  Apply Override
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Overrides */}
        {overriddenServices.length > 0 && (
          <div>
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Active Overrides ({overriddenServices.length})
            </h5>
            <div className="space-y-3">
              {overriddenServices.map((sd) => (
                <Card
                  key={sd.service}
                  className="border-l-4 border-l-orange-400"
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h6 className="font-medium">
                            {SERVICE_NAMES[sd.service] ||
                              sd.serviceName ||
                              sd.service}
                          </h6>
                          <Badge variant="secondary" className="text-xs">
                            Override Active
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-muted-foreground">
                              Original:
                            </span>
                            <span className="ml-2 font-medium">
                              {sd.originalDuration ||
                                sd.baseDuration + sd.weatherImpact}{" "}
                              days
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Override:
                            </span>
                            <span className="ml-2 font-medium">
                              {sd.finalDuration} days
                            </span>
                          </div>
                        </div>

                        <div className="text-sm">
                          <span className="text-muted-foreground">Reason:</span>
                          <p className="mt-1 text-sm bg-gray-100 p-2 rounded">
                            {sd.overrideReason}
                          </p>
                        </div>

                        {sd.overrideDate && (
                          <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Modified on {sd.overrideDate.toLocaleDateString()}
                            {sd.overrideBy && ` by ${sd.overrideBy}`}
                          </div>
                        )}
                      </div>

                      {allowRemoval && onRemoveOverride && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveOverride(sd.service)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {overriddenServices.length === 0 && !showForm && (
          <div className="text-center py-8 text-muted-foreground">
            <Edit3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No duration overrides applied</p>
            <p className="text-sm">
              Click &quot;Add Override&quot; to manually adjust service
              durations
            </p>
          </div>
        )}

        {/* Summary */}
        {overriddenServices.length > 0 && (
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-orange-800">
                  {overriddenServices.length} service
                  {overriddenServices.length !== 1 ? "s" : ""}
                  {overriddenServices.length === 1 ? " has" : " have"} manual
                  duration adjustments
                </span>
              </div>
              <p className="text-xs text-orange-700 mt-1">
                These overrides will be preserved when recalculating the project
                timeline
              </p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
