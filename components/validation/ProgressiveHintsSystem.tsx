// UX Task 1: Progressive Hints and Contextual Help System
// Replaces blocking validation errors with helpful, progressive guidance

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  X,
  Info,
  Star,
  Target,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  Wand2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import { Collapsible } from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  GuidedFlowValidator,
  ValidationResult,
} from "@/lib/validation/guided-flow-validation";

export interface ProgressiveHint {
  id: string;
  type: "info" | "suggestion" | "improvement" | "requirement" | "warning";
  priority: "low" | "medium" | "high" | "critical";
  category: "completion" | "optimization" | "compliance" | "quality";
  title: string;
  message: string;
  icon?: React.ReactNode;
  actionable: boolean;
  autoFixAvailable?: boolean;
  fieldPath?: string;
  suggestedValue?: any;
  contextualHelp?: {
    title: string;
    description: string;
    examples?: string[];
    learnMoreUrl?: string;
  };
  dismissible: boolean;
  progressValue?: number; // 0-100 for completion tracking
  completionCriteria?: string[];
  estimatedTime?: string; // "2 min", "Quick", etc.
}

export interface ProgressiveHintsConfig {
  stepNumber: number;
  flowData: any;
  validationResult: ValidationResult;
  userExperienceLevel: "beginner" | "intermediate" | "advanced";
  showCompletedTasks: boolean;
  enableAutoFix: boolean;
  maxHintsShown: number;
}

interface ProgressiveHintsSystemProps {
  config: ProgressiveHintsConfig;
  onApplyAutoFix?: (fieldPath: string, suggestedValue: any) => void;
  onRequestHelp?: (hint: ProgressiveHint) => void;
  onHintDismiss?: (hintId: string) => void;
  className?: string;
}

