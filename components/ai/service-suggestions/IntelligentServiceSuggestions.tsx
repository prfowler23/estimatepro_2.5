// Refactored intelligent service suggestions component
"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Lightbulb, CheckCircle, Sparkles } from "lucide-react";
import { ServiceType, GuidedFlowData } from "@/lib/types/estimate-types";
import { ServiceSuggestion } from "@/lib/types/ai-types";
import { ServiceSuggestionCard } from "./ServiceSuggestionCard";
import { generateIntelligentSuggestions } from "@/lib/ai/service-suggestion-generator";
import {
  validateAIInput,
  AIExtractedDataSchema,
  ServiceSuggestionSchema,
} from "@/lib/ai/ai-input-validation";

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
    // Add safety guard for undefined flowData
    if (!flowData) {
      console.warn("IntelligentServiceSuggestions: flowData is undefined");
      return;
    }

    if (!flowData.initialContact?.aiExtractedData) {
      return;
    }

    // Validate AI extracted data before processing
    const validation = validateAIInput(
      AIExtractedDataSchema,
      flowData.initialContact.aiExtractedData,
    );

    if (!validation.success) {
      console.error("Invalid AI extracted data:", validation.error);
      return;
    }

    setIsLoading(true);
    try {
      const rawSuggestions = await generateIntelligentSuggestions(
        flowData,
        currentServices,
      );

      // Validate each suggestion
      const validSuggestions = rawSuggestions
        .map((suggestion) => {
          const result = validateAIInput(ServiceSuggestionSchema, suggestion);
          return result.success ? result.data : null;
        })
        .filter((s): s is ServiceSuggestion => s !== null);

      setSuggestions(validSuggestions);
    } catch (error) {
      console.error("Failed to generate service suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSuggestion = (serviceType: string) => {
    const typedServiceType = serviceType as ServiceType;
    setAcceptedSuggestions((prev) => new Set([...prev, typedServiceType]));
    onAcceptSuggestion(typedServiceType);
  };

  const handleRejectSuggestion = (serviceType: string) => {
    const typedServiceType = serviceType as ServiceType;
    setRejectedSuggestions((prev) => new Set([...prev, typedServiceType]));
    onRejectSuggestion(typedServiceType);
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
          {visibleSuggestions.map((suggestion) => (
            <ServiceSuggestionCard
              key={suggestion.serviceType}
              suggestion={suggestion}
              onAccept={handleAcceptSuggestion}
              onReject={handleRejectSuggestion}
            />
          ))}
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

export default IntelligentServiceSuggestions;
