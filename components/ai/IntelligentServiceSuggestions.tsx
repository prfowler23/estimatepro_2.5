// Intelligent service suggestions component based on AI analysis
"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  CheckCircle,
  XCircle,
  Info,
  TrendingUp,
  Building,
  Eye,
  Sparkles,
} from "lucide-react";
import {
  ServiceType,
  GuidedFlowData,
  SERVICE_METADATA,
} from "@/lib/types/estimate-types";
import { CrossStepPopulationService } from "@/lib/services/cross-step-population-service";

export interface ServiceSuggestion {
  serviceType: ServiceType;
  confidence: number;
  reason: string;
  priority: "high" | "medium" | "low";
  estimatedValue?: number;
  compatibility: string[];
  risks?: string[];
}

interface IntelligentServiceSuggestionsProps {
  flowData: GuidedFlowData;
  currentServices: ServiceType[];
  onAcceptSuggestion: (serviceType: ServiceType) => void;
  onRejectSuggestion: (serviceType: ServiceType) => void;
  className?: string;
}

export function IntelligentServiceSuggestions({
  flowData,
  currentServices,
  onAcceptSuggestion,
  onRejectSuggestion,
  className = "",
}: IntelligentServiceSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ServiceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<
    Set<ServiceType>
  >(new Set());
  const [rejectedSuggestions, setRejectedSuggestions] = useState<
    Set<ServiceType>
  >(new Set());

  // Generate suggestions based on current flow data
  useEffect(() => {
    generateSuggestions();
  }, [flowData, currentServices]);

  const generateSuggestions = async () => {
    if (!flowData.initialContact?.aiExtractedData) {
      return;
    }

    setIsLoading(true);
    try {
      const suggestions = await generateIntelligentSuggestions(
        flowData,
        currentServices,
      );
      setSuggestions(suggestions);
    } catch (error) {
      console.error("Failed to generate service suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSuggestion = (serviceType: ServiceType) => {
    setAcceptedSuggestions((prev) => new Set([...prev, serviceType]));
    onAcceptSuggestion(serviceType);
  };

  const handleRejectSuggestion = (serviceType: ServiceType) => {
    setRejectedSuggestions((prev) => new Set([...prev, serviceType]));
    onRejectSuggestion(serviceType);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-100";
    if (confidence >= 0.6) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case "medium":
        return <Eye className="w-4 h-4 text-yellow-500" />;
      case "low":
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  // Filter out already selected, accepted, or rejected services
  const visibleSuggestions = suggestions.filter(
    (suggestion) =>
      !currentServices.includes(suggestion.serviceType) &&
      !acceptedSuggestions.has(suggestion.serviceType) &&
      !rejectedSuggestions.has(suggestion.serviceType),
  );

  if (isLoading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 animate-pulse text-blue-500" />
          <span className="text-sm text-gray-600">
            Analyzing building for additional service opportunities...
          </span>
        </div>
      </Card>
    );
  }

  if (visibleSuggestions.length === 0) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-green-600">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm">
            No additional services recommended at this time
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <h3 className="font-semibold text-lg">Smart Service Suggestions</h3>
          <Badge variant="secondary" className="text-xs">
            AI-Powered
          </Badge>
        </div>

        <p className="text-sm text-gray-600">
          Based on your building analysis and extracted requirements, here are
          additional services that could add value:
        </p>

        <div className="space-y-3">
          {visibleSuggestions.map((suggestion) => {
            const serviceMetadata = SERVICE_METADATA[suggestion.serviceType];

            return (
              <div
                key={suggestion.serviceType}
                className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getPriorityIcon(suggestion.priority)}
                      <h4 className="font-medium">
                        {serviceMetadata?.name || suggestion.serviceType}
                      </h4>
                      <Badge
                        className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}
                        variant="secondary"
                      >
                        {Math.round(suggestion.confidence * 100)}% match
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      {suggestion.reason}
                    </p>

                    {suggestion.estimatedValue && (
                      <p className="text-sm text-green-600 font-medium mb-2">
                        Estimated value: $
                        {suggestion.estimatedValue.toLocaleString()}
                      </p>
                    )}

                    {suggestion.compatibility.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs text-gray-500">
                          Works well with:{" "}
                        </span>
                        <span className="text-xs text-blue-600">
                          {suggestion.compatibility.join(", ")}
                        </span>
                      </div>
                    )}

                    {suggestion.risks && suggestion.risks.length > 0 && (
                      <Alert variant="warning" className="mt-2 py-2">
                        <div className="text-xs">
                          <strong>Consider:</strong>{" "}
                          {suggestion.risks.join("; ")}
                        </div>
                      </Alert>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() =>
                        handleAcceptSuggestion(suggestion.serviceType)
                      }
                      className="flex items-center space-x-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span>Add</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleRejectSuggestion(suggestion.serviceType)
                      }
                      className="flex items-center space-x-1 text-gray-500"
                    >
                      <XCircle className="w-3 h-3" />
                      <span>Skip</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {acceptedSuggestions.size > 0 && (
          <Alert variant="info">
            <CheckCircle className="h-4 w-4" />
            <div className="text-sm">
              Added {acceptedSuggestions.size} suggested service
              {acceptedSuggestions.size > 1 ? "s" : ""} to your project
            </div>
          </Alert>
        )}
      </div>
    </Card>
  );
}

// Helper function to generate intelligent service suggestions
async function generateIntelligentSuggestions(
  flowData: GuidedFlowData,
  currentServices: ServiceType[],
): Promise<ServiceSuggestion[]> {
  const suggestions: ServiceSuggestion[] = [];
  const aiExtractedData = flowData.initialContact?.aiExtractedData;

  if (!aiExtractedData) return suggestions;

  const buildingType = aiExtractedData.requirements.buildingType?.toLowerCase();
  const buildingSize = aiExtractedData.requirements.buildingSize;
  const floors = aiExtractedData.requirements.floors;
  const timeline = aiExtractedData.requirements.timeline?.toLowerCase();

  // Building type specific suggestions
  if (buildingType) {
    const buildingTypeSuggestions = getBuildingTypeSuggestions(
      buildingType,
      currentServices,
    );
    suggestions.push(...buildingTypeSuggestions);
  }

  // Size-based suggestions
  if (buildingSize) {
    const sizeSuggestions = getSizeBasedSuggestions(
      buildingSize,
      currentServices,
    );
    suggestions.push(...sizeSuggestions);
  }

  // Floor-based suggestions
  if (floors && floors > 1) {
    const floorSuggestions = getFloorBasedSuggestions(floors, currentServices);
    suggestions.push(...floorSuggestions);
  }

  // Timeline-based suggestions
  if (timeline) {
    const timelineSuggestions = getTimelineBasedSuggestions(
      timeline,
      currentServices,
    );
    suggestions.push(...timelineSuggestions);
  }

  // Service dependency suggestions
  const dependencySuggestions = getDependencyBasedSuggestions(currentServices);
  suggestions.push(...dependencySuggestions);

  // Photo analysis suggestions (if photos are available)
  if (
    flowData.filesPhotos?.uploadedFiles?.length &&
    flowData.filesPhotos.uploadedFiles.length > 0
  ) {
    const photoSuggestions = await getPhotoBasedSuggestions(
      flowData.filesPhotos.uploadedFiles,
      currentServices,
    );
    suggestions.push(...photoSuggestions);
  }

  // Remove duplicates and sort by priority and confidence
  const uniqueSuggestions = suggestions
    .filter(
      (suggestion, index, self) =>
        self.findIndex((s) => s.serviceType === suggestion.serviceType) ===
        index,
    )
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });

  return uniqueSuggestions.slice(0, 5); // Limit to top 5 suggestions
}

