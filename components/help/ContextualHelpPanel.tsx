"use client";

import React, { useState, useMemo, useCallback, memo, useEffect } from "react";
import { useHelp } from "./HelpProvider";
import { HelpContent } from "@/lib/help/help-types";
import { helpPerformanceMonitor } from "@/lib/help/help-performance";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import {
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  Lightbulb,
  AlertCircle,
  PlayCircle,
  Video,
  FileText,
  Sparkles,
} from "lucide-react";

interface ContextualHelpPanelProps {
  className?: string;
  position?: "floating" | "sidebar" | "inline";
  compact?: boolean;
}

const ContextualHelpPanelComponent = ({
  className = "",
  position = "floating",
  compact = false,
}: ContextualHelpPanelProps) => {
  // Track component render time
  useEffect(() => {
    helpPerformanceMonitor.startTiming("help_panel_render");
    return () => {
      const renderTime = helpPerformanceMonitor.endTiming("help_panel_render");
      if (renderTime > 50) {
        console.warn(`Help panel render took ${renderTime}ms`);
      }
    };
  }, []);
  const {
    state,
    userProfile,
    getContextualHelp,
    getSmartSuggestions,
    getAvailableTutorials,
    markHelpful,
    markNotHelpful,
    dismissHelp,
    startTutorial,
    trackBehavior,
  } = useHelp();

  const { isMobile } = useMobileDetection();
  const [activeSection, setActiveSection] = useState<
    "help" | "suggestions" | "tutorials"
  >("help");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback(
    (itemId: string) => {
      setExpandedItems((prev) => {
        const newExpanded = new Set(prev);
        if (newExpanded.has(itemId)) {
          newExpanded.delete(itemId);
        } else {
          newExpanded.add(itemId);
        }
        return newExpanded;
      });
      trackBehavior("help_expand_toggle", {
        itemId,
        expanded: !expandedItems.has(itemId),
      });
    },
    [expandedItems, trackBehavior],
  );

  const handleHelpful = useCallback(
    (helpId: string) => {
      markHelpful(helpId);
    },
    [markHelpful],
  );

  const handleNotHelpful = useCallback(
    (helpId: string) => {
      markNotHelpful(helpId);
    },
    [markNotHelpful],
  );

  const handleDismiss = useCallback(
    (helpId: string) => {
      dismissHelp(helpId);
    },
    [dismissHelp],
  );

  if (!state.currentContext) return null;

  // Track content retrieval performance
  const contextualHelp = useMemo(() => {
    helpPerformanceMonitor.startTiming("get_contextual_help");
    const help = getContextualHelp();
    helpPerformanceMonitor.endTiming("get_contextual_help");
    return help;
  }, [getContextualHelp]);

  const smartSuggestions = useMemo(() => {
    helpPerformanceMonitor.startTiming("get_smart_suggestions");
    const suggestions = getSmartSuggestions();
    helpPerformanceMonitor.endTiming("get_smart_suggestions");
    return suggestions;
  }, [getSmartSuggestions]);

  const availableTutorials = useMemo(() => {
    helpPerformanceMonitor.startTiming("get_available_tutorials");
    const tutorials = getAvailableTutorials();
    helpPerformanceMonitor.endTiming("get_available_tutorials");
    return tutorials;
  }, [getAvailableTutorials]);

  const triggeredHelp = state.triggeredHelp;

  const hasContent =
    contextualHelp.length > 0 ||
    smartSuggestions.length > 0 ||
    availableTutorials.length > 0 ||
    triggeredHelp.length > 0;

  if (!hasContent && !compact) return null;

  const getHelpIcon = (type: HelpContent["type"]) => {
    switch (type) {
      case "tooltip":
        return <HelpCircle className="w-4 h-4" />;
      case "panel":
        return <FileText className="w-4 h-4" />;
      case "tutorial":
        return <BookOpen className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      case "demo":
        return <PlayCircle className="w-4 h-4" />;
      default:
        return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getHelpTypeColor = (type: HelpContent["type"]) => {
    switch (type) {
      case "tooltip":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "panel":
        return "bg-green-100 text-green-700 border-green-200";
      case "tutorial":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "video":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "demo":
        return "bg-pink-100 text-pink-700 border-pink-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const renderHelpItem = (helpContent: HelpContent, isTriggered = false) => {
    const isExpanded = expandedItems.has(helpContent.id);

    return (
      <Card
        key={helpContent.id}
        className={`p-3 ${isTriggered ? "border-yellow-300 bg-yellow-50" : "border-gray-200"} ${compact ? "text-sm" : ""}`}
      >
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <div
                className={`p-1 rounded ${getHelpTypeColor(helpContent.type)} flex-shrink-0`}
              >
                {getHelpIcon(helpContent.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">
                  {helpContent.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {helpContent.type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Priority: {helpContent.priority}
                  </Badge>
                  {isTriggered && (
                    <Badge variant="default" className="text-xs bg-yellow-600">
                      Suggested
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpanded(helpContent.id)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
              {isTriggered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(helpContent.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <Collapsible open={isExpanded}>
            <CollapsibleContent className="space-y-3">
              <div className="text-gray-700 text-sm leading-relaxed">
                {helpContent.content}
              </div>

              {/* Tags */}
              {helpContent.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {helpContent.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  {userProfile.experienceLevel} level content
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleHelpful(helpContent.id)}
                    className="h-6 px-2 text-xs"
                  >
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    Helpful
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNotHelpful(helpContent.id)}
                    className="h-6 px-2 text-xs"
                  >
                    <ThumbsDown className="w-3 h-3 mr-1" />
                    Not helpful
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </Card>
    );
  };

  const renderTutorialItem = (tutorial: any) => {
    return (
      <Card key={tutorial.id} className="p-3 border-purple-200 bg-purple-50">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1">
              <BookOpen className="w-4 h-4 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-purple-900">
                  {tutorial.title}
                </h4>
                <p className="text-sm text-purple-700 mt-1">
                  {tutorial.description}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-purple-600">
                  <span>⏱️ {tutorial.estimatedTime} min</span>
                  <span>📊 {tutorial.difficulty}</span>
                  <span>📖 {tutorial.steps.length} steps</span>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={() => startTutorial(tutorial.id)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            size="sm"
          >
            <PlayCircle className="w-3 h-3 mr-1" />
            Start Tutorial
          </Button>
        </div>
      </Card>
    );
  };

  const getPositionClasses = () => {
    switch (position) {
      case "floating":
        return isMobile
          ? "fixed bottom-20 left-4 right-4 z-40 max-h-[60vh] overflow-y-auto"
          : "fixed top-20 right-4 w-80 z-40 max-h-[calc(100vh-8rem)] overflow-y-auto";
      case "sidebar":
        return "w-full h-full";
      case "inline":
        return "w-full";
      default:
        return "";
    }
  };

  return (
    <div className={`${getPositionClasses()} ${className}`}>
      <Card className="bg-white border shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">
                {compact ? "Help" : "Contextual Help"}
              </h3>
              {(triggeredHelp.length > 0 || smartSuggestions.length > 0) && (
                <Badge variant="secondary" className="text-xs">
                  {triggeredHelp.length + smartSuggestions.length} new
                </Badge>
              )}
            </div>
            {position === "floating" && !isMobile && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Section Tabs */}
          {!compact && (
            <div className="flex gap-1 mt-3">
              {[
                {
                  id: "help",
                  label: "Help",
                  count: contextualHelp.length + triggeredHelp.length,
                },
                {
                  id: "suggestions",
                  label: "Tips",
                  count: smartSuggestions.length,
                },
                {
                  id: "tutorials",
                  label: "Tutorials",
                  count: availableTutorials.length,
                },
              ].map((section) => (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveSection(section.id as any)}
                  className="text-xs"
                >
                  {section.label}
                  {section.count > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {section.count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Triggered Help (always shown first) */}
          {triggeredHelp.length > 0 && (
            <div className="space-y-3">
              {!compact && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <h4 className="font-medium text-yellow-800">
                    Suggested for You
                  </h4>
                </div>
              )}
              {triggeredHelp.map((help) => renderHelpItem(help, true))}
            </div>
          )}

          {/* Section Content */}
          {activeSection === "help" && contextualHelp.length > 0 && (
            <div className="space-y-3">
              {!compact && triggeredHelp.length === 0 && (
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <h4 className="font-medium text-gray-800">Available Help</h4>
                </div>
              )}
              {contextualHelp.map((help) => renderHelpItem(help))}
            </div>
          )}

          {activeSection === "suggestions" && smartSuggestions.length > 0 && (
            <div className="space-y-3">
              {!compact && (
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-green-600" />
                  <h4 className="font-medium text-gray-800">
                    Smart Suggestions
                  </h4>
                </div>
              )}
              {smartSuggestions.map((suggestion) => renderHelpItem(suggestion))}
            </div>
          )}

          {activeSection === "tutorials" && availableTutorials.length > 0 && (
            <div className="space-y-3">
              {!compact && (
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  <h4 className="font-medium text-gray-800">
                    Interactive Tutorials
                  </h4>
                </div>
              )}
              {availableTutorials.map((tutorial) =>
                renderTutorialItem(tutorial),
              )}
            </div>
          )}

          {/* Empty State */}
          {!hasContent && (
            <div className="text-center py-6">
              <HelpCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                No help available for this context.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Continue filling out the form to get contextual assistance.
              </p>
            </div>
          )}

          {/* Experience Level Indicator */}
          {!compact && hasContent && (
            <div className="border-t border-gray-100 pt-3 mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Showing {userProfile.experienceLevel} level content</span>
                <Badge variant="outline" className="text-xs">
                  Step {state.currentContext.stepNumber}/9
                </Badge>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export const ContextualHelpPanel = memo(ContextualHelpPanelComponent);
export default ContextualHelpPanel;
