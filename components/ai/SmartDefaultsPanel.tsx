"use client";

import React from "react";
import { useSmartDefaults } from "./SmartDefaultsProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  Sparkles,
  CheckCircle,
  X,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Plus,
  Info,
  Lightbulb,
} from "lucide-react";
import { SmartDefault, SmartSuggestion } from "@/lib/ai/smart-defaults-engine";

interface SmartDefaultsPanelProps {
  className?: string;
  compact?: boolean;
}

export function SmartDefaultsPanel({
  className = "",
  compact = false,
}: SmartDefaultsPanelProps) {
  const { state, actions } = useSmartDefaults();

  if (state.isLoading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-center">
          <Sparkles className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm text-gray-600">
            Generating smart suggestions...
          </span>
        </div>
      </Card>
    );
  }

  if (state.error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <div>
          <h4 className="font-medium">Smart Defaults Error</h4>
          <p className="text-sm">{state.error}</p>
        </div>
      </Alert>
    );
  }

  const hasDefaults = state.defaults.length > 0;
  const hasSuggestions = state.suggestions.length > 0;

  if (!hasDefaults && !hasSuggestions) {
    return null; // Don't show empty panel
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Smart Defaults Section */}
      {hasDefaults && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-sm">Smart Defaults</h3>
              <Badge variant="secondary" className="text-xs">
                {state.defaults.length}
              </Badge>
            </div>
            {!compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={actions.refreshDefaults}
                className="text-xs"
              >
                Refresh
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {state.defaults
              .slice(0, compact ? 3 : undefined)
              .map((defaultItem, index) => (
                <DefaultItem
                  key={`${defaultItem.field}-${index}`}
                  defaultItem={defaultItem}
                  onApply={() => actions.applyDefault(defaultItem)}
                  compact={compact}
                />
              ))}

            {compact && state.defaults.length > 3 && (
              <p className="text-xs text-gray-500 text-center py-2">
                +{state.defaults.length - 3} more defaults available
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Smart Suggestions Section */}
      {hasSuggestions && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-sm">Smart Suggestions</h3>
              <Badge variant="secondary" className="text-xs">
                {state.suggestions.length}
              </Badge>
            </div>
            {!compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={actions.refreshSuggestions}
                className="text-xs"
              >
                Refresh
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {state.suggestions
              .slice(0, compact ? 2 : undefined)
              .map((suggestion) => (
                <SuggestionItem
                  key={suggestion.id}
                  suggestion={suggestion}
                  onApply={() => actions.applySuggestion(suggestion)}
                  onDismiss={() => actions.dismissSuggestion(suggestion.id)}
                  compact={compact}
                />
              ))}

            {compact && state.suggestions.length > 2 && (
              <p className="text-xs text-gray-500 text-center py-2">
                +{state.suggestions.length - 2} more suggestions available
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function DefaultItem({
  defaultItem,
  onApply,
  compact,
}: {
  defaultItem: SmartDefault;
  onApply: () => void;
  compact: boolean;
}) {
  const getSourceIcon = (source: string) => {
    switch (source) {
      case "ai":
        return <Sparkles className="w-3 h-3 text-blue-500" />;
      case "historical":
        return <TrendingUp className="w-3 h-3 text-green-500" />;
      case "template":
        return <CheckCircle className="w-3 h-3 text-purple-500" />;
      default:
        return <Info className="w-3 h-3 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-50";
    if (confidence >= 0.6) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const formatValue = (value: any) => {
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {getSourceIcon(defaultItem.source)}
          <span className="text-sm font-medium truncate">
            {defaultItem.field.split(".").pop()}
          </span>
          <Badge
            variant="secondary"
            className={`text-xs ${getConfidenceColor(defaultItem.confidence)}`}
          >
            {Math.round(defaultItem.confidence * 100)}%
          </Badge>
        </div>

        <p className="text-xs text-gray-600 mb-1">
          {formatValue(defaultItem.value)}
        </p>

        {!compact && (
          <p className="text-xs text-gray-500">{defaultItem.reasoning}</p>
        )}
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={onApply}
        className="ml-2 text-xs"
      >
        Apply
      </Button>
    </div>
  );
}

function SuggestionItem({
  suggestion,
  onApply,
  onDismiss,
  compact,
}: {
  suggestion: SmartSuggestion;
  onApply: () => void;
  onDismiss: () => void;
  compact: boolean;
}) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "service-addition":
        return <Plus className="w-4 h-4 text-green-500" />;
      case "pricing-adjustment":
        return <DollarSign className="w-4 h-4 text-blue-500" />;
      case "risk-mitigation":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "optimization":
        return <TrendingUp className="w-4 h-4 text-purple-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "border-l-red-500 bg-red-50";
      case "medium":
        return "border-l-yellow-500 bg-yellow-50";
      case "low":
        return "border-l-green-500 bg-green-50";
      default:
        return "border-l-gray-500 bg-gray-50";
    }
  };

  return (
    <div
      className={`border-l-4 p-3 rounded-r-lg ${getImpactColor(suggestion.impact)}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getTypeIcon(suggestion.type)}
            <span className="text-sm font-medium">{suggestion.title}</span>
            <Badge variant="outline" className="text-xs">
              {suggestion.impact} impact
            </Badge>
          </div>

          <p className="text-sm text-gray-700 mb-2">{suggestion.description}</p>

          {!compact && (
            <p className="text-xs text-gray-500 mb-2">{suggestion.reasoning}</p>
          )}

          <div className="flex items-center gap-2">
            {suggestion.actionType !== "informational" && (
              <Button
                size="sm"
                variant={
                  suggestion.actionType === "auto-apply" ? "default" : "outline"
                }
                onClick={onApply}
                className="text-xs"
              >
                {suggestion.actionType === "auto-apply" ? "Apply" : "Consider"}
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="text-xs text-gray-500"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="ml-2 text-right">
          <div className="text-xs text-gray-500">
            {Math.round(suggestion.confidence * 100)}% confident
          </div>
        </div>
      </div>
    </div>
  );
}

export default SmartDefaultsPanel;