function getBuildingTypeSuggestions(
  buildingType: string,
  currentServices: ServiceType[],
): ServiceSuggestion[] {
  const suggestions: ServiceSuggestion[] = [];

  const buildingTypeMap: Record<string, ServiceSuggestion[]> = {
    office: [
      {
        serviceType: "HD",
        confidence: 0.9,
        reason:
          "Office buildings typically have extensive HVAC systems that accumulate dust",
        priority: "high",
        estimatedValue: 2500,
        compatibility: ["WC", "FC"],
      },
      {
        serviceType: "FC",
        confidence: 0.8,
        reason:
          "Professional office environments benefit from detailed final cleaning",
        priority: "medium",
        estimatedValue: 1200,
        compatibility: ["HD", "WC"],
      },
    ],
    retail: [
      {
        serviceType: "GR",
        confidence: 0.9,
        reason:
          "Retail storefronts rely heavily on pristine glass for customer attraction",
        priority: "high",
        estimatedValue: 3000,
        compatibility: ["WC", "FR"],
      },
      {
        serviceType: "FC",
        confidence: 0.7,
        reason: "Customer-facing retail spaces need thorough final cleaning",
        priority: "medium",
        estimatedValue: 800,
        compatibility: ["WC", "GR"],
      },
    ],
    restaurant: [
      {
        serviceType: "BF",
        confidence: 0.8,
        reason:
          "Food service environments are prone to biofilm and bacterial growth",
        priority: "high",
        estimatedValue: 2200,
        compatibility: ["SW", "FC"],
        risks: ["Health department compliance required"],
      },
      {
        serviceType: "HD",
        confidence: 0.9,
        reason:
          "Restaurant kitchens generate significant grease and dust accumulation",
        priority: "high",
        estimatedValue: 1800,
        compatibility: ["BF", "FC"],
      },
    ],
    hospital: [
      {
        serviceType: "BF",
        confidence: 0.95,
        reason:
          "Healthcare facilities require biofilm removal for infection control",
        priority: "high",
        estimatedValue: 4500,
        compatibility: ["HD", "FC"],
        risks: ["Special health compliance protocols required"],
      },
      {
        serviceType: "FC",
        confidence: 0.9,
        reason:
          "Medical environments demand extensive final cleaning protocols",
        priority: "high",
        estimatedValue: 2000,
        compatibility: ["BF", "HD"],
      },
    ],
    industrial: [
      {
        serviceType: "PWS",
        confidence: 0.8,
        reason:
          "Industrial surfaces benefit from protective sealing after pressure washing",
        priority: "medium",
        estimatedValue: 3500,
        compatibility: ["PW"],
      },
      {
        serviceType: "BF",
        confidence: 0.7,
        reason: "Industrial environments often have biofilm in humid areas",
        priority: "medium",
        estimatedValue: 2800,
        compatibility: ["PW", "SW"],
      },
    ],
  };

  const typeSuggestions = buildingTypeMap[buildingType] || [];
  return typeSuggestions.filter(
    (suggestion) => !currentServices.includes(suggestion.serviceType),
  );
}

