// UX Task 1: Progressive Validation Component
// Integrates Progressive Hints System into Guided Flow

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Settings, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ProgressiveHintsSystem,
  ProgressiveHintsConfig,
  ProgressiveHint,
} from "@/components/validation/ProgressiveHintsSystem";
import { ValidationResult } from "@/lib/validation/guided-flow-validation";
import { GuidedFlowData } from "@/lib/types/estimate-types";

interface ProgressiveValidationProps {
  stepNumber: number;
  flowData: GuidedFlowData;
  validationResult: ValidationResult;
  userExperienceLevel?: "beginner" | "intermediate" | "advanced";
  onApplyAutoFix?: (fieldPath: string, suggestedValue: any) => void;
  onRequestHelp?: (hint: ProgressiveHint) => void;
  className?: string;
}

export function ProgressiveValidation({
  stepNumber,
  flowData,
  validationResult,
  userExperienceLevel = "intermediate",
  onApplyAutoFix,
  onRequestHelp,
  className = "",
}: ProgressiveValidationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [maxHintsShown, setMaxHintsShown] = useState(5);
  const [enableAutoFix, setEnableAutoFix] = useState(true);
  const [dismissedHints, setDismissedHints] = useState<string[]>([]);

  // Progressive hints configuration
  const hintsConfig: ProgressiveHintsConfig = {
    stepNumber,
    flowData,
    validationResult,
    userExperienceLevel,
    showCompletedTasks,
    enableAutoFix,
    maxHintsShown,
  };

  const handleApplyAutoFix = useCallback(
    (fieldPath: string, suggestedValue: any) => {
      onApplyAutoFix?.(fieldPath, suggestedValue);
    },
    [onApplyAutoFix],
  );

  const handleRequestHelp = useCallback(
    (hint: ProgressiveHint) => {
      onRequestHelp?.(hint);
    },
    [onRequestHelp],
  );

  const handleHintDismiss = useCallback((hintId: string) => {
    setDismissedHints((prev) => [...prev, hintId]);
  }, []);

  // Don't render if no validation issues and all requirements met
  const hasContent =
    validationResult.errors.length > 0 ||
    validationResult.warnings.length > 0 ||
    (validationResult.suggestions && validationResult.suggestions.length > 0) ||
    !validationResult.isValid;

  if (!hasContent && validationResult.isValid) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">Smart Guidance</h3>
            </div>

            {/* Quality Score */}
            {validationResult.qualityScore && (
              <Badge
                variant={
                  validationResult.qualityScore >= 85
                    ? "default"
                    : validationResult.qualityScore >= 70
                      ? "secondary"
                      : "destructive"
                }
              >
                Quality: {Math.round(validationResult.qualityScore)}%
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Settings */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Switch
                  checked={showCompletedTasks}
                  onCheckedChange={setShowCompletedTasks}
                />
                <label className="text-gray-600">Show completed</label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={enableAutoFix}
                  onCheckedChange={setEnableAutoFix}
                />
                <label className="text-gray-600">Auto-fix</label>
              </div>
            </div>

            {/* Visibility Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(!isVisible)}
              className="flex items-center gap-2"
            >
              {isVisible ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Show
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Experience Level Badge */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Guidance level:</span>
            <Badge variant="outline" className="capitalize">
              {userExperienceLevel}
            </Badge>
          </div>

          {/* Summary Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {validationResult.errors.length > 0 && (
              <span className="text-red-600">
                {validationResult.errors.length} required
              </span>
            )}
            {validationResult.warnings.length > 0 && (
              <span className="text-amber-600">
                {validationResult.warnings.length} recommendations
              </span>
            )}
            {validationResult.suggestions &&
              validationResult.suggestions.length > 0 && (
                <span className="text-blue-600">
                  {validationResult.suggestions.length} suggestions
                </span>
              )}
          </div>
        </div>
      </Card>

      {/* Progressive Hints System */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <ProgressiveHintsSystem
              config={hintsConfig}
              onApplyAutoFix={handleApplyAutoFix}
              onRequestHelp={handleRequestHelp}
              onHintDismiss={handleHintDismiss}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legacy Validation Fallback (Hidden by default, shown only if progressive system fails) */}
      {process.env.NODE_ENV === "development" && (
        <LegacyValidationFallback
          validationResult={validationResult}
          isVisible={false}
        />
      )}
    </div>
  );
}

// Legacy validation display (for fallback in development)
interface LegacyValidationFallbackProps {
  validationResult: ValidationResult;
  isVisible: boolean;
}

function LegacyValidationFallback({
  validationResult,
  isVisible,
}: LegacyValidationFallbackProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
    >
      <h4 className="font-medium text-gray-900 mb-2">
        Legacy Validation (Dev Only)
      </h4>

      {validationResult.errors.length > 0 && (
        <div className="mb-3">
          <h5 className="text-sm font-medium text-red-900 mb-1">Errors:</h5>
          <ul className="text-sm text-red-700 space-y-1">
            {validationResult.errors.map((error, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-red-500">•</span>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validationResult.warnings.length > 0 && (
        <div className="mb-3">
          <h5 className="text-sm font-medium text-amber-900 mb-1">Warnings:</h5>
          <ul className="text-sm text-amber-700 space-y-1">
            {validationResult.warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-amber-500">•</span>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validationResult.suggestions &&
        validationResult.suggestions.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-blue-900 mb-1">
              Suggestions:
            </h5>
            <ul className="text-sm text-blue-700 space-y-1">
              {validationResult.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-blue-500">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
    </motion.div>
  );
}

export default ProgressiveValidation;
