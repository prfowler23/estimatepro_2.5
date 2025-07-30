"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { error as logError } from "@/lib/utils/logger";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  SmartDefaultsEngine,
  PredictiveInput as PredictiveInputType,
} from "@/lib/ai/smart-defaults-engine";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { Loader2, Sparkles } from "lucide-react";
import { useDeepCompareMemo } from "@/lib/utils/deep-compare";

interface PredictiveInputProps {
  field: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  flowData: GuidedFlowData;
  currentStep: number;
  disabled?: boolean;
  type?: string;
}

export function PredictiveInput({
  field,
  value,
  onChange,
  placeholder,
  className = "",
  flowData,
  currentStep,
  disabled = false,
  type = "text",
}: PredictiveInputProps) {
  const [predictions, setPredictions] = useState<PredictiveInputType>({
    field,
    predictions: [],
    isLoading: false,
  });
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize flowData to prevent unnecessary API calls
  const stableFlowData = useDeepCompareMemo(() => {
    return flowData;
  }, [flowData]);

  // Debounced prediction loading with request cancellation
  useEffect(() => {
    if (value.length < 2) {
      setPredictions((prev) => ({
        ...prev,
        predictions: [],
        isLoading: false,
      }));
      setShowPredictions(false);
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const timeoutId = setTimeout(async () => {
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      setPredictions((prev) => ({ ...prev, isLoading: true }));

      try {
        const context = {
          flowData: stableFlowData,
          currentStep,
          userProfile: {
            experienceLevel: "intermediate" as const,
            role: "estimator",
            preferences: {},
          },
        };

        const predictiveInput =
          await SmartDefaultsEngine.generatePredictiveInputs(
            field,
            value,
            context,
          );

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        setPredictions(predictiveInput);
        setShowPredictions(predictiveInput.predictions.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        // Don't log errors for aborted requests
        if ((error as Error).name !== "AbortError") {
          logError("Failed to load predictions", {
            error,
            field,
            component: "PredictiveInput",
            action: "load_predictions",
          });
        }

        setPredictions((prev) => ({
          ...prev,
          isLoading: false,
          predictions: [],
        }));
        setShowPredictions(false);
      }
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [value, field, stableFlowData, currentStep]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showPredictions || predictions.predictions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < predictions.predictions.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectPrediction(predictions.predictions[selectedIndex].value);
        }
        break;
      case "Escape":
        setShowPredictions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelectPrediction = (predictionValue: string) => {
    onChange(predictionValue);
    setShowPredictions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleInputFocus = () => {
    if (predictions.predictions.length > 0) {
      setShowPredictions(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay hiding to allow for prediction selection
    setTimeout(() => {
      if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
        setShowPredictions(false);
        setSelectedIndex(-1);
      }
    }, 150);
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.7) return "text-green-600 bg-green-50";
    if (probability >= 0.4) return "text-yellow-600 bg-yellow-50";
    return "text-gray-600 bg-gray-50";
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type={type}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={predictions.predictions.length > 0 ? "pr-8" : ""}
          role="combobox"
          aria-expanded={showPredictions}
          aria-controls={`${field}-predictions`}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={
            selectedIndex >= 0
              ? `${field}-prediction-${selectedIndex}`
              : undefined
          }
        />

        {predictions.predictions.length > 0 && (
          <div
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
            aria-hidden="true"
          >
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
        )}

        {predictions.isLoading && (
          <div
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
            aria-hidden="true"
          >
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            <span className="sr-only">Loading predictions</span>
          </div>
        )}
      </div>

      {/* Predictions Dropdown */}
      {showPredictions && predictions.predictions.length > 0 && (
        <div
          ref={dropdownRef}
          id={`${field}-predictions`}
          role="listbox"
          aria-label="AI predictions"
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          <div className="py-1">
            {predictions.predictions.map((prediction, index) => (
              <button
                key={`prediction-${field}-${prediction.value}-${index}`}
                id={`${field}-prediction-${index}`}
                type="button"
                onClick={() => handleSelectPrediction(prediction.value)}
                onMouseDown={(e) => e.preventDefault()} // Prevent focus issues
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors ${
                  index === selectedIndex ? "bg-blue-50" : ""
                }`}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {prediction.value}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getProbabilityColor(prediction.probability)}`}
                  >
                    {Math.round(prediction.probability * 100)}%
                  </span>
                </div>
                {prediction.description && (
                  <p className="text-xs text-gray-500 mt-1">
                    {prediction.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PredictiveInput;
