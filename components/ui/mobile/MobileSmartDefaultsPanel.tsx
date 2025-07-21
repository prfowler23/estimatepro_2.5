"use client";

import React from "react";
import { useSmartDefaults } from "@/components/ai/SmartDefaultsProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SmartDefault, SmartSuggestion } from "@/lib/ai/smart-defaults-engine";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  X,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Plus,
} from "lucide-react";

interface MobileSmartDefaultsPanelProps {
  className?: string;
}

export function MobileSmartDefaultsPanel({
  className = "",
}: MobileSmartDefaultsPanelProps) {
  const { state, actions } = useSmartDefaults();
  const { applyDefault, applySuggestion, dismissSuggestion } = actions;
  const [defaultsOpen, setDefaultsOpen] = React.useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = React.useState(false);

  const hasDefaults = state.defaults.length > 0;
  const hasSuggestions = state.suggestions.length > 0;
  const totalItems = state.defaults.length + state.suggestions.length;

  if (!hasDefaults && !hasSuggestions) return null;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-50 border-green-200";
    if (confidence >= 0.6)
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  const getSuggestionIcon = (type: SmartSuggestion["type"]) => {
    switch (type) {
      case "optimization":
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case "risk-mitigation":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "service-addition":
        return <Plus className="w-4 h-4 text-green-500" />;
      case "pricing-adjustment":
        return <Lightbulb className="w-4 h-4 text-purple-500" />;
      default:
        return <Lightbulb className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSuggestionColor = (impact: SmartSuggestion["impact"]) => {
    switch (impact) {
      case "high":
        return "border-red-200 bg-red-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      case "low":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 ${className}`}>
      {/* Mobile AI Assistant Bottom Bar */}
      <Sheet>
        <SheetTrigger asChild>
          <div className="bg-white border-t border-gray-200 p-3 shadow-lg">
            <Button
              variant="ghost"
              className="w-full justify-between h-auto p-3"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <span className="font-medium">AI Assistant</span>
                <Badge variant="secondary" className="text-xs">
                  {totalItems}
                </Badge>
              </div>
              <ChevronUp className="w-4 h-4" />
            </Button>
          </div>
        </SheetTrigger>

        <SheetContent side="bottom" className="h-[80vh] p-0">
          <div className="h-full flex flex-col">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                AI Assistant
              </SheetTitle>
              <SheetDescription>
                Smart defaults and suggestions to speed up your estimation
                process.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Smart Defaults Section */}
              {hasDefaults && (
                <Collapsible open={defaultsOpen} onOpenChange={setDefaultsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-3 h-auto"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">Smart Defaults</span>
                        <Badge variant="secondary" className="text-xs">
                          {state.defaults.length}
                        </Badge>
                      </div>
                      {defaultsOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-3 mt-2">
                    {state.defaults.map((defaultItem, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${getConfidenceColor(defaultItem.confidence)}`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium">
                                  {defaultItem.field.split(".").pop()}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {Math.round(defaultItem.confidence * 100)}%
                                </Badge>
                              </div>
                              <p className="text-sm font-medium mb-1">
                                {String(defaultItem.value)}
                              </p>
                              <p className="text-xs text-gray-600">
                                {defaultItem.reasoning}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => applyDefault(defaultItem)}
                              className="flex-1 text-xs"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Apply
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Smart Suggestions Section */}
              {hasSuggestions && (
                <Collapsible
                  open={suggestionsOpen}
                  onOpenChange={setSuggestionsOpen}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-3 h-auto"
                    >
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <span className="font-medium">Suggestions</span>
                        <Badge variant="secondary" className="text-xs">
                          {state.suggestions.length}
                        </Badge>
                      </div>
                      {suggestionsOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-3 mt-2">
                    {state.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${getSuggestionColor(suggestion.impact)}`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            {getSuggestionIcon(suggestion.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium">
                                  {suggestion.title}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    suggestion.impact === "high"
                                      ? "border-red-300 text-red-700"
                                      : suggestion.impact === "medium"
                                        ? "border-yellow-300 text-yellow-700"
                                        : "border-blue-300 text-blue-700"
                                  }`}
                                >
                                  {suggestion.impact} impact
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">
                                {suggestion.description}
                              </p>
                              <p className="text-xs text-green-600 font-medium">
                                Impact: {suggestion.impact}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {suggestion.targetField &&
                            suggestion.suggestedValue !== undefined ? (
                              <Button
                                size="sm"
                                onClick={() => applySuggestion(suggestion)}
                                className="flex-1 text-xs"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Apply
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs"
                                disabled
                              >
                                Review Manually
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => dismissSuggestion(suggestion.id)}
                              className="text-xs"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Empty State */}
              {!hasDefaults && !hasSuggestions && (
                <div className="text-center py-8">
                  <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    No AI suggestions available yet.
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Fill in more details to get smart recommendations.
                  </p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default MobileSmartDefaultsPanel;
