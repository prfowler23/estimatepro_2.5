"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartDefaultsProvider } from "./SmartDefaultsProvider";
import { SmartDefaultsPanel } from "./SmartDefaultsPanel";
import { SmartField } from "./SmartField";
import { PredictiveInput } from "./PredictiveInput";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { Sparkles, Lightbulb, Brain, Zap } from "lucide-react";

export function SmartDefaultsDemo() {
  const [demoData, setDemoData] = useState<GuidedFlowData>({
    initialContact: {
      contactMethod: "email",
      initialNotes:
        "Hi, we need window cleaning for our 3-story office building at 123 Main St. Please provide a quote.",
      aiExtractedData: undefined,
    },
  });

  const handleUpdateData = (field: string, value: unknown) => {
    const fieldParts = field.split(".");
    const updatedData = { ...demoData };

    if (fieldParts.length === 2) {
      if (!updatedData[fieldParts[0] as keyof GuidedFlowData]) {
        (updatedData as any)[fieldParts[0]] = {};
      }
      (updatedData as any)[fieldParts[0]][fieldParts[1]] = value;
    } else {
      (updatedData as any)[field] = value;
    }

    setDemoData(updatedData);
  };

  const handleApplyDefault = (field: string, value: unknown) => {
    handleUpdateData(field, value);
  };

  const handleApplySuggestion = (suggestion: {
    targetField?: string;
    suggestedValue?: unknown;
  }) => {
    if (suggestion.targetField && suggestion.suggestedValue !== undefined) {
      handleApplyDefault(suggestion.targetField, suggestion.suggestedValue);
    }
  };

  return (
    <SmartDefaultsProvider
      flowData={demoData}
      currentStep={1}
      userProfile={{
        experienceLevel: "intermediate",
        role: "estimator",
        preferences: {},
      }}
      onApplyDefault={handleApplyDefault}
      onApplySuggestion={handleApplySuggestion}
    >
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
            <Sparkles className="w-8 h-8 text-blue-500" />
            AI-Powered Smart Defaults Demo
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Experience intelligent field pre-population, predictive input
            suggestions, and context-aware recommendations powered by AI.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Demo Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Feature Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-semibold text-sm">Smart Defaults</h3>
                <p className="text-xs text-gray-600">
                  AI-generated field values
                </p>
              </Card>

              <Card className="p-4 text-center">
                <Brain className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <h3 className="font-semibold text-sm">Predictions</h3>
                <p className="text-xs text-gray-600">
                  Autocomplete suggestions
                </p>
              </Card>

              <Card className="p-4 text-center">
                <Lightbulb className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                <h3 className="font-semibold text-sm">Suggestions</h3>
                <p className="text-xs text-gray-600">
                  Context-aware recommendations
                </p>
              </Card>

              <Card className="p-4 text-center">
                <Zap className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <h3 className="font-semibold text-sm">Auto-Apply</h3>
                <p className="text-xs text-gray-600">
                  One-click field population
                </p>
              </Card>
            </div>

            {/* Customer Information Demo */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                Customer Information Demo
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Try typing in the fields below to see predictive suggestions and
                smart defaults in action.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <SmartField
                    field="customer.name"
                    value={
                      demoData.initialContact?.aiExtractedData?.customer
                        ?.name || ""
                    }
                    onChange={(value) =>
                      handleUpdateData("customer.name", value)
                    }
                    label="Customer Name"
                    placeholder="Start typing customer name..."
                    enablePredictions
                    enableSmartDefaults
                    flowData={demoData}
                    currentStep={1}
                    description="AI will suggest completions as you type"
                  />

                  <SmartField
                    field="customer.company"
                    value={
                      demoData.initialContact?.aiExtractedData?.customer
                        ?.company || ""
                    }
                    onChange={(value) =>
                      handleUpdateData("customer.company", value)
                    }
                    label="Company Name"
                    placeholder="Enter company name..."
                    enablePredictions
                    enableSmartDefaults
                    flowData={demoData}
                    currentStep={1}
                    description="Smart defaults based on industry patterns"
                  />

                  <SmartField
                    field="customer.email"
                    value={
                      demoData.initialContact?.aiExtractedData?.customer
                        ?.email || ""
                    }
                    onChange={(value) =>
                      handleUpdateData("customer.email", value)
                    }
                    type="email"
                    label="Email Address"
                    placeholder="customer@company.com"
                    enablePredictions
                    flowData={demoData}
                    currentStep={1}
                    description="Email format validation and suggestions"
                  />
                </div>

                <div className="space-y-4">
                  <SmartField
                    field="requirements.buildingType"
                    value={
                      demoData.initialContact?.aiExtractedData?.requirements
                        ?.buildingType || ""
                    }
                    onChange={(value) =>
                      handleUpdateData("requirements.buildingType", value)
                    }
                    type="select"
                    label="Building Type"
                    options={[
                      { value: "office", label: "Office Building" },
                      { value: "retail", label: "Retail Store" },
                      { value: "restaurant", label: "Restaurant" },
                      { value: "hospital", label: "Hospital/Medical" },
                      { value: "school", label: "School/Educational" },
                    ]}
                    enableSmartDefaults
                    flowData={demoData}
                    currentStep={1}
                    description="AI-suggested building type based on context"
                  />

                  <SmartField
                    field="requirements.buildingSize"
                    value={
                      demoData.initialContact?.aiExtractedData?.requirements
                        ?.buildingSize || ""
                    }
                    onChange={(value) =>
                      handleUpdateData("requirements.buildingSize", value)
                    }
                    label="Building Size"
                    placeholder="e.g., 50,000 sq ft"
                    enableSmartDefaults
                    flowData={demoData}
                    currentStep={1}
                    description="Smart estimates based on building type"
                  />

                  <SmartField
                    field="requirements.floors"
                    value={
                      demoData.initialContact?.aiExtractedData?.requirements
                        ?.floors || ""
                    }
                    onChange={(value) =>
                      handleUpdateData("requirements.floors", Number(value))
                    }
                    type="number"
                    label="Number of Floors"
                    placeholder="1"
                    enableSmartDefaults
                    flowData={demoData}
                    currentStep={1}
                    description="Typical floor counts for building types"
                  />
                </div>
              </div>
            </Card>

            {/* Predictive Input Demo */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                Predictive Input Demo
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                This input field shows advanced predictive suggestions with
                confidence scores.
              </p>

              <PredictiveInput
                field="customer.name"
                value={
                  demoData.initialContact?.aiExtractedData?.customer?.name || ""
                }
                onChange={(value) => handleUpdateData("customer.name", value)}
                placeholder="Type to see AI predictions..."
                flowData={demoData}
                currentStep={1}
                className="max-w-md"
              />
            </Card>

            {/* Current Data Display */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Current Form Data</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-700 overflow-auto">
                  {JSON.stringify(demoData, null, 2)}
                </pre>
              </div>
            </Card>
          </div>

          {/* Smart Defaults Panel */}
          <div className="space-y-6">
            <SmartDefaultsPanel />

            {/* Instructions */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">How to Use</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="text-xs">
                    1
                  </Badge>
                  <span>
                    Fill in form fields to see smart suggestions appear
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="text-xs">
                    2
                  </Badge>
                  <span>
                    Click &quot;Apply&quot; on defaults to auto-populate fields
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="text-xs">
                    3
                  </Badge>
                  <span>Type in predictive fields to see autocomplete</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="text-xs">
                    4
                  </Badge>
                  <span>Review suggestions for optimization tips</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </SmartDefaultsProvider>
  );
}

export default SmartDefaultsDemo;
