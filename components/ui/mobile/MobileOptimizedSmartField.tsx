"use client";

import React, { useState, useEffect } from "react";
import { SmartField } from "@/components/ai/SmartField";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { SmartDefault } from "@/lib/ai/smart-defaults-engine";
import { useSmartDefaults } from "@/components/ai/SmartDefaultsProvider";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { Sparkles, CheckCircle, X, ChevronDown, Info } from "lucide-react";

interface MobileOptimizedSmartFieldProps {
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

export function MobileOptimizedSmartField(
  props: MobileOptimizedSmartFieldProps,
) {
  const { state } = useSmartDefaults();
  const [showMobileDefaults, setShowMobileDefaults] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Find relevant smart defaults for this field
  const relevantDefaults = state.defaults.filter(
    (d) => d.field === props.field || d.field.endsWith(`.${props.field}`),
  );

  const hasSuggestions = relevantDefaults.length > 0;

  const handleApplyDefault = (defaultItem: SmartDefault) => {
    props.onChange(defaultItem.value);
    setIsSheetOpen(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-50 border-green-200";
    if (confidence >= 0.6)
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  return (
    <div className="w-full space-y-2">
      {/* Label with mobile-optimized layout */}
      {props.label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            {props.label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {/* Mobile AI suggestions trigger */}
          {hasSuggestions && props.enableSmartDefaults && (
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {relevantDefaults.length}
                  </Badge>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    AI Suggestions for {props.label}
                  </SheetTitle>
                  <SheetDescription>
                    Smart defaults based on your project context and industry
                    best practices.
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-3 overflow-y-auto max-h-[50vh]">
                  {relevantDefaults.map((defaultItem, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${getConfidenceColor(defaultItem.confidence)}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(defaultItem.confidence * 100)}%
                              confident
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {defaultItem.source}
                            </Badge>
                          </div>
                          <p className="font-medium text-sm mb-1">
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
                          onClick={() => handleApplyDefault(defaultItem)}
                          className="flex-1 text-xs"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Apply This
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      )}

      {/* Description */}
      {props.description && (
        <div className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{props.description}</span>
        </div>
      )}

      {/* Mobile-optimized SmartField */}
      <div className="relative">
        <SmartField
          {...props}
          enableSmartDefaults={false} // Disable inline defaults for mobile
          className="w-full"
        />

        {/* Mobile suggestion indicator */}
        {hasSuggestions && props.enableSmartDefaults && !props.value && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSheetOpen(true)}
              className="h-6 w-6 p-0 rounded-full bg-blue-100 hover:bg-blue-200"
            >
              <Sparkles className="w-3 h-3 text-blue-600" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileOptimizedSmartField;