export function ProgressiveHintsSystem({
  config,
  onApplyAutoFix,
  onRequestHelp,
  onHintDismiss,
  className = "",
}: ProgressiveHintsSystemProps) {
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["requirement", "completion"]),
  );
  const [showAllHints, setShowAllHints] = useState(false);

  // Transform validation results into progressive hints
  const progressiveHints = useMemo(() => {
    return transformValidationToHints(config);
  }, [config]);

  // Filter and sort hints
  const visibleHints = useMemo(() => {
    let filtered = progressiveHints.filter((hint) => {
      // Don't show dismissed hints
      if (dismissedHints.has(hint.id)) return false;

      // Hide completed tasks unless explicitly shown
      if (!config.showCompletedTasks && hint.progressValue === 100)
        return false;

      return true;
    });

    // Sort by priority and type
    filtered.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const typeOrder = {
        requirement: 4,
        warning: 3,
        improvement: 2,
        suggestion: 1,
        info: 0,
      };

      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }

      return typeOrder[b.type] - typeOrder[a.type];
    });

    // Limit number shown unless expanded
    if (!showAllHints && filtered.length > config.maxHintsShown) {
      filtered = filtered.slice(0, config.maxHintsShown);
    }

    return filtered;
  }, [
    progressiveHints,
    dismissedHints,
    config.showCompletedTasks,
    config.maxHintsShown,
    showAllHints,
  ]);

  // Group hints by category
  const hintCategories = useMemo(() => {
    const categories: Record<string, ProgressiveHint[]> = {};

    visibleHints.forEach((hint) => {
      if (!categories[hint.category]) {
        categories[hint.category] = [];
      }
      categories[hint.category].push(hint);
    });

    return categories;
  }, [visibleHints]);

  // Calculate overall completion
  const overallCompletion = useMemo(() => {
    const allHints = progressiveHints.filter(
      (h) => h.progressValue !== undefined,
    );
    if (allHints.length === 0) return 100;

    const totalProgress = allHints.reduce(
      (sum, hint) => sum + (hint.progressValue || 0),
      0,
    );
    return Math.round(totalProgress / allHints.length);
  }, [progressiveHints]);

  const handleDismissHint = (hintId: string) => {
    setDismissedHints((prev) => new Set([...prev, hintId]));
    onHintDismiss?.(hintId);
  };

  const handleToggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleApplyAutoFix = (hint: ProgressiveHint) => {
    if (hint.fieldPath && hint.suggestedValue !== undefined) {
      onApplyAutoFix?.(hint.fieldPath, hint.suggestedValue);
    }
  };

  if (visibleHints.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`p-4 ${className}`}
      >
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">Step Complete!</h3>
              <p className="text-sm text-green-700">
                All requirements met. You can proceed to the next step or
                continue refining.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall Progress Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Step Progress</h3>
            <Badge
              variant={overallCompletion === 100 ? "success" : "secondary"}
            >
              {overallCompletion}% Complete
            </Badge>
          </div>

          {progressiveHints.length > config.maxHintsShown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllHints(!showAllHints)}
            >
              {showAllHints
                ? "Show Less"
                : `Show All (${progressiveHints.length})`}
            </Button>
          )}
        </div>

        <Progress value={overallCompletion} className="h-2" />

        <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
          <span>
            {visibleHints.filter((h) => h.type === "requirement").length}{" "}
            requirements •{" "}
            {visibleHints.filter((h) => h.type === "improvement").length}{" "}
            improvements
          </span>
          <span>
            {visibleHints.filter((h) => h.progressValue === 100).length}{" "}
            completed
          </span>
        </div>
      </Card>

      {/* Hint Categories */}
      <AnimatePresence>
        {Object.entries(hintCategories).map(([categoryKey, hints]) => (
          <motion.div
            key={categoryKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="overflow-hidden">
              <Collapsible
                open={expandedCategories.has(categoryKey)}
                onOpenChange={() => handleToggleCategory(categoryKey)}
              >
                <button
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  onClick={() => handleToggleCategory(categoryKey)}
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon
                      category={categoryKey as ProgressiveHint["category"]}
                    />
                    <div className="text-left">
                      <h3 className="font-semibold capitalize">
                        {categoryKey.replace("_", " ")}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {hints.length} {hints.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {hints.filter((h) => h.progressValue === 100).length}/
                      {hints.length}
                    </Badge>
                    <ArrowRight
                      className={`w-4 h-4 transition-transform ${
                        expandedCategories.has(categoryKey) ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {expandedCategories.has(categoryKey) && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="border-t"
                    >
                      <div className="p-4 space-y-3">
                        {hints.map((hint) => (
                          <HintCard
                            key={hint.id}
                            hint={hint}
                            onApplyAutoFix={() => handleApplyAutoFix(hint)}
                            onRequestHelp={() => onRequestHelp?.(hint)}
                            onDismiss={() => handleDismissHint(hint.id)}
                            userExperienceLevel={config.userExperienceLevel}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Collapsible>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Individual hint card component
interface HintCardProps {
  hint: ProgressiveHint;
  onApplyAutoFix: () => void;
  onRequestHelp: () => void;
  onDismiss: () => void;
  userExperienceLevel: "beginner" | "intermediate" | "advanced";
}

function HintCard({
  hint,
  onApplyAutoFix,
  onRequestHelp,
  onDismiss,
  userExperienceLevel,
}: HintCardProps) {
  const [showContextualHelp, setShowContextualHelp] = useState(false);

  const isCompleted = hint.progressValue === 100;
  const showAdvancedInfo = userExperienceLevel === "advanced";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`p-4 rounded-lg border transition-colors ${
        isCompleted
          ? "bg-green-50 border-green-200"
          : getHintColorClasses(hint.type, hint.priority)
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div
            className={`mt-0.5 ${isCompleted ? "text-green-600" : getHintIconColor(hint.type)}`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              hint.icon || getHintIcon(hint.type)
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4
                className={`font-medium ${isCompleted ? "text-green-900" : ""}`}
              >
                {hint.title}
              </h4>

              <div className="flex items-center gap-1 flex-shrink-0">
                {hint.estimatedTime && (
                  <Badge variant="outline" className="text-xs">
                    {hint.estimatedTime}
                  </Badge>
                )}
                {hint.priority === "critical" && (
                  <Badge variant="destructive" className="text-xs">
                    Critical
                  </Badge>
                )}
                {hint.priority === "high" && (
                  <Badge variant="warning" className="text-xs">
                    High
                  </Badge>
                )}
              </div>
            </div>

            <p
              className={`text-sm mb-3 ${
                isCompleted ? "text-green-700" : "text-gray-700"
              }`}
            >
              {hint.message}
            </p>

            {/* Progress bar for trackable hints */}
            {hint.progressValue !== undefined && !isCompleted && (
              <div className="mb-3">
                <Progress value={hint.progressValue} className="h-1.5" />
                <p className="text-xs text-gray-500 mt-1">
                  {hint.progressValue}% complete
                </p>
              </div>
            )}

            {/* Completion criteria for beginners */}
            {hint.completionCriteria &&
              userExperienceLevel === "beginner" &&
              !isCompleted && (
                <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs font-medium text-blue-800 mb-1">
                    To complete this:
                  </p>
                  <ul className="text-xs text-blue-700 space-y-0.5">
                    {hint.completionCriteria.map((criterion, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-blue-600 rounded-full flex-shrink-0" />
                        {criterion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Action buttons */}
            {!isCompleted && hint.actionable && (
              <div className="flex items-center gap-2 flex-wrap">
                {hint.autoFixAvailable && (
                  <Button
                    size="sm"
                    onClick={onApplyAutoFix}
                    className="flex items-center gap-1"
                  >
                    <Wand2 className="w-3 h-3" />
                    Auto-fix
                  </Button>
                )}

                {hint.contextualHelp && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowContextualHelp(true)}
                    className="flex items-center gap-1"
                  >
                    <HelpCircle className="w-3 h-3" />
                    Help
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onRequestHelp}
                  className="flex items-center gap-1"
                >
                  <Info className="w-3 h-3" />
                  Learn More
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Dismiss button */}
        {hint.dismissible && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="flex-shrink-0 p-1 h-auto w-auto text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Contextual help modal */}
      <AnimatePresence>
        {showContextualHelp && hint.contextualHelp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t"
          >
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <div className="flex items-start justify-between mb-2">
                <h5 className="font-medium text-blue-900">
                  {hint.contextualHelp.title}
                </h5>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowContextualHelp(false)}
                  className="p-1 h-auto w-auto text-blue-400 hover:text-blue-600"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>

              <p className="text-sm text-blue-800 mb-3">
                {hint.contextualHelp.description}
              </p>

              {hint.contextualHelp.examples && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-blue-800 mb-1">
                    Examples:
                  </p>
                  <ul className="text-xs text-blue-700 space-y-0.5">
                    {hint.contextualHelp.examples.map((example, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <div className="w-1 h-1 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {hint.contextualHelp.learnMoreUrl && (
                <Button size="sm" variant="outline" asChild className="text-xs">
                  <a
                    href={hint.contextualHelp.learnMoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Learn More →
                  </a>
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Helper functions for styling and icons
function CategoryIcon({ category }: { category: ProgressiveHint["category"] }) {
  switch (category) {
    case "completion":
      return <Target className="w-5 h-5 text-blue-600" />;
    case "optimization":
      return <TrendingUp className="w-5 h-5 text-green-600" />;
    case "compliance":
      return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    case "quality":
      return <Star className="w-5 h-5 text-purple-600" />;
    default:
      return <Info className="w-5 h-5 text-gray-600" />;
  }
}

function getHintIcon(type: ProgressiveHint["type"]) {
  switch (type) {
    case "requirement":
      return <AlertCircle className="w-5 h-5" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5" />;
    case "suggestion":
      return <Lightbulb className="w-5 h-5" />;
    case "improvement":
      return <TrendingUp className="w-5 h-5" />;
    case "info":
      return <Info className="w-5 h-5" />;
    default:
      return <Info className="w-5 h-5" />;
  }
}

function getHintIconColor(type: ProgressiveHint["type"]) {
  switch (type) {
    case "requirement":
      return "text-red-600";
    case "warning":
      return "text-amber-600";
    case "suggestion":
      return "text-blue-600";
    case "improvement":
      return "text-green-600";
    case "info":
      return "text-gray-600";
    default:
      return "text-gray-600";
  }
}

function getHintColorClasses(
  type: ProgressiveHint["type"],
  priority: ProgressiveHint["priority"],
) {
  const base = "border transition-colors";

  if (priority === "critical") {
    return `${base} bg-red-50 border-red-200`;
  }

  switch (type) {
    case "requirement":
      return `${base} bg-red-50 border-red-200`;
    case "warning":
      return `${base} bg-amber-50 border-amber-200`;
    case "suggestion":
      return `${base} bg-blue-50 border-blue-200`;
    case "improvement":
      return `${base} bg-green-50 border-green-200`;
    case "info":
      return `${base} bg-gray-50 border-gray-200`;
    default:
      return `${base} bg-gray-50 border-gray-200`;
  }
}

// Transform validation results into progressive hints
function transformValidationToHints(
  config: ProgressiveHintsConfig,
): ProgressiveHint[] {
  const hints: ProgressiveHint[] = [];
  const { stepNumber, flowData, validationResult, userExperienceLevel } =
    config;

  // Transform errors into requirements
  validationResult.errors.forEach((error, index) => {
    hints.push({
      id: `error-${index}`,
      type: "requirement",
      priority: "high",
      category: "completion",
      title: "Required Field Missing",
      message: transformErrorMessage(error),
      actionable: true,
      autoFixAvailable: canAutoFix(error),
      fieldPath: extractFieldPath(error),
      contextualHelp: getContextualHelp(error, stepNumber),
      dismissible: false,
      progressValue: 0,
      estimatedTime: "1 min",
    });
  });

  // Transform warnings into improvements
  validationResult.warnings.forEach((warning, index) => {
    hints.push({
      id: `warning-${index}`,
      type: "warning",
      priority: "medium",
      category: "quality",
      title: "Recommended Improvement",
      message: warning,
      actionable: true,
      contextualHelp: getContextualHelp(warning, stepNumber),
      dismissible: true,
      progressValue: 50,
      estimatedTime: "2 min",
    });
  });

  // Transform suggestions into actionable improvements
  validationResult.suggestions?.forEach((suggestion, index) => {
    hints.push({
      id: `suggestion-${index}`,
      type: "suggestion",
      priority: "low",
      category: "optimization",
      title: "Smart Suggestion",
      message: suggestion,
      actionable: true,
      autoFixAvailable: true,
      contextualHelp: getContextualHelp(suggestion, stepNumber),
      dismissible: true,
      progressValue: 75,
      estimatedTime: "30 sec",
    });
  });

  // Add step-specific progressive hints
  const stepSpecificHints = getStepSpecificHints(
    stepNumber,
    flowData,
    userExperienceLevel,
  );
  hints.push(...stepSpecificHints);

  return hints;
}

// Helper functions for transformation
function transformErrorMessage(error: string): string {
  // Convert technical error messages to user-friendly ones
  return error
    .replace(/^[\w\.]+:\s*/, "") // Remove field paths
    .replace("must be at least", "should have at least")
    .replace("is required", "needs to be filled in")
    .replace("must be", "should be");
}

function canAutoFix(error: string): boolean {
  // Determine if an error can be auto-fixed
  const autoFixablePatterns = [
    /email.*required/i,
    /phone.*required/i,
    /building.*type.*required/i,
    /service.*required/i,
  ];

  return autoFixablePatterns.some((pattern) => pattern.test(error));
}

function extractFieldPath(error: string): string | undefined {
  // Extract field path from error message
  const match = error.match(/^([\w\.]+):/);
  return match ? match[1] : undefined;
}

function getContextualHelp(
  message: string,
  stepNumber: number,
): ProgressiveHint["contextualHelp"] | undefined {
  // Return contextual help based on the message and step
  const helpMap: Record<string, ProgressiveHint["contextualHelp"]> = {
    email: {
      title: "Customer Email",
      description:
        "Having a customer email helps with automated follow-ups and proposal delivery.",
      examples: ["john@company.com", "facility-manager@building.org"],
    },
    phone: {
      title: "Customer Phone",
      description:
        "Phone numbers enable quick communication and SMS notifications.",
      examples: ["(555) 123-4567", "+1-555-123-4567"],
    },
    services: {
      title: "Service Selection",
      description: "Select at least one service to proceed with the estimate.",
      examples: ["Window Cleaning", "Pressure Washing", "Soft Washing"],
    },
  };

  for (const [key, help] of Object.entries(helpMap)) {
    if (message.toLowerCase().includes(key)) {
      return help;
    }
  }

  return undefined;
}

function getStepSpecificHints(
  stepNumber: number,
  flowData: any,
  userExperienceLevel: "beginner" | "intermediate" | "advanced",
): ProgressiveHint[] {
  const hints: ProgressiveHint[] = [];

  // Add step-specific hints based on step number and data
  switch (stepNumber) {
    case 1: // Initial Contact
      if (!flowData.initialContact?.extractedData?.customer?.name) {
        hints.push({
          id: "customer-name-hint",
          type: "info",
          priority: "medium",
          category: "completion",
          title: "Customer Name Needed",
          message:
            "Adding a customer name helps personalize the estimate and makes it easier to track.",
          actionable: true,
          dismissible: true,
          progressValue: 25,
          estimatedTime: "30 sec",
          completionCriteria:
            userExperienceLevel === "beginner"
              ? [
                  "Click on the customer name field",
                  "Enter the customer's full name",
                  "The name will be used throughout the estimate",
                ]
              : undefined,
        });
      }
      break;

    case 2: // Scope Details
      if (!flowData.scopeDetails?.selectedServices?.length) {
        hints.push({
          id: "services-selection-hint",
          type: "requirement",
          priority: "high",
          category: "completion",
          title: "Select Services",
          message:
            "Choose the services you'll be providing to generate accurate pricing.",
          actionable: true,
          dismissible: false,
          progressValue: 0,
          estimatedTime: "1 min",
        });
      }
      break;

    // Add more step-specific hints...
  }

  return hints;
}
