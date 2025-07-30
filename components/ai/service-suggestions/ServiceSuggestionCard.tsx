"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  TrendingUp,
  Eye,
  Info,
  Lightbulb,
} from "lucide-react";
import { ServiceSuggestion } from "@/lib/types/ai-types";
import { SERVICE_METADATA } from "@/lib/types/estimate-types";

interface ServiceSuggestionCardProps {
  suggestion: ServiceSuggestion;
  onAccept: (serviceType: string) => void;
  onReject: (serviceType: string) => void;
}

export function ServiceSuggestionCard({
  suggestion,
  onAccept,
  onReject,
}: ServiceSuggestionCardProps) {
  const serviceMetadata = SERVICE_METADATA[suggestion.serviceType];

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

  return (
    <div
      className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
      role="article"
      aria-label={`Service suggestion: ${serviceMetadata?.name || suggestion.serviceType}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span aria-hidden="true">
              {getPriorityIcon(suggestion.priority)}
            </span>
            <h4
              className="font-medium"
              id={`suggestion-${suggestion.serviceType}-title`}
            >
              {serviceMetadata?.name || suggestion.serviceType}
            </h4>
            <Badge
              className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}
              variant="secondary"
              aria-label={`Confidence level: ${Math.round(suggestion.confidence * 100)}% match`}
            >
              {Math.round(suggestion.confidence * 100)}% match
            </Badge>
          </div>

          <p className="text-sm text-gray-600 mb-2">{suggestion.reason}</p>

          {suggestion.estimatedValue && (
            <p className="text-sm text-green-600 font-medium mb-2">
              Estimated value: ${suggestion.estimatedValue.toLocaleString()}
            </p>
          )}

          {suggestion.compatibility.length > 0 && (
            <div className="mb-2">
              <span className="text-xs text-gray-500">Works well with: </span>
              <span className="text-xs text-blue-600">
                {suggestion.compatibility.join(", ")}
              </span>
            </div>
          )}

          {suggestion.risks && suggestion.risks.length > 0 && (
            <Alert variant="warning" className="mt-2 py-2">
              <div className="text-xs">
                <strong>Consider:</strong> {suggestion.risks.join("; ")}
              </div>
            </Alert>
          )}
        </div>

        <div
          className="flex flex-col space-y-2 ml-4"
          role="group"
          aria-label="Suggestion actions"
        >
          <Button
            size="sm"
            onClick={() => onAccept(suggestion.serviceType)}
            className="flex items-center space-x-1"
            aria-label={`Add ${serviceMetadata?.name || suggestion.serviceType} service`}
            aria-describedby={`suggestion-${suggestion.serviceType}-title`}
          >
            <CheckCircle className="w-3 h-3" aria-hidden="true" />
            <span>Add</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onReject(suggestion.serviceType)}
            className="flex items-center space-x-1 text-gray-500"
            aria-label={`Skip ${serviceMetadata?.name || suggestion.serviceType} suggestion`}
          >
            <XCircle className="w-3 h-3" aria-hidden="true" />
            <span>Skip</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
