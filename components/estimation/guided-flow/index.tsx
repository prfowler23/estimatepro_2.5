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
import { Summary } from "./steps/Summary";
import { SmartDefaultsProvider } from "@/components/ai/SmartDefaultsProvider";
import { SmartDefaultsPanel } from "@/components/ai/SmartDefaultsPanel";
import {
  GuidedFlowValidator,
  ValidationResult,
} from "@/lib/validation/guided-flow-validation";
import {
  WorkflowService,
  StepNavigationResult,
  ConditionalAction,
} from "@/lib/services/workflow-service";
import { WorkflowTemplate } from "@/lib/services/workflow-templates";
import { TemplateSelector } from "./template-selector";
import {
  useAutoSave,
  useAutoSaveData,
  useConflictResolution,
} from "@/hooks/useAutoSave";
import { Alert } from "@/components/ui/alert";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { MobileStepNavigation } from "@/components/ui/mobile/MobileStepNavigation";
import { MobileSmartDefaultsPanel } from "@/components/ui/mobile/MobileSmartDefaultsPanel";
import { useHelp } from "@/components/help/HelpProvider";
import { ContextualHelpPanel } from "@/components/help/ContextualHelpPanel";
import { InteractiveTutorial } from "@/components/help/InteractiveTutorial";
import { HelpIntegratedFlow } from "@/components/help/HelpIntegratedFlow";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { SmartErrorNotification } from "@/components/error/SmartErrorNotification";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import {
  CollaborationProvider,
  useCollaboration,
} from "@/components/collaboration/CollaborationProvider";
import { CollaboratorAvatars } from "@/components/collaboration/CollaboratorAvatars";
import { RealTimeChangeIndicator } from "@/components/collaboration/RealTimeChangeIndicator";
import { ConflictResolutionDialog } from "@/components/collaboration/ConflictResolutionDialog";
import {
  GuidedFlowData,
  InitialContactData,
  ScopeDetailsData,
  FilesPhotosData,
  AreaOfWorkData,
  TakeoffStepData,
  DurationStepData,
  ExpensesStepData,
  PricingStepData,
  SummaryStepData,
} from "@/lib/types/estimate-types";

// StepComponentProps now uses unified GuidedFlowData
interface StepComponentProps {
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
  { id: 9, name: "Summary", component: Summary },
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
  const { isMobile, isTablet } = useMobileDetection();
  const [showTemplateSelector, setShowTemplateSelector] = useState(true);
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkflowTemplate | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [flowData, setFlowData] = useState<GuidedFlowData>({});
  const [validationResults, setValidationResults] = useState<
    Record<number, ValidationResult>
  >({});
  const [attemptedNavigation, setAttemptedNavigation] = useState(false);
  const [conditionalActions, setConditionalActions] = useState<
    ConditionalAction[]
  >([]);
  const [navigationResult, setNavigationResult] =
    useState<StepNavigationResult | null>(null);
  const [availableSteps, setAvailableSteps] = useState<number[]>([]);

