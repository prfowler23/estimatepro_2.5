"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";
import { FacadeAnalysis } from "@/lib/types/facade-analysis-types";

interface MeasurementValidationProps {
  analysis: Partial<FacadeAnalysis>;
}

export function MeasurementValidation({
  analysis,
}: MeasurementValidationProps) {
  // Validation rules
  const validations = [
    {
      name: "Glass to Facade Ratio",
      value: analysis.glass_to_facade_ratio || 0,
      min: 10,
      max: 90,
      unit: "%",
      status:
        (analysis.glass_to_facade_ratio || 0) >= 10 &&
        (analysis.glass_to_facade_ratio || 0) <= 90
          ? "valid"
          : "warning",
      message:
        "Glass area should typically be between 10% and 90% of total facade",
    },
    {
      name: "Building Height",
      value: analysis.building_height_feet || 0,
      min: analysis.building_height_stories
        ? analysis.building_height_stories * 10
        : 10,
      max: analysis.building_height_stories
        ? analysis.building_height_stories * 16
        : 200,
      unit: "ft",
      status:
        analysis.building_height_feet &&
        analysis.building_height_stories &&
        analysis.building_height_feet >=
          analysis.building_height_stories * 10 &&
        analysis.building_height_feet <= analysis.building_height_stories * 16
          ? "valid"
          : "warning",
      message: `Height should be ${10}-${16} ft per story`,
    },
    {
      name: "Net Facade Area",
      value: analysis.net_facade_sqft || 0,
      min: 0,
      max: analysis.total_facade_sqft || 999999,
      unit: "sq ft",
      status:
        (analysis.net_facade_sqft || 0) <= (analysis.total_facade_sqft || 0)
          ? "valid"
          : "error",
      message: "Net facade should not exceed total facade area",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "valid":
        return "text-green-600 bg-green-50";
      case "warning":
        return "text-yellow-600 bg-yellow-50";
      case "error":
        return "text-red-600 bg-red-50";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Measurement Validation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {validations.map((validation, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(validation.status)}
                <span className="font-medium">{validation.name}</span>
              </div>
              <span className="font-mono">
                {validation.value.toLocaleString()} {validation.unit}
              </span>
            </div>
            {validation.status !== "valid" && (
              <Alert className={getStatusColor(validation.status)}>
                <AlertDescription className="text-sm">
                  {validation.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        ))}

        {analysis.requires_field_verification && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Field Verification Required:</strong> Some measurements
              have low confidence and should be verified on-site.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
