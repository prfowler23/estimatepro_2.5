"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lightbulb, Sparkles, Plus, CheckCircle } from "lucide-react";
import { ServiceType } from "@/lib/types/estimate-types";
import { logger } from "@/lib/utils/logger";

interface SimpleServiceSuggestionsProps {
  projectDescription: string;
  selectedServices: ServiceType[];
  onServicesSuggested: (services: ServiceType[]) => void;
  className?: string;
}

interface SimpleSuggestion {
  serviceType: ServiceType;
  reason: string;
  confidence: number;
}

export function SimpleServiceSuggestions({
  projectDescription,
  selectedServices,
  onServicesSuggested,
  className = "",
}: SimpleServiceSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SimpleSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addedSuggestions, setAddedSuggestions] = useState<Set<ServiceType>>(
    new Set(),
  );

  // Generate simple suggestions based on project description keywords
  useEffect(() => {
    if (!projectDescription?.trim()) {
      setSuggestions([]);
      return;
    }

    generateSimpleSuggestions();
  }, [projectDescription, selectedServices]);

  const generateSimpleSuggestions = async () => {
    setIsLoading(true);
    try {
      // Simple keyword-based suggestions for now
      const keywordSuggestions = getKeywordBasedSuggestions(projectDescription);

      // Filter out already selected services
      const filteredSuggestions = keywordSuggestions.filter(
        (suggestion) =>
          !selectedServices.includes(suggestion.serviceType) &&
          !addedSuggestions.has(suggestion.serviceType),
      );

      setSuggestions(filteredSuggestions);
    } catch (error) {
      logger.error("Failed to generate simple service suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getKeywordBasedSuggestions = (
    description: string,
  ): SimpleSuggestion[] => {
    const lowerDesc = description.toLowerCase();
    const suggestions: SimpleSuggestion[] = [];

    // Window cleaning suggestions
    if (lowerDesc.includes("window") || lowerDesc.includes("glass")) {
      suggestions.push({
        serviceType: "window-cleaning",
        reason: "Project mentions windows or glass",
        confidence: 0.8,
      });
    }

    // Pressure washing suggestions
    if (
      lowerDesc.includes("clean") ||
      lowerDesc.includes("wash") ||
      lowerDesc.includes("dirty") ||
      lowerDesc.includes("grime")
    ) {
      suggestions.push({
        serviceType: "pressure-washing",
        reason: "Project involves cleaning services",
        confidence: 0.7,
      });
    }

    // Building maintenance suggestions
    if (
      lowerDesc.includes("maintenance") ||
      lowerDesc.includes("repair") ||
      lowerDesc.includes("fix")
    ) {
      suggestions.push({
        serviceType: "building-maintenance",
        reason: "Project involves maintenance work",
        confidence: 0.75,
      });
    }

    // Glass restoration for damaged glass
    if (
      lowerDesc.includes("scratch") ||
      lowerDesc.includes("damage") ||
      lowerDesc.includes("restoration")
    ) {
      suggestions.push({
        serviceType: "glass-restoration",
        reason: "Project mentions glass damage or restoration needs",
        confidence: 0.85,
      });
    }

    return suggestions;
  };

  const handleAddSuggestion = (serviceType: ServiceType) => {
    const newServices = [...selectedServices, serviceType];
    onServicesSuggested(newServices);
    setAddedSuggestions((prev) => new Set([...prev, serviceType]));
  };

  if (isLoading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 animate-pulse text-blue-500" />
          <span className="text-sm text-gray-600">
            Analyzing project for service suggestions...
          </span>
        </div>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null; // Don't show anything if no suggestions
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <h3 className="font-semibold text-sm">Suggested Services</h3>
          <Badge variant="secondary" className="text-xs">
            AI-Generated
          </Badge>
        </div>

        <p className="text-sm text-gray-600">
          Based on your project description, you might also need:
        </p>

        <div className="space-y-2">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.serviceType}
              className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium capitalize">
                    {suggestion.serviceType.replace("-", " ")}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(suggestion.confidence * 100)}% match
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">{suggestion.reason}</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleAddSuggestion(suggestion.serviceType)}
                className="ml-2"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
          ))}
        </div>

        {addedSuggestions.size > 0 && (
          <Alert variant="info">
            <CheckCircle className="h-4 w-4" />
            <div className="text-sm">
              Added {addedSuggestions.size} suggested service
              {addedSuggestions.size > 1 ? "s" : ""} to your project
            </div>
          </Alert>
        )}
      </div>
    </Card>
  );
}

export default SimpleServiceSuggestions;
