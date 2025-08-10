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
import { ServiceTypeCode, DynamicFormLoaderProps } from "./types";

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
      case ServiceTypeCode.GLASS_RESTORATION:
        return <LazyGlassRestorationForm {...commonProps} />;
      case ServiceTypeCode.WINDOW_CLEANING:
        return <LazyWindowCleaningForm {...commonProps} />;
      case ServiceTypeCode.PRESSURE_WASHING:
        return <LazyPressureWashingForm {...commonProps} />;
      case ServiceTypeCode.PRESSURE_WASH_SEAL:
        return <LazyPressureWashSealForm {...commonProps} />;
      case ServiceTypeCode.FINAL_CLEAN:
        return <LazyFinalCleanForm {...commonProps} />;
      case ServiceTypeCode.FRAME_RESTORATION:
        return <LazyFrameRestorationForm {...commonProps} />;
      case ServiceTypeCode.HIGH_DUSTING:
        return <LazyHighDustingForm {...commonProps} />;
      case ServiceTypeCode.SOFT_WASHING:
        return <LazySoftWashingForm {...commonProps} />;
      case ServiceTypeCode.PARKING_DECK:
        return <LazyParkingDeckForm {...commonProps} />;
      case ServiceTypeCode.GRANITE_RECONDITIONING:
        return <LazyGraniteReconditioningForm {...commonProps} />;
      case ServiceTypeCode.BIOFILM_REMOVAL:
        return <LazyBiofilmRemovalForm {...commonProps} />;
      case ServiceTypeCode.FACADE_ANALYSIS:
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

export default DynamicFormLoader;