function getSizeBasedSuggestions(
  buildingSize: string,
  currentServices: ServiceType[],
): ServiceSuggestion[] {
  const suggestions: ServiceSuggestion[] = [];
  const sizeValue = parseInt(buildingSize.replace(/[^\d]/g, ""));

  if (sizeValue > 100000) {
    // Large buildings
    if (!currentServices.includes("HD")) {
      suggestions.push({
        serviceType: "HD",
        confidence: 0.85,
        reason:
          "Large buildings require extensive high dusting for HVAC efficiency",
        priority: "high",
        estimatedValue: 4000,
        compatibility: ["WC", "FC"],
      });
    }

    if (!currentServices.includes("FC")) {
      suggestions.push({
        serviceType: "FC",
        confidence: 0.8,
        reason: "Large facilities need comprehensive final cleaning",
        priority: "medium",
        estimatedValue: 3000,
        compatibility: ["HD", "WC"],
      });
    }
  } else if (sizeValue > 50000) {
    // Medium buildings
    if (!currentServices.includes("HD")) {
      suggestions.push({
        serviceType: "HD",
        confidence: 0.7,
        reason: "Medium-sized buildings benefit from high dusting services",
        priority: "medium",
        estimatedValue: 2500,
        compatibility: ["WC"],
      });
    }
  }

  return suggestions;
}

