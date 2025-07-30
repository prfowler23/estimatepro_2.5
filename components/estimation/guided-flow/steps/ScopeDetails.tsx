import React, { useState, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import { AlertTriangle, Info, Package, Sparkles } from "lucide-react";
import { SERVICE_RULES } from "@/lib/estimation/service-rules";
import {
  ScopeDetailsData,
  ServiceType,
  SERVICE_METADATA,
  GuidedFlowData,
} from "@/lib/types/estimate-types";
import { IntelligentServiceSuggestions } from "@/components/ai/service-suggestions/IntelligentServiceSuggestions";
import { StepComponentProps } from "../index";

// Convert SERVICE_METADATA to array format for easier iteration
const SERVICES = Object.entries(SERVICE_METADATA).map(([id, metadata]) => ({
  id: id as ServiceType,
  name: metadata.name,
  basePrice: metadata.basePrice,
  category: metadata.category,
}));

const COMMON_BUNDLES = [
  {
    name: "Full Restoration",
    services: ["PWS", "GR", "FR", "WC"] as ServiceType[],
    description: "Complete building restoration package",
  },
  {
    name: "Basic Cleaning",
    services: ["PW", "WC"] as ServiceType[],
    description: "Standard pressure wash with windows",
  },
  {
    name: "Glass & Frame",
    services: ["GR", "FR"] as ServiceType[],
    description: "Restoration of glass and frames together",
  },
];

interface ScopeDetailsProps extends StepComponentProps {}

function ScopeDetailsComponent({
  data,
  onUpdate,
  onNext,
  onBack,
}: ScopeDetailsProps) {
  const [scopeData, setScopeData] = useState<ScopeDetailsData>({
    selectedServices: (data?.scopeDetails?.selectedServices ||
      data?.initialContact?.aiExtractedData?.requirements?.services ||
      []) as ServiceType[],
    serviceOrder: data?.scopeDetails?.serviceOrder || [],
    autoAddedServices: data?.scopeDetails?.autoAddedServices || [],
    overrides: data?.scopeDetails?.overrides || {},
    scopeNotes: data?.scopeDetails?.scopeNotes || "",
    accessRestrictions: data?.scopeDetails?.accessRestrictions || [],
    specialRequirements: data?.scopeDetails?.specialRequirements || [],
  });

  const [validation, setValidation] = useState<{
    errors: string[];
    warnings: string[];
    info: string[];
  }>({
    errors: [],
    warnings: [],
    info: [],
  });

  // Validate services whenever selection changes
  useEffect(() => {
    validateServices();
  }, [scopeData.selectedServices, scopeData]);

  const validateServices = () => {
    const result = SERVICE_RULES.validateServiceSelection(
      scopeData.selectedServices,
    );

    // Auto-add required services
    if (result.autoAddedServices.length > 0) {
      setScopeData((prev) => ({
        ...prev,
        selectedServices: [
          ...new Set([...prev.selectedServices, ...result.autoAddedServices]),
        ],
        autoAddedServices: result.autoAddedServices,
      }));
    }

    // Calculate optimal service order
    const orderedServices = calculateServiceOrder(scopeData.selectedServices);
    setScopeData((prev) => ({ ...prev, serviceOrder: orderedServices }));

    setValidation({
      errors: result.errors,
      warnings: result.warnings,
      info:
        result.autoAddedServices.length > 0
          ? [
              `Window Cleaning (WC) automatically added with Pressure Washing (PW)`,
            ]
          : [],
    });
  };

  const calculateServiceOrder = (services: ServiceType[]): ServiceType[] => {
    return services.sort((a, b) => {
      const aPriority = (SERVICE_RULES.serviceOrder as any)[a]?.priority || 99;
      const bPriority = (SERVICE_RULES.serviceOrder as any)[b]?.priority || 99;
      return aPriority - bPriority;
    });
  };

  const toggleService = (serviceId: ServiceType) => {
    let newServices = [...scopeData.selectedServices];

    // Clear any previous warnings for this specific interaction
    setValidation((prev) => ({
      ...prev,
      warnings: prev.warnings.filter(
        (w) =>
          !w.includes("Window Cleaning cannot be removed") &&
          !w.includes("automatically added"),
      ),
    }));

    if (newServices.includes(serviceId)) {
      // Check if we can remove this service
      if (serviceId === "WC" && newServices.includes("PW")) {
        // Cannot remove WC if PW is selected
        setValidation((prev) => ({
          ...prev,
          warnings: [
            ...prev.warnings,
            "Window Cleaning cannot be removed when Pressure Washing is selected",
          ],
        }));
        return;
      }

      // Remove service
      newServices = newServices.filter((s) => s !== serviceId);

      // If removing PW, also remove WC
      if (serviceId === "PW") {
        newServices = newServices.filter((s) => s !== "WC");
      }
    } else {
      // Add service
      newServices.push(serviceId);
    }

    setScopeData((prev) => ({
      ...prev,
      selectedServices: newServices,
      autoAddedServices: [], // Reset auto-added tracking
    }));
  };

  const handleAcceptSuggestion = (serviceType: ServiceType) => {
    setScopeData((prev) => ({
      ...prev,
      selectedServices: [...prev.selectedServices, serviceType],
    }));
  };

  const handleRejectSuggestion = (serviceType: ServiceType) => {
    // Just ignore the suggestion - no action needed
  };

  const selectBundle = (bundle: (typeof COMMON_BUNDLES)[0]) => {
    setScopeData((prev) => ({
      ...prev,
      selectedServices: [...bundle.services],
      autoAddedServices: [],
    }));
  };

  const handleNext = () => {
    if (validation.errors.length > 0) {
      setValidation((prev) => ({
        ...prev,
        errors: [
          ...prev.errors,
          "Please fix service dependency errors before continuing",
        ],
      }));
      return;
    }

    if (scopeData.selectedServices.length === 0) {
      setValidation((prev) => ({
        ...prev,
        errors: [...prev.errors, "Please select at least one service"],
      }));
      return;
    }

    onUpdate({ scopeDetails: scopeData });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Scope & Service Details</h2>
        <p className="text-gray-600">
          Select the services needed. Dependencies will be automatically
          managed.
        </p>
      </div>

      {/* Auto-populated Data Indicator */}
      {data?.scopeDetails?.autoPopulated && (
        <Alert variant="info">
          <Sparkles className="h-4 w-4" />
          <div>
            <h4 className="font-medium mb-1">
              ✨ Auto-populated from Initial Contact
            </h4>
            <p className="text-sm">
              Services and scope details were automatically suggested based on
              your extracted requirements. You can review and modify them below.
            </p>
            {(data?.scopeDetails as any)?.autoPopulationDate && (
              <p className="text-xs text-gray-500 mt-1">
                Generated:{" "}
                {new Date(
                  (data.scopeDetails as any).autoPopulationDate,
                ).toLocaleString()}
              </p>
            )}
          </div>
        </Alert>
      )}

      {/* Common Bundles */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center">
          <Package className="w-4 h-4 mr-2" />
          Quick Select Bundles
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COMMON_BUNDLES.map((bundle) => (
            <Card
              key={bundle.name}
              className="p-4 cursor-pointer hover:border-blue-500 transition touch-manipulation min-h-[120px] flex flex-col justify-center"
              onClick={() => selectBundle(bundle)}
            >
              <h4 className="font-medium">{bundle.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{bundle.description}</p>
              <p className="text-xs text-gray-500 mt-2">
                {bundle.services.join(" → ")}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Validation Messages */}
      {(validation.errors.length > 0 ||
        validation.warnings.length > 0 ||
        validation.info.length > 0) && (
        <div className="space-y-2">
          {validation.errors.map((error, i) => (
            <Alert key={`error-${i}`} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </Alert>
          ))}
          {validation.warnings.map((warning, i) => (
            <Alert key={`warning-${i}`} variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <span>{warning}</span>
            </Alert>
          ))}
          {validation.info.map((info, i) => (
            <Alert key={`info-${i}`} variant="info">
              <Info className="h-4 w-4" />
              <span>{info}</span>
            </Alert>
          ))}
        </div>
      )}

      {/* Service Selection */}
      <div>
        <h3 className="font-semibold mb-3">Select Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SERVICES.map((service) => {
            const isSelected = scopeData.selectedServices.includes(service.id);
            const isAutoAdded =
              scopeData.autoAddedServices?.includes(service.id) || false;
            const isDisabled =
              service.id === "WC" && scopeData.selectedServices.includes("PW");

            return (
              <Card
                key={service.id}
                className={`p-4 cursor-pointer transition-all duration-200 touch-manipulation min-h-[100px] ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                    : "hover:border-gray-300 hover:bg-gray-50"
                } ${isDisabled ? "opacity-75 cursor-not-allowed" : ""}`}
                onClick={() => !isDisabled && toggleService(service.id)}
                role="button"
                tabIndex={isDisabled ? -1 : 0}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !isDisabled) {
                    e.preventDefault();
                    toggleService(service.id);
                  }
                }}
                aria-label={`${isSelected ? "Deselect" : "Select"} ${service.name} service`}
              >
                <div className="flex items-start">
                  <Checkbox
                    checked={isSelected}
                    disabled={isDisabled}
                    className="mt-1 mr-3"
                    aria-hidden="true"
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="font-medium">{service.name}</h4>
                      {isAutoAdded && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Auto-added
                        </span>
                      )}
                      {isDisabled && (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{service.basePrice}</p>
                    <p className="text-xs text-gray-500 mt-1 capitalize">
                      {service.category}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Intelligent Service Suggestions */}
      {data.initialContact?.aiExtractedData && (
        <IntelligentServiceSuggestions
          flowData={data}
          currentServices={scopeData.selectedServices}
          onAcceptSuggestion={handleAcceptSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          className="mt-6"
        />
      )}

      {/* Service Order Display */}
      {scopeData.serviceOrder && scopeData.serviceOrder.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Recommended Service Order</h3>
          <div className="flex items-center space-x-2">
            {scopeData.serviceOrder.map((serviceId, index) => (
              <React.Fragment key={serviceId}>
                <div className="px-3 py-1 bg-white rounded border">
                  {SERVICES.find((s) => s.id === serviceId)?.name}
                </div>
                {index < (scopeData.serviceOrder?.length || 0) - 1 && (
                  <span className="text-gray-400">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Additional Requirements */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Access Restrictions
          </label>
          <textarea
            className="w-full p-2 border rounded"
            placeholder="Note any access restrictions (e.g., security clearance, limited hours, etc.)"
            value={scopeData.accessRestrictions?.join("\n") || ""}
            onChange={(e) =>
              setScopeData({
                ...scopeData,
                accessRestrictions: e.target.value.split("\n").filter(Boolean),
              })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Special Requirements or Notes
          </label>
          <textarea
            className="w-full p-2 border rounded"
            placeholder="Any special requirements or important notes about the scope"
            value={scopeData.scopeNotes}
            onChange={(e) =>
              setScopeData({
                ...scopeData,
                scopeNotes: e.target.value,
              })
            }
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={
            scopeData.selectedServices.length === 0 ||
            validation.errors.length > 0
          }
        >
          Continue to Files/Photos
        </Button>
      </div>
    </div>
  );
}

// PHASE 3 FIX: Memoize to prevent expensive service validation and dependency calculations
export const ScopeDetails = memo(
  ScopeDetailsComponent,
  (prevProps, nextProps) => {
    return (
      JSON.stringify(prevProps.data?.scopeDetails) ===
      JSON.stringify(nextProps.data?.scopeDetails)
      // Note: onUpdate, onNext, onBack are functions and will have new references
      // Parent should wrap these in useCallback to prevent re-renders
    );
  },
);
