"use client";

import React, { useState, useEffect, memo, useCallback } from "react";
import { PredictiveInput } from "./PredictiveInput";
import { useSmartDefaults } from "./SmartDefaultsProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SmartDefault } from "@/lib/ai/smart-defaults-engine";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { Sparkles, CheckCircle, X } from "lucide-react";
import { deepEqual } from "@/lib/utils/deep-compare";

type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "number"
  | "email"
  | "phone"
  | "date";

type FieldValue<T extends FieldType> = T extends "number"
  ? number
  : T extends "select"
    ? string
    : T extends "date"
      ? string
      : string;

interface SmartFieldProps<T extends FieldType = "text"> {
  field: string;
  value: FieldValue<T> | undefined;
  onChange: (value: FieldValue<T>) => void;
  type?: T;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  flowData: GuidedFlowData;
  currentStep: number;
  enablePredictions?: boolean;
  enableSmartDefaults?: boolean;
  label?: string;
  description?: string;
}

function SmartFieldComponent<T extends FieldType = "text">({
  field,
  value,
  onChange,
  type = "text",
  placeholder,
  options = [],
  className = "",
  disabled = false,
  required = false,
  flowData,
  currentStep,
  enablePredictions = true,
  enableSmartDefaults = true,
  label,
  description,
}: SmartFieldProps<T>) {
  const { state } = useSmartDefaults();
  const [showSmartDefault, setShowSmartDefault] = useState(false);
  const [appliedDefault, setAppliedDefault] = useState<SmartDefault | null>(
    null,
  );

  // Find relevant smart default for this field
  const relevantDefault = state.defaults.find(
    (d) => d.field === field || d.field.endsWith(`.${field}`),
  );

  useEffect(() => {
    if (relevantDefault && enableSmartDefaults && !value && !appliedDefault) {
      setShowSmartDefault(true);
    } else {
      setShowSmartDefault(false);
    }
  }, [relevantDefault, value, appliedDefault, enableSmartDefaults]);

  const handleApplyDefault = useCallback(() => {
    if (relevantDefault) {
      onChange(relevantDefault.value as FieldValue<T>);
      setAppliedDefault(relevantDefault);
      setShowSmartDefault(false);
    }
  }, [relevantDefault, onChange]);

  const handleDismissDefault = useCallback(() => {
    setShowSmartDefault(false);
  }, []);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "border-green-200 bg-green-50";
    if (confidence >= 0.6) return "border-yellow-200 bg-yellow-50";
    return "border-blue-200 bg-blue-50";
  };

  const renderInput = () => {
    const inputId = `smart-field-${field}`;
    const commonProps = {
      id: inputId,
      value: value || "",
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        try {
          onChange(e.target.value as FieldValue<T>);
        } catch (error) {
          console.warn("SmartField onChange error:", error);
          // Silently ignore onChange errors to prevent crashes
        }
      },
      placeholder,
      disabled,
      required,
      className: showSmartDefault ? "border-blue-300" : "",
      "aria-required": required,
      "aria-invalid": false, // Could be enhanced with validation state
      "aria-describedby": description ? `${inputId}-description` : undefined,
    };

    switch (type) {
      case "textarea":
        return (
          <Textarea
            {...commonProps}
            onChange={(e) => onChange(e.target.value as FieldValue<T>)}
            rows={3}
          />
        );

      case "select":
        // Ensure options is always an array and has valid entries
        const safeOptions = Array.isArray(options)
          ? options.filter(
              (option) =>
                option &&
                typeof option.value === "string" &&
                typeof option.label === "string",
            )
          : [];

        // Return a fallback if no valid options
        if (safeOptions.length === 0) {
          return (
            <Input
              {...commonProps}
              placeholder={placeholder || "No options available"}
              disabled={true}
              className="bg-gray-50"
            />
          );
        }

        return (
          <Select
            value={value || ""}
            onValueChange={(newValue) => {
              try {
                onChange(newValue as FieldValue<T>);
              } catch (error) {
                console.warn("SmartField Select onChange error:", error);
                // Silently ignore onChange errors to prevent crashes
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger
              className={showSmartDefault ? "border-blue-300" : ""}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {safeOptions.map((option, index) => {
                // Additional safety check for individual options
                const safeValue = String(option.value || `option-${index}`);
                const safeLabel = String(
                  option.label || option.value || `Option ${index + 1}`,
                );

                return (
                  <SelectItem
                    key={`${field}-option-${safeValue}-${index}`}
                    value={safeValue}
                  >
                    {safeLabel}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        );

      case "text":
      case "email":
      case "phone":
      case "date":
      case "number":
        if (enablePredictions && (type === "text" || type === "email")) {
          return (
            <PredictiveInput
              field={field}
              value={value || ""}
              onChange={(value: string) => onChange(value as FieldValue<T>)}
              placeholder={placeholder}
              className={showSmartDefault ? "border-blue-300" : ""}
              flowData={flowData}
              currentStep={currentStep}
              disabled={disabled}
              type={type}
            />
          );
        } else {
          return (
            <Input
              {...commonProps}
              type={type}
              onChange={(e) =>
                onChange(
                  (type === "number"
                    ? Number(e.target.value)
                    : e.target.value) as FieldValue<T>,
                )
              }
            />
          );
        }

      default:
        return (
          <Input
            {...commonProps}
            onChange={(e) => onChange(e.target.value as FieldValue<T>)}
          />
        );
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {label && (
        <div className="flex items-center gap-2">
          <label
            htmlFor={`smart-field-${field}`}
            className="text-sm font-medium text-gray-700"
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
          {appliedDefault && (
            <Badge variant="secondary" className="text-xs" aria-live="polite">
              <Sparkles className="w-3 h-3 mr-1" aria-hidden="true" />
              AI Applied
            </Badge>
          )}
        </div>
      )}

      {/* Description */}
      {description && (
        <p
          id={`smart-field-${field}-description`}
          className="text-xs text-gray-500"
        >
          {description}
        </p>
      )}

      {/* Smart Default Banner */}
      {showSmartDefault && relevantDefault && (
        <div
          className={`p-3 rounded-lg border ${getConfidenceColor(relevantDefault.confidence)}`}
          role="region"
          aria-label="AI suggestion"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles
                  className="w-4 h-4 text-blue-500"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">
                  Smart Default Available
                </span>
                <Badge variant="secondary" className="text-xs">
                  <span className="sr-only">Confidence level:</span>
                  {Math.round(relevantDefault.confidence * 100)}% confident
                </Badge>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                <strong>Suggested:</strong> {String(relevantDefault.value)}
              </p>
              <p
                className="text-xs text-gray-600"
                id={`${field}-suggestion-reason`}
              >
                {relevantDefault.reasoning}
              </p>
            </div>
            <div
              className="flex items-center gap-1 ml-2"
              role="group"
              aria-label="Suggestion actions"
            >
              <Button
                size="sm"
                onClick={handleApplyDefault}
                className="text-xs"
                aria-label="Apply AI suggestion"
                aria-describedby={`${field}-suggestion-reason`}
              >
                <CheckCircle className="w-3 h-3 mr-1" aria-hidden="true" />
                Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismissDefault}
                className="text-xs"
                aria-label="Dismiss AI suggestion"
              >
                <X className="w-3 h-3" aria-hidden="true" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input Field */}
      {renderInput()}

      {/* Applied Default Confirmation */}
      {appliedDefault && (
        <div className="flex items-center gap-2 text-xs text-green-600">
          <CheckCircle className="w-3 h-3" />
          <span>Applied AI suggestion: {appliedDefault.reasoning}</span>
        </div>
      )}
    </div>
  );
}

// Deep comparison helper for flowData
function areFlowDataEqual(prev: GuidedFlowData, next: GuidedFlowData): boolean {
  return deepEqual(prev, next);
}

// Optimized memo to prevent expensive AI predictions and validation re-runs
export const SmartField = memo(
  SmartFieldComponent,
  (prevProps: SmartFieldProps<any>, nextProps: SmartFieldProps<any>) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.field === nextProps.field &&
      areFlowDataEqual(prevProps.flowData, nextProps.flowData) &&
      prevProps.currentStep === nextProps.currentStep &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.type === nextProps.type &&
      prevProps.placeholder === nextProps.placeholder &&
      prevProps.required === nextProps.required &&
      prevProps.enablePredictions === nextProps.enablePredictions &&
      prevProps.enableSmartDefaults === nextProps.enableSmartDefaults
      // Removed onChange comparison since it's unstable
    );
  },
);

export default SmartField;
