"use client";

import React, { Suspense } from "react";
import { CalculatorLoading } from "@/components/ui/loading/lazy-loading";
import {
  LazyGlassRestorationForm,
  LazyWindowCleaningForm,
  LazyPressureWashingForm,
  LazyPressureWashSealForm,
  LazyFinalCleanForm,
  LazyFrameRestorationForm,
  LazyHighDustingForm,
  LazySoftWashingForm,
  LazyParkingDeckForm,
  LazyGraniteReconditioningForm,
  LazyBiofilmRemovalForm,
  LazyFacadeAnalysisForm,
} from "./lazy-forms";

interface DynamicFormLoaderProps {
  serviceType: string | null;
  onSubmit: (result: any) => void;
  onCancel: () => void;
  estimateId: string;
}

export function DynamicFormLoader({
  serviceType,
  onSubmit,
  onCancel,
  estimateId,
}: DynamicFormLoaderProps) {
  if (!serviceType) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No service selected
      </div>
    );
  }

  const renderForm = () => {
    const commonProps = {
      onSubmit,
      onCancel,
      estimateId,
    };

    switch (serviceType) {
      case "GR":
        return <LazyGlassRestorationForm {...commonProps} />;
      case "WC":
        return <LazyWindowCleaningForm {...commonProps} />;
      case "PW":
        return <LazyPressureWashingForm {...commonProps} />;
      case "PWS":
        return <LazyPressureWashSealForm {...commonProps} />;
      case "FC":
        return <LazyFinalCleanForm {...commonProps} />;
      case "FR":
        return <LazyFrameRestorationForm {...commonProps} />;
      case "HD":
        return <LazyHighDustingForm {...commonProps} />;
      case "SW":
        return <LazySoftWashingForm {...commonProps} />;
      case "PD":
        return <LazyParkingDeckForm {...commonProps} />;
      case "GRC":
        return <LazyGraniteReconditioningForm {...commonProps} />;
      case "BF":
        return <LazyBiofilmRemovalForm {...commonProps} />;
      case "FACADE_ANALYSIS":
        return <LazyFacadeAnalysisForm {...commonProps} />;
      default:
        return (
          <div className="p-4 text-center text-muted-foreground">
            Unknown service type: {serviceType}
          </div>
        );
    }
  };

  return (
    <div className="min-h-[400px]">
      <Suspense fallback={<CalculatorLoading />}>{renderForm()}</Suspense>
    </div>
  );
}