  // Error handling
  const {
    currentError,
    isRecovering,
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

  // Generate or get estimate ID for auto-save
  const [currentEstimateId] = useState(
    () => estimateId || customerId || `temp-estimate-${Date.now()}`,
  );

  // Auto-save integration
  const autoSave = useAutoSave({
    estimateId: currentEstimateId,
    enabled: true,
    config: {
      saveInterval: 30000, // 30 seconds
      enableVersionControl: false, // disabled to avoid 400 errors in dev
      conflictDetectionEnabled: true,
    },
    onSaveSuccess: () => {
      // Auto-save successful
    },
    onSaveError: (error) => {
      // Auto-save error handled by error handler
    },
    onConflictDetected: (conflictData) => {
      // Conflict detected and resolved automatically
    },
  });

  // Auto-save data management
  const currentStepId = STEPS[currentStep - 1].name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");
  const {
    data: autoSavedFlowData,
    updateData: updateFlowData,
    saveImmediately,
    hasLocalChanges,
  } = useAutoSaveData(flowData, autoSave, currentStepId);

  // Conflict resolution
  const {
    showConflictDialog,
    conflictData,
    resolveWithLocal,
    resolveWithServer,
    resolveWithMerge,
    dismissConflict,
  } = useConflictResolution(autoSave);

  const CurrentStepComponent = STEPS[currentStep - 1].component;

  const handleUpdate = (stepData: Partial<GuidedFlowData>) => {
    handleAsyncOperation(
      async () => {
        const updatedFlowData = { ...autoSavedFlowData, ...stepData };

        // Update local state
        setFlowData(updatedFlowData);

        // Update auto-save data (this will trigger auto-save)
        updateFlowData(updatedFlowData);

        // Validate current step when data is updated (enhanced with business rules)
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

          // Handle validation errors through error system
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

        // Update available steps based on new data
        updateAvailableSteps(updatedFlowData);

        // Apply conditional actions for current step
        const currentStepId = STEPS[currentStep - 1].name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-");
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

  // Handler for applying smart defaults
  const handleApplyDefault = (field: string, value: any) => {
    const fieldParts = field.split(".");
    const stepData: any = {};

    // Build nested object structure
    if (fieldParts.length === 2) {
      stepData[fieldParts[0]] = { [fieldParts[1]]: value };
    } else if (fieldParts.length === 3) {
      stepData[fieldParts[0]] = { [fieldParts[1]]: { [fieldParts[2]]: value } };
    } else {
      stepData[field] = value;
    }

    handleUpdate(stepData);
  };

  // Handler for applying smart suggestions
  const handleApplySuggestion = (suggestion: any) => {
    if (suggestion.targetField && suggestion.suggestedValue !== undefined) {
      handleApplyDefault(suggestion.targetField, suggestion.suggestedValue);
    }
  };

  const handleNext = () => {
    setAttemptedNavigation(true);

    // Validate current step before allowing progression (enhanced with business rules)
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
        // Don't allow progression if validation fails
        return;
      }
    } else if (currentStep > 1) {
      // Don't allow progression if required data is missing
      setValidationResults((prev) => ({
        ...prev,
        [currentStep]: {
          isValid: false,
          errors: ["Required data is missing for this step"],
          warnings: [],
        },
      }));
      return;
    }

    // Use smart navigation to determine next step
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

        // Apply conditional actions
        if (smartNavResult.requiredActions) {
          setConditionalActions(smartNavResult.requiredActions);
        }
      }
    } else if (currentStep < STEPS.length) {
      // Fallback to sequential navigation
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

  // Update available steps based on workflow rules
  const updateAvailableSteps = (data: GuidedFlowData) => {
    const workflowSteps = WorkflowService.getAvailableSteps(data);
    const stepIndices = workflowSteps
      .map((step) =>
        STEPS.findIndex(
          (s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, "-") === step.id,
        ),
      )
      .filter((index) => index !== -1)
      .map((index) => index + 1);
    setAvailableSteps(stepIndices);
  };

  // Template handling methods
  const handleSelectTemplate = (
    template: WorkflowTemplate,
    appliedData: GuidedFlowData,
  ) => {
    setSelectedTemplate(template);
    setFlowData(appliedData);
    updateFlowData(appliedData, true); // Immediate save for template application
    setShowTemplateSelector(false);
    updateAvailableSteps(appliedData);

    // Apply conditional actions from template
    const actions = WorkflowService.applyConditionalActions(
      "initial-contact",
      appliedData,
    );
    setConditionalActions(actions);
  };

  const handleSkipTemplate = () => {
    setShowTemplateSelector(false);
    updateAvailableSteps(autoSavedFlowData);
  };

  // Initialize available steps on mount
  React.useEffect(() => {
    updateAvailableSteps(flowData);
  }, []);

  // Get current step validation
  const currentValidation = validationResults[currentStep];
  const hasValidationErrors =
    attemptedNavigation && currentValidation && !currentValidation.isValid;

  // Calculate estimated time remaining
  const estimatedTimeRemaining =
    WorkflowService.calculateEstimatedTimeRemaining(flowData);

  // Show template selector first if not yet selected
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

  // Check navigation state
  const canProceed = !currentValidation || currentValidation.isValid;
  const validationErrors =
    currentValidation && !currentValidation.isValid
      ? currentValidation.errors
      : [];

  // Collaboration content wrapper
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

  return collaborationWrapper(
    <ErrorBoundary
      stepId={STEPS[currentStep - 1]?.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")}
      stepNumber={currentStep}
      userId={customerId || "anonymous"}
      flowData={flowData}
      onError={(error, errorInfo) => {
        // Error boundary caught error - handled by error recovery system
      }}
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
          {/* Breadcrumbs */}
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

          {/* Desktop Panels */}
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

          {/* Auto-save and Template Status */}
          <div className="mb-4 space-y-3">
            {/* Auto-save status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    autoSave.isSaving
                      ? "bg-yellow-500 animate-pulse"
                      : autoSave.hasUnsavedChanges
                        ? "bg-orange-500"
                        : autoSave.saveError
                          ? "bg-red-500"
                          : "bg-green-500"
                  }`}
                />
                <span className="text-sm text-gray-700">
                  {autoSave.isSaving
                    ? "Saving..."
                    : autoSave.hasUnsavedChanges
                      ? "Unsaved changes"
                      : autoSave.saveError
                        ? "Save error"
                        : "All changes saved"}
                </span>
                {autoSave.lastSaveTime && (
                  <span className="text-xs text-gray-500">
                    Last saved: {autoSave.lastSaveTime.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {autoSave.hasUnsavedChanges && (
                  <button
                    onClick={() => saveImmediately()}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Save Now
                  </button>
                )}
                {autoSave.saveError && (
                  <span
                    className="text-xs text-red-600"
                    title={autoSave.saveError}
                  >
                    ⚠️ Error
                  </span>
                )}
              </div>
            </div>

            {/* Template indicator */}
            {selectedTemplate && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedTemplate.icon}</span>
                    <div>
                      <span className="font-medium text-blue-900">
                        Using Template: {selectedTemplate.name}
                      </span>
                      <p className="text-sm text-blue-700">
                        {selectedTemplate.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTemplateSelector(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Change Template
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Step indicator - Hidden on mobile */}
          {!isMobile && (
            <div className="mb-6 sm:mb-8">
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Progress: Step {currentStep} of {STEPS.length}
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.round((currentStep / STEPS.length) * 100)}% Complete
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Desktop step indicator */}
              <div className="flex items-center justify-between overflow-x-auto">
                {STEPS.map((step, index) => {
                  const isAvailable = availableSteps.includes(step.id);
                  const isCompleted = currentStep > step.id;
                  const isCurrent = currentStep === step.id;

                  return (
                    <div key={step.id} className="flex items-center flex-1">
                      <div
                        className={`flex flex-col items-center min-w-0 flex-1 cursor-pointer group ${
                          isCurrent
                            ? "text-primary"
                            : isCompleted
                              ? "text-green-600"
                              : isAvailable
                                ? "text-blue-600"
                                : "text-gray-400"
                        }`}
                        onClick={() => {
                          if (isAvailable || isCompleted) {
                            setCurrentStep(step.id);
                            setAttemptedNavigation(false);
                          }
                        }}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-2 transition-all duration-200 ${
                            isCurrent
                              ? "bg-primary text-primary-foreground shadow-md scale-110"
                              : isCompleted
                                ? "bg-green-600 text-white shadow-sm group-hover:bg-green-700"
                                : isAvailable
                                  ? "bg-blue-600 text-white shadow-sm group-hover:bg-blue-700"
                                  : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <span>{step.id}</span>
                          )}
                        </div>
                        <div
                          className={`text-xs text-center px-1 font-medium ${isCurrent ? "text-primary" : ""}`}
                        >
                          {step.name}
                        </div>
                        {isCurrent && (
                          <div className="text-xs text-center mt-1 px-2 py-1 bg-primary/10 rounded text-primary font-medium">
                            Current
                          </div>
                        )}
                        {!isAvailable && !isCompleted && !isCurrent && (
                          <div className="text-xs text-gray-400 mt-1">🔒</div>
                        )}
                      </div>

                      {/* Connector line */}
                      {index < STEPS.length - 1 && (
                        <div
                          className={`w-full h-0.5 mx-2 transition-colors duration-300 ${
                            currentStep > step.id
                              ? "bg-green-600"
                              : "bg-gray-200"
                          }`}
                          style={{ minWidth: "20px" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Validation Messages */}
          {hasValidationErrors && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <div>
                <h4 className="font-medium mb-2">
                  Please fix the following issues:
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {currentValidation.errors.map((error, index) => (
                    <li key={index} className="text-sm">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </Alert>
          )}

          {/* Warning Messages */}
          {currentValidation && currentValidation.warnings.length > 0 && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <div>
                <h4 className="font-medium mb-2">Warnings:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {currentValidation.warnings.map((warning, index) => (
                    <li key={index} className="text-sm">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </Alert>
          )}

          {/* Suggestions */}
          {currentValidation &&
            currentValidation.suggestions &&
            currentValidation.suggestions.length > 0 && (
              <Alert className="mb-6 border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <div>
                  <h4 className="font-medium mb-2 text-blue-800">
                    Suggestions:
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {currentValidation.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-blue-700">
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              </Alert>
            )}

          {/* Quality Score and Auto-Fix */}
          {currentValidation &&
            (currentValidation.qualityScore !== undefined ||
              currentValidation.autoFixAvailable) && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentValidation.qualityScore !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">
                          Quality Score:
                        </span>
                        <div
                          className={`px-2 py-1 rounded text-sm font-medium ${
                            currentValidation.qualityScore >= 90
                              ? "bg-green-100 text-green-800"
                              : currentValidation.qualityScore >= 75
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {Math.round(currentValidation.qualityScore)}%
                        </div>
                      </div>
                    )}
                  </div>
                  {currentValidation.autoFixAvailable && (
                    <button
                      onClick={() => {
                        const fixedData = GuidedFlowValidator.applyAutoFixes(
                          flowData,
                          currentStep,
                          {
                            experienceLevel: "intermediate",
                            role: "estimator",
                          },
                        );
                        handleUpdate(fixedData);
                      }}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Apply Auto-Fixes
                    </button>
                  )}
                </div>
              </div>
            )}

          {/* Conditional Action Messages */}
          {conditionalActions.length > 0 && (
            <div className="mb-6 space-y-2">
              {conditionalActions.map((action, index) => (
                <Alert
                  key={index}
                  className={
                    action.type === "show-warning"
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-blue-200 bg-blue-50"
                  }
                >
                  <AlertCircle className="h-4 w-4" />
                  <div>
                    <h4 className="font-medium mb-1">
                      {action.type === "require-step"
                        ? "Required Step"
                        : action.type === "auto-populate"
                          ? "Auto-populated"
                          : action.type === "show-warning"
                            ? "Notice"
                            : "Information"}
                    </h4>
                    {action.message && (
                      <p className="text-sm">{action.message}</p>
                    )}
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Navigation Result Warnings */}
          {navigationResult &&
            navigationResult.warnings &&
            navigationResult.warnings.length > 0 && (
              <Alert className="mb-6 border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4" />
                <div>
                  <h4 className="font-medium mb-2">Navigation Notes:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {navigationResult.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              </Alert>
            )}

          {/* Success Messages */}
          {currentValidation &&
            currentValidation.isValid &&
            currentValidation.warnings.length === 0 &&
            attemptedNavigation && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div className="text-green-800">
                  <h4 className="font-medium">Step completed successfully!</h4>
                  <p className="text-sm">
                    All required information has been provided.
                  </p>
                </div>
              </Alert>
            )}

          {/* Progress and time estimation */}
          {estimatedTimeRemaining > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-800 font-medium">
                  Estimated time remaining: {estimatedTimeRemaining} minutes
                </span>
                <span className="text-blue-600">
                  {Math.round((currentStep / STEPS.length) * 100)}% complete
                </span>
              </div>
            </div>
          )}

          {/* Current step content */}
          <div
            className={`bg-card rounded-lg border ${isMobile ? "p-4 mx-4 mb-4" : "p-3 sm:p-6"}`}
          >
            <CurrentStepComponent
              data={flowData}
              onUpdate={handleUpdate}
              onNext={handleNext}
              onBack={handleBack}
            />
          </div>

          {/* Mobile Navigation */}
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

          {/* Mobile Smart Defaults Panel */}
          {isMobile && <MobileSmartDefaultsPanel />}

          {/* Interactive Tutorial Overlay */}
          <InteractiveTutorial />

          {/* Conflict Resolution Dialog */}
          {showConflictDialog && conflictData && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-2 text-red-600">
                        ⚠️ Conflict Detected
                      </h2>
                      <p className="text-gray-600">
                        Your changes conflict with recent updates. Please choose
                        how to resolve this conflict.
                      </p>
                    </div>
                    <button
                      onClick={dismissConflict}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Conflicted Fields:</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {conflictData.conflictedFields?.map(
                          (field: string, index: number) => (
                            <li key={index} className="text-gray-700">
                              {field}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={resolveWithLocal}
                        className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <div className="text-blue-600 font-semibold mb-2">
                          Keep My Changes
                        </div>
                        <div className="text-sm text-gray-600">
                          Use your local changes and discard server changes
                        </div>
                      </button>

                      <button
                        onClick={resolveWithServer}
                        className="p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
                      >
                        <div className="text-green-600 font-semibold mb-2">
                          Use Server Version
                        </div>
                        <div className="text-sm text-gray-600">
                          Discard your changes and use the server version
                        </div>
                      </button>

                      <button
                        onClick={resolveWithMerge}
                        className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
                      >
                        <div className="text-purple-600 font-semibold mb-2">
                          Auto-Merge
                        </div>
                        <div className="text-sm text-gray-600">
                          Automatically merge compatible changes
                        </div>
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600">
                        <strong>Tip:</strong> Auto-merge will intelligently
                        combine changes where possible. If you&apos;re unsure,
                        choose &quot;Keep My Changes&quot; to preserve your
                        work.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </HelpIntegratedFlow>

        {/* Smart Error Notifications */}
        {currentError && (
          <SmartErrorNotification
            errorMessage={currentError}
            onDismiss={clearError}
            onActionExecute={async (action) => {
              await executeRecoveryAction(action.id);
            }}
            onRetry={() => {
              // Retry last navigation or operation
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

// Collaboration content component - temporarily disabled
// function CollaborationContent({ children }: { children: React.ReactNode }) {
//   const {
//     isConnected,
//     conflicts,
//     activeUsers,
//     initializeCollaboration,
//     broadcastChange,
//     updatePresence
//   } = useCollaboration();
//
//   const [showConflictDialog, setShowConflictDialog] = useState(false);
//   const [selectedConflict, setSelectedConflict] = useState<any>(null);
//
//   // Auto-initialize collaboration
//   useEffect(() => {
//     if (!isConnected) {
//       initializeCollaboration('temp-estimate', {
//         userName: 'User',
//         currentStep: 1,
//         role: 'editor'
//       });
//     }
//   }, [isConnected, initializeCollaboration]);
//
//   // Handle conflicts
//   useEffect(() => {
//     if (conflicts.length > 0 && !showConflictDialog) {
//       setSelectedConflict(conflicts[0]);
//       setShowConflictDialog(true);
//     }
//   }, [conflicts.length, showConflictDialog]);
//
//   return (
//     <div className="relative">
//       {/* Collaboration header */}
//       {isConnected && activeUsers.length > 1 && (
//         <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-3">
//               <span className="text-sm font-medium text-blue-800">
//                 Collaborating with {activeUsers.length - 1} other{activeUsers.length > 2 ? 's' : ''}
//               </span>
//               <CollaboratorAvatars compact maxVisible={5} showInviteButton={false} />
//             </div>
//             <div className="flex items-center gap-2">
//               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
//               <span className="text-xs text-blue-600">Live</span>
//             </div>
//           </div>
//         </div>
//       )}
//
//       {/* Real-time activity indicator */}
//       {isConnected && (
//         <RealTimeChangeIndicator
//           position="fixed"
//           className="top-4 right-4 w-80"
//           showHistory
//           maxChanges={5}
//         />
//       )}
//
//       {children}
//
//       {/* Conflict resolution dialog */}
//       <ConflictResolutionDialog
//         isOpen={showConflictDialog}
//         onClose={() => {
//           setShowConflictDialog(false);
//           setSelectedConflict(null);
//         }}
//         conflict={selectedConflict}
//       />
//     </div>
//   );
// }
