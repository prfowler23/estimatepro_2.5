import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { InitialContact } from "./steps/InitialContact";
import { ScopeDetails } from "./steps/ScopeDetails";
import { FilesPhotos } from "./steps/FilesPhotos";
import { AreaOfWork } from "./steps/AreaOfWork";
import { Takeoff } from "./steps/Takeoff";
import { Duration } from "./steps/Duration";
import { Expenses } from "./steps/Expenses";
import { Pricing } from "./steps/Pricing";
import { LazySummary } from "@/components/lazy-loading/estimation-lazy";
import { SmartDefaultsProvider } from "@/components/ai/SmartDefaultsProvider";
import { SmartDefaultsPanel } from "@/components/ai/SmartDefaultsPanel";
import {
  GuidedFlowValidator,
  ValidationResult,
} from "@/lib/validation/guided-flow-validation";
import { DataSanitizer } from "@/lib/validation/data-sanitization";
import {
  WorkflowService,
  StepNavigationResult,
  ConditionalAction,
} from "@/lib/services/workflow-service";
import { WorkflowTemplate } from "@/lib/services/workflow-templates";
import { TemplateSelector } from "./template-selector";
import {
  useSmartAutoSave,
  useSmartAutoSaveData,
} from "@/hooks/useSmartAutoSave";
import { useConflictResolution } from "@/hooks/useAutoSave";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { MobileStepNavigation } from "@/components/ui/mobile/MobileStepNavigation";
import { useStepSwipeNavigation } from "@/hooks/useSwipeGestures";
import { MobileSmartDefaultsPanel } from "@/components/ui/mobile/MobileSmartDefaultsPanel";
import { ContextualHelpPanel } from "@/components/help/ContextualHelpPanel";
import { InteractiveTutorial } from "@/components/help/InteractiveTutorial";
import { HelpIntegratedFlow } from "@/components/help/HelpIntegratedFlow";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { SmartErrorNotification } from "@/components/error/SmartErrorNotification";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useSessionRecovery } from "@/hooks/useSessionRecovery";
import { SessionRecoveryModal } from "@/components/ui/SessionRecoveryModal";
import { SaveExitButton } from "@/components/ui/SaveExitButton";
import { AutoSaveStatusDisplay } from "./components/AutoSaveStatusDisplay";
import { TemplateStatusDisplay } from "./components/TemplateStatusDisplay";
import { RealTimeCostBreakdown } from "./RealTimeCostBreakdown";
import { useRealTimePricing } from "@/hooks/useRealTimePricing";
import { DesktopStepIndicator } from "./components/DesktopStepIndicator";
import { StepContentArea } from "./components/StepContentArea";
import { DesktopNavigationControls } from "./components/DesktopNavigationControls";
import { CollaborationProvider } from "@/components/collaboration/CollaborationProvider";
import { ConflictResolutionDialog } from "@/components/collaboration/ConflictResolutionDialog";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { logger } from "@/lib/utils/logger";