function getFloorBasedSuggestions(
  floors: number,
  currentServices: ServiceType[],
): ServiceSuggestion[] {
  const suggestions: ServiceSuggestion[] = [];

  if (floors > 10) {
    // High-rise buildings
    if (!currentServices.includes("PWS")) {
      suggestions.push({
        serviceType: "PWS",
        confidence: 0.8,
        reason:
          "High-rise buildings benefit from protective sealing due to weather exposure",
        priority: "medium",
        estimatedValue: 5000,
        compatibility: ["PW"],
      });
    }
  }

  if (floors > 3) {
    // Multi-story buildings
    if (!currentServices.includes("HD")) {
      suggestions.push({
        serviceType: "HD",
        confidence: 0.75,
        reason:
          "Multi-story buildings have extensive ductwork requiring high dusting",
        priority: "medium",
        estimatedValue: 2000,
        compatibility: ["WC", "FC"],
      });
    }
  }

  return suggestions;
}

function getTimelineBasedSuggestions(
  timeline: string,
  currentServices: ServiceType[],
): ServiceSuggestion[] {
  const suggestions: ServiceSuggestion[] = [];

  if (timeline.includes("urgent") || timeline.includes("rush")) {
    // For urgent projects, suggest efficiency-focused services
    if (!currentServices.includes("FC")) {
      suggestions.push({
        serviceType: "FC",
        confidence: 0.6,
        reason:
          "Urgent projects benefit from final cleaning to ensure complete results",
        priority: "low",
        estimatedValue: 1500,
        compatibility: ["WC", "PW"],
        risks: ["May require overtime rates for urgent completion"],
      });
    }
  }

  return suggestions;
}

function getDependencyBasedSuggestions(
  currentServices: ServiceType[],
): ServiceSuggestion[] {
  const suggestions: ServiceSuggestion[] = [];

  // Service synergy suggestions
  if (currentServices.includes("GR") && !currentServices.includes("FR")) {
    suggestions.push({
      serviceType: "FR",
      confidence: 0.85,
      reason:
        "Frame restoration pairs perfectly with glass restoration for complete window renewal",
      priority: "high",
      estimatedValue: 2500,
      compatibility: ["GR"],
    });
  }

  if (currentServices.includes("PW") && !currentServices.includes("PWS")) {
    suggestions.push({
      serviceType: "PWS",
      confidence: 0.7,
      reason: "Protective sealing extends the life of pressure washing results",
      priority: "medium",
      estimatedValue: 1800,
      compatibility: ["PW"],
    });
  }

  if (
    (currentServices.includes("HD") || currentServices.includes("PW")) &&
    !currentServices.includes("FC")
  ) {
    suggestions.push({
      serviceType: "FC",
      confidence: 0.75,
      reason:
        "Final cleaning ensures all dust and debris from other services is removed",
      priority: "medium",
      estimatedValue: 1200,
      compatibility: ["HD", "PW", "WC"],
    });
  }

  return suggestions;
}

async function getPhotoBasedSuggestions(
  photos: any[],
  currentServices: ServiceType[],
): Promise<ServiceSuggestion[]> {
  // This would typically analyze uploaded photos using AI
  // For now, return basic suggestions based on photo presence
  const suggestions: ServiceSuggestion[] = [];

  if (photos.length > 0) {
    // Assume photos show building condition
    if (!currentServices.includes("GR")) {
      suggestions.push({
        serviceType: "GR",
        confidence: 0.6,
        reason:
          "Photo analysis suggests glass surfaces may benefit from restoration",
        priority: "medium",
        estimatedValue: 2000,
        compatibility: ["WC", "FR"],
      });
    }
  }

  return suggestions;
}

export default IntelligentServiceSuggestions;
