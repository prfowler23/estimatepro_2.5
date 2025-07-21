"use client";

import React, { useState, useEffect } from "react";
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

interface SmartFieldProps {
  field: string;
  value: any;
  onChange: (value: any) => void;
  type?: "text" | "textarea" | "select" | "number" | "email" | "phone" | "date";
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

export function SmartField({
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
}: SmartFieldProps) {
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

  const handleApplyDefault = () => {
    if (relevantDefault) {
      onChange(relevantDefault.value);
      setAppliedDefault(relevantDefault);
      setShowSmartDefault(false);
    }
  };

  const handleDismissDefault = () => {
    setShowSmartDefault(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "border-green-200 bg-green-50";
    if (confidence >= 0.6) return "border-yellow-200 bg-yellow-50";
    return "border-blue-200 bg-blue-50";
  };

  const renderInput = () => {
    const commonProps = {
      value: value || "",
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => onChange(e.target.value),
      placeholder,
      disabled,
      required,
      className: showSmartDefault ? "border-blue-300" : "",
    };

    switch (type) {
      case "textarea":
        return (
          <Textarea
            {...commonProps}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
          />
        );

      case "select":
        return (
          <Select
            value={value || ""}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger
              className={showSmartDefault ? "border-blue-300" : ""}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
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
              onChange={onChange}
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
                  type === "number" ? Number(e.target.value) : e.target.value,
                )
              }
            />
          );
        }

      default:
        return (
          <Input {...commonProps} onChange={(e) => onChange(e.target.value)} />
        );
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {label && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {appliedDefault && (
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Applied
            </Badge>
          )}
        </div>
      )}

      {/* Description */}
      {description && <p className="text-xs text-gray-500">{description}</p>}

      {/* Smart Default Banner */}
      {showSmartDefault && relevantDefault && (
        <div
          className={`p-3 rounded-lg border ${getConfidenceColor(relevantDefault.confidence)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">
                  Smart Default Available
                </span>
                <Badge variant="secondary" className="text-xs">
                  {Math.round(relevantDefault.confidence * 100)}% confident
                </Badge>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                <strong>Suggested:</strong> {String(relevantDefault.value)}
              </p>
              <p className="text-xs text-gray-600">
                {relevantDefault.reasoning}
              </p>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Button
                size="sm"
                onClick={handleApplyDefault}
                className="text-xs"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismissDefault}
                className="text-xs"
              >
                <X className="w-3 h-3" />
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

export default SmartField;