// StepComponentProps now uses unified GuidedFlowData
export interface StepComponentProps {
  data: GuidedFlowData;
  onUpdate: (stepData: Partial<GuidedFlowData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface Step {
  id: number;
  name: string;
  component: React.ComponentType<StepComponentProps>;
}

const STEPS: Step[] = [
  { id: 1, name: "Initial Contact", component: InitialContact },
  { id: 2, name: "Scope/Details", component: ScopeDetails },
  { id: 3, name: "Files/Photos", component: FilesPhotos },
  { id: 4, name: "Area of Work", component: AreaOfWork },
  { id: 5, name: "Takeoff", component: Takeoff },
  { id: 6, name: "Duration", component: Duration },
  { id: 7, name: "Expenses", component: Expenses },
  { id: 8, name: "Pricing", component: Pricing },
  { id: 9, name: "Summary", component: LazySummary },
];

interface GuidedEstimationFlowProps {
  customerId?: string;
  enableCollaboration?: boolean;
  estimateId?: string;
}

export function GuidedEstimationFlow({
  customerId,
  enableCollaboration = true,
  estimateId,
}: GuidedEstimationFlowProps) {
  const { user } = useAuth();
  const { isMobile } = useMobileDetection();

  const [showTemplateSelector, setShowTemplateSelector] = useState(true);
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkflowTemplate | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [baseFlowData, setBaseFlowData] = useState<GuidedFlowData>({});
  const [validationResults, setValidationResults] = useState<
    Record<number, ValidationResult>
  >({});
  const [attemptedNavigation, setAttemptedNavigation] = useState(false);
  const [conditionalActions, setConditionalActions] = useState<
    ConditionalAction[]
  >([]);
  const [navigationResult, setNavigationResult] =
    useState<StepNavigationResult | null>(null);

  const getInitialAvailableSteps = () => {
    try {
      const workflowSteps = WorkflowService.getAvailableSteps({});
      const stepIndices = workflowSteps
        .map((step) =>
          STEPS.findIndex(
            (s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, "-") === step.id,
          ),
        )
        .filter((index) => index !== -1)
        .map((index) => index + 1);

      if (stepIndices.length === 0) {
        return [1];
      } else {
        return stepIndices;
      }
    } catch (error) {
      logger.error("Error calculating initial available steps:", error);
      return [1];
    }
  };
  const [availableSteps, setAvailableSteps] = useState<number[]>(
    getInitialAvailableSteps,
  );

  const [currentEstimateId] = useState(
    () => estimateId || customerId || `temp-estimate-${Date.now()}`,
  );

  const smartAutoSave = useSmartAutoSave({
    estimateId: currentEstimateId,
    enabled: true,
    config: {
      saveInterval: 5000,
      enableVersionControl: false,
      conflictDetectionEnabled: true,
      maxRetries: 3,
      retryDelay: 1000,
      compressionEnabled: true,
    },
    onSaveSuccess: (wasAutoSave) => {
      if (wasAutoSave) {
        logger.debug("Auto-save completed successfully");
      } else {
        logger.debug("Manual save completed successfully");
      }
    },
    onSaveError: (error, wasAutoSave) => {
      logger.warn(`${wasAutoSave ? "Auto-save" : "Manual save"} failed`, {
        error,
      });
    },
    onConflictDetected: (conflictData) => {
      logger.warn(
        "Save conflict detected - will attempt automatic resolution",
        { conflictData },
      );
    },
  });

  const currentStepId =
    STEPS[currentStep - 1]?.name?.toLowerCase()?.replace(/[^a-z0-9]/g, "-") ||
    "unknown-step";
  const {
    data: flowData,
    updateData: updateFlowData,
    saveImmediately,
    saveError,
    clearSaveError,
  } = useSmartAutoSaveData(baseFlowData, smartAutoSave, currentStepId);

  const {
    showConflictDialog,
    conflictData,
    resolveWithLocal,
    resolveWithServer,
    resolveWithMerge,
    dismissConflict,
  } = useConflictResolution(smartAutoSave);

  // Session recovery integration
  const {
    setCurrentSession,
    saveAndExit,
    showRecoveryPrompt,
    dismissRecoveryPrompt,
    availableDrafts,
    isRecovering,
    acceptRecovery,
    deleteDraft,
    declineRecovery,
  } = useSessionRecovery({
    estimateId: currentEstimateId,
    enabled: true,
    autoSaveInterval: 30000, // 30 seconds
    onRecoveryComplete: (draft) => {
      logger.info("Session recovered successfully", { draftId: draft.id });
      setBaseFlowData(draft.data);
      setCurrentStep(
        STEPS.findIndex(
          (s) =>
            s.name.toLowerCase().replace(/[^a-z0-9]/g, "-") ===
            draft.currentStep,
        ) + 1 || 1,
      );
    },
    onRecoveryError: (error) => {
      logger.error("Session recovery failed", error);
    },
  });

  const {
    currentError,
    handleAsyncOperation,
    clearError,
    executeRecoveryAction,
    handleFormValidation,
  } = useErrorHandler({
    stepId: STEPS[currentStep - 1]?.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-"),
    stepNumber: currentStep,
    userId: customerId || "anonymous",
    flowData,
    enableAutoRecovery: true,
    maxRetryAttempts: 3,
  });

  useEffect(() => {
    if (flowData && JSON.stringify(flowData) !== JSON.stringify(baseFlowData)) {
      setBaseFlowData(flowData);
      updateAvailableSteps(flowData);

      // Update session recovery with current data
      setCurrentSession(flowData, currentStepId);
    }
  }, [
    flowData,
    baseFlowData,
    currentStepId,
    setCurrentSession,
    updateAvailableSteps,
  ]);

  // Real-time pricing and validation integration
  const realTimePricing = useRealTimePricing({
    estimateId: currentEstimateId,
    enabled: true,
    debounceMs: 1500,
    onPricingUpdate: (result) => {
      logger.debug("Pricing updated", { totalCost: result.totalCost });
    },
    onValidationUpdate: (result) => {
      if (!result.isValid) {
        logger.debug("Validation issues detected", {
          errorCount: result.errors.length,
        });
      }
    },
    onError: (error) => {
      logger.error("Real-time pricing error", error);
    },
  });

  const CurrentStepComponent = STEPS[currentStep - 1].component;

  const handleUpdate = (stepData: Partial<GuidedFlowData>) => {
    handleAsyncOperation(
      async () => {
        const sanitizedStepData =
          DataSanitizer.sanitizeGuidedFlowData(stepData);
        const updatedFlowData = { ...flowData, ...sanitizedStepData };

        updateFlowData(updatedFlowData, false);

        // Update real-time pricing with the new data
        const currentStepId = STEPS[currentStep - 1].name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-");
        realTimePricing.updatePricing(updatedFlowData, currentStepId);

        const currentStepData = GuidedFlowValidator.getStepData(
          currentStep,
          updatedFlowData,
        );
        if (currentStepData) {
          const validation = GuidedFlowValidator.validateStep(
            currentStep,
            currentStepData,
            updatedFlowData,
            {
              experienceLevel:
                user?.user_metadata?.experience_level || "intermediate",
              role: user?.user_metadata?.role || "estimator",
            },
          );
          setValidationResults((prev) => ({
            ...prev,
            [currentStep]: validation,
          }));

          if (!validation.isValid) {
            const validationErrors = validation.errors.reduce(
              (acc, error, index) => {
                acc[`field_${index}`] = error;
                return acc;
              },
              {} as Record<string, string>,
            );

            if (Object.keys(validationErrors).length > 0) {
              handleFormValidation(validationErrors);
            }
          }
        }

        updateAvailableSteps(updatedFlowData);

        const actions = WorkflowService.applyConditionalActions(
          currentStepId,
          updatedFlowData,
        );
        setConditionalActions(actions);
      },
      {
        errorType: "data_corruption",
        errorCode: "UPDATE_FAILED",
        fieldId: "flow_data",
      },
    );
  };

  const handleApplyDefault = (field: string, value: any) => {
    const fieldParts = field.split(".");
    const stepData: any = {};

    if (fieldParts.length === 2) {
      stepData[fieldParts[0]] = { [fieldParts[1]]: value };
    } else if (fieldParts.length === 3) {
      stepData[fieldParts[0]] = { [fieldParts[1]]: { [fieldParts[2]]: value } };
    } else {
      stepData[field] = value;
    }

    handleUpdate(stepData);
  };

  const handleApplySuggestion = (suggestion: any) => {
    if (suggestion.targetField && suggestion.suggestedValue !== undefined) {
      handleApplyDefault(suggestion.targetField, suggestion.suggestedValue);
    }
  };

  const handleNext = () => {
    setAttemptedNavigation(true);

    const currentStepData = GuidedFlowValidator.getStepData(
      currentStep,
      flowData,
    );
    if (currentStepData) {
      const validation = GuidedFlowValidator.validateStep(
        currentStep,
        currentStepData,
        flowData,
        { experienceLevel: "intermediate", role: "estimator" },
      );
      setValidationResults((prev) => ({
        ...prev,
        [currentStep]: validation,
      }));

      if (!validation.isValid) {
        logger.debug(
          `Step ${currentStep} has validation issues, but allowing navigation`,
          { errors: validation.errors },
        );
      }
    } else if (currentStep > 1) {
      setValidationResults((prev) => ({
        ...prev,
        [currentStep]: {
          isValid: false,
          errors: [],
          warnings: [
            "Some data is missing - you can return to complete this step later",
          ],
        },
      }));
    }

    const currentStepId = STEPS[currentStep - 1].name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-");
    const smartNavResult = WorkflowService.getSmartNextStep(
      currentStepId,
      flowData,
    );
    setNavigationResult(smartNavResult);

    if (smartNavResult.canNavigate && smartNavResult.nextStep) {
      const nextStepIndex = STEPS.findIndex(
        (step) =>
          step.name.toLowerCase().replace(/[^a-z0-9]/g, "-") ===
          smartNavResult.nextStep?.id,
      );

      if (nextStepIndex !== -1) {
        setCurrentStep(nextStepIndex + 1);
        setAttemptedNavigation(false);

        if (smartNavResult.requiredActions) {
          setConditionalActions(smartNavResult.requiredActions);
        }
      }
    } else if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      setAttemptedNavigation(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setAttemptedNavigation(false);
    }
  };

  const updateAvailableSteps = useCallback((data: GuidedFlowData) => {
    try {
      const workflowSteps = WorkflowService.getAvailableSteps(data || {});
      const stepIndices = workflowSteps
        .map((step) =>
          STEPS.findIndex(
            (s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, "-") === step.id,
          ),
        )
        .filter((index) => index !== -1)
        .map((index) => index + 1);

      if (stepIndices.length === 0) {
        setAvailableSteps([1]);
      } else {
        setAvailableSteps(stepIndices);
      }
    } catch (error) {
      logger.error("Error updating available steps", error);
      setAvailableSteps([1]);
    }
  }, []);

  const handleSelectTemplate = (
    template: WorkflowTemplate,
    appliedData: GuidedFlowData,
  ) => {
    setSelectedTemplate(template);

    const sanitizedAppliedData =
      DataSanitizer.sanitizeGuidedFlowData(appliedData);

    setBaseFlowData(sanitizedAppliedData);

    updateFlowData(sanitizedAppliedData, true);

    setShowTemplateSelector(false);

    updateAvailableSteps(sanitizedAppliedData);

    const actions = WorkflowService.applyConditionalActions(
      "initial-contact",
      sanitizedAppliedData,
    );
    setConditionalActions(actions);
  };

  const handleSkipTemplate = () => {
    const initialFlowData: GuidedFlowData = flowData || {
      initialContact: undefined,
      scopeDetails: undefined,
      filesPhotos: undefined,
      areaOfWork: undefined,
      takeoff: undefined,
      duration: undefined,
      expenses: undefined,
      pricing: undefined,
      summary: undefined,
    };

    setSelectedTemplate(null);

    setBaseFlowData(initialFlowData);

    updateFlowData(initialFlowData, true);

    setShowTemplateSelector(false);

    updateAvailableSteps(initialFlowData);
  };

  const currentValidation = validationResults[currentStep];
  const canProceed = !currentValidation || currentValidation.isValid;
  const validationErrors =
    currentValidation && !currentValidation.isValid
      ? currentValidation.errors
      : [];

  const collaborationWrapper = (content: React.ReactNode) => {
    if (enableCollaboration && estimateId) {
      return (
        <CollaborationProvider estimateId={estimateId}>
          {content}
        </CollaborationProvider>
      );
    }
    return content;
  };

  if (showTemplateSelector) {
    return (
      <TemplateSelector
        onSelectTemplate={handleSelectTemplate}
        onSkipTemplate={handleSkipTemplate}
        existingData={flowData}
        buildingType={
          flowData.initialContact?.aiExtractedData?.requirements?.buildingType
        }
        services={flowData.scopeDetails?.selectedServices}
      />
    );
  }

  return collaborationWrapper(
    <ErrorBoundary
      stepId={STEPS[currentStep - 1]?.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")}
      stepNumber={currentStep}
      userId={customerId || "anonymous"}
      flowData={flowData}
      onError={(error, errorInfo) => {}}
    >
      <SmartDefaultsProvider
        flowData={flowData}
        currentStep={currentStep}
        userProfile={{
          experienceLevel: "intermediate",
          role: "estimator",
          preferences: {},
        }}
        onApplyDefault={handleApplyDefault}
        onApplySuggestion={handleApplySuggestion}
      >
        <HelpIntegratedFlow
          currentStep={currentStep}
          flowData={flowData}
          validationErrors={validationErrors}
          className={`${isMobile ? "pb-20" : "max-w-6xl mx-auto p-3 sm:p-6"}`}
        >
          <div className="mb-4">
            <Breadcrumb
              items={[
                { title: "Dashboard", href: "/dashboard" },
                { title: "New Estimate", href: "/estimates/new/guided" },
                {
                  title: `Step ${currentStep}: ${STEPS[currentStep - 1]?.name}`,
                },
              ]}
              className="mb-2"
            />
          </div>

          {!isMobile && (
            <div className="mb-6 flex gap-4">
              <div className="flex-1">
                <ContextualHelpPanel
                  className="max-w-sm"
                  position="inline"
                  compact
                />
              </div>
              <div className="flex-1">
                <SmartDefaultsPanel className="max-w-sm ml-auto" compact />
              </div>
            </div>
          )}

          <div className="mb-4 space-y-3">
            <AutoSaveStatusDisplay
              smartAutoSave={smartAutoSave}
              saveError={saveError}
              clearSaveError={clearSaveError}
              onSaveNow={saveImmediately}
            />

            <TemplateStatusDisplay
              selectedTemplate={selectedTemplate}
              onChangeTemplate={() => setShowTemplateSelector(true)}
            />

            {/* Real-time Cost Breakdown */}
            <RealTimeCostBreakdown
              flowData={flowData}
              estimateId={currentEstimateId}
              isCompact={isMobile}
              showValidation={true}
              showConfidenceMetrics={true}
              enableLiveUpdates={true}
              onPricingUpdate={(result) => {
                logger.debug("Cost breakdown updated", {
                  total: result.totalCost,
                  confidence: result.confidence,
                  services: result.serviceBreakdown.length,
                });
              }}
            />
          </div>

          {!isMobile && (
            <DesktopStepIndicator
              steps={STEPS}
              currentStep={currentStep}
              availableSteps={availableSteps}
              validationResults={validationResults}
              onStepClick={(stepId) => {
                setCurrentStep(stepId);
                setAttemptedNavigation(false);
              }}
            />
          )}

          <StepContentArea
            CurrentStepComponent={CurrentStepComponent}
            flowData={flowData}
            currentStep={currentStep}
            steps={STEPS}
            currentValidation={currentValidation}
            attemptedNavigation={attemptedNavigation}
            onUpdate={handleUpdate}
            onNext={handleNext}
            onBack={handleBack}
            userExperienceLevel={
              user?.user_metadata?.experience_level || "intermediate"
            }
            onApplyAutoFix={handleApplyDefault}
          />

          {!isMobile && (
            <DesktopNavigationControls
              currentStep={currentStep}
              totalSteps={STEPS.length}
              canProceed={canProceed}
              validationErrors={validationErrors}
              onNext={handleNext}
              onBack={handleBack}
              onSaveAndExit={async () => {
                const success = await saveAndExit(flowData, currentStepId);
                if (success) {
                  window.location.href = "/estimates";
                } else {
                  logger.error("Failed to save session before exit");
                }
              }}
            />
          )}

          {isMobile && (
            <MobileStepNavigation
              steps={STEPS}
              currentStep={currentStep}
              availableSteps={availableSteps}
              onStepChange={setCurrentStep}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={canProceed}
              validationErrors={validationErrors}
              progress={(currentStep / STEPS.length) * 100}
            />
          )}

          {isMobile && <MobileSmartDefaultsPanel />}

          <InteractiveTutorial />

          {showConflictDialog && conflictData && (
            <ConflictResolutionDialog
              isOpen={showConflictDialog}
              onClose={dismissConflict}
              conflict={conflictData}
            />
          )}

          {/* Session Recovery Modal */}
          <SessionRecoveryModal
            isOpen={showRecoveryPrompt}
            onClose={dismissRecoveryPrompt}
            availableDrafts={availableDrafts}
            isRecovering={isRecovering}
            onRecoverSession={async (draftId) => {
              await acceptRecovery(draftId);
            }}
            onDeleteDraft={async (draftId) => {
              await deleteDraft(draftId);
            }}
            onDeclineAll={declineRecovery}
          />
        </HelpIntegratedFlow>

        {currentError && (
          <SmartErrorNotification
            errorMessage={currentError}
            onDismiss={clearError}
            onActionExecute={async (action) => {
              await executeRecoveryAction(action.id);
            }}
            onRetry={() => {
              if (attemptedNavigation) {
                handleNext();
              }
            }}
            position={isMobile ? "bottom-center" : "top-right"}
            autoHide={currentError.severity !== "error"}
            autoHideDelay={6000}
          />
        )}
      </SmartDefaultsProvider>
    </ErrorBoundary>,
  );
}
