// Unified Workflow Service - Core workflow orchestration with session management and validation
// Consolidates workflow-service, cross-step-validation-service, dependency-tracking-service,
// session-recovery-service, and auto-save-service into a single unified service

import { createClient } from "@/lib/supabase/universal-client";
import { withDatabaseRetry } from "@/lib/utils/retry-logic";
import {
  isNotNull,
  safeString,
  safeNumber,
  withDefaultArray,
} from "@/lib/utils/null-safety";
import { invalidateCache } from "@/lib/utils/cache";
import {
  GuidedFlowData,
  ServiceType,
  AIExtractedData,
  ServiceDependency,
  WorkArea,
  TakeoffData,
  Measurement,
  WeatherAnalysis,
  PricingCalculation,
  FinalEstimate,
} from "@/lib/types/estimate-types";
import { getUser } from "@/lib/auth/server";
import { offlineUtils } from "@/lib/pwa/offline-manager";

// ================================
// CORE WORKFLOW TYPES
// ================================

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  isRequired: boolean;
  isCompleted: boolean;
  data?: any;
  validationRules?: ValidationRule[];
  conditionalRules?: ConditionalRule[];
  estimatedDuration?: number; // Minutes
  category?: "data-collection" | "analysis" | "calculation" | "review";
  dependencies?: string[]; // Step IDs this step depends on
  allowParallel?: boolean; // Can be worked on while other steps are incomplete
}

export interface ValidationRule {
  field: string;
  type: "required" | "minLength" | "maxLength" | "pattern" | "custom";
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export interface ConditionalRule {
  id: string;
  condition: ConditionExpression;
  action: ConditionalAction;
  priority: number; // Higher numbers execute first
}

export interface ConditionExpression {
  type:
    | "service-selected"
    | "service-not-selected"
    | "field-value"
    | "step-completed"
    | "composite";
  field?: string;
  value?: any;
  operator?:
    | "equals"
    | "not-equals"
    | "contains"
    | "greater-than"
    | "less-than"
    | "in"
    | "not-in";
  conditions?: ConditionExpression[]; // For composite conditions
  logic?: "and" | "or"; // For composite conditions
}

export interface ConditionalAction {
  type:
    | "skip-step"
    | "require-step"
    | "auto-populate"
    | "show-warning"
    | "redirect-to-step";
  targetStep?: string;
  data?: any;
  message?: string;
}

// ================================
// VALIDATION TYPES
// ================================

export interface CrossStepValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
  errors: ValidationError[];
  suggestions: ValidationSuggestion[];
  blockedSteps: string[];
  confidence: "high" | "medium" | "low";
  lastValidated: Date;
}

export interface ValidationWarning {
  id: string;
  type: "inconsistency" | "optimization" | "risk" | "dependency";
  severity: "low" | "medium" | "high";
  message: string;
  affectedSteps: string[];
  suggestedAction?: string;
  canAutoFix: boolean;
  autoFixAction?: () => void;
}

export interface ValidationError {
  id: string;
  type: "required" | "invalid" | "conflict" | "dependency";
  severity: "warning" | "error" | "critical";
  field: string;
  stepId: string;
  message: string;
  expectedValue?: any;
  currentValue?: any;
  blocksProgression: boolean;
}

export interface ValidationSuggestion {
  id: string;
  type: "optimization" | "consistency" | "efficiency" | "accuracy";
  priority: "low" | "medium" | "high";
  message: string;
  affectedSteps: string[];
  potentialImpact: string;
  implementationComplexity: "low" | "medium" | "high";
}

// ================================
// DEPENDENCY TRACKING TYPES
// ================================

export interface DependencyRule {
  id: string;
  sourceStep: string;
  sourceField: string;
  targetSteps: string[];
  type: "auto-populate" | "recalculate" | "validate" | "clear";
  priority: "low" | "medium" | "high" | "critical";
  condition?: (value: any, flowData: GuidedFlowData) => boolean;
  transformer?: (value: any, flowData: GuidedFlowData) => any;
}

export interface DependencyUpdate {
  sourceStep: string;
  sourceField: string;
  value: any;
  affectedSteps: string[];
  updateType: "auto-populate" | "recalculate" | "validate" | "clear";
  timestamp: Date;
}

// ================================
// SESSION MANAGEMENT TYPES
// ================================

export interface SessionDraft {
  id: string;
  estimateId: string | null;
  userId: string;
  sessionId: string;
  currentStep: string;
  data: GuidedFlowData;
  progress: {
    completedSteps: string[];
    currentStepIndex: number;
    totalSteps: number;
    progressPercentage: number;
  };
  metadata: {
    lastActivity: Date;
    browserInfo: {
      userAgent: string;
      platform: string;
      url: string;
      tabId?: string;
    };
    autoSaveEnabled: boolean;
    isActive: boolean;
  };
  recovery: {
    source: "auto-save" | "manual-save" | "tab-close" | "browser-crash";
    recoveryAttempts: number;
    lastRecoveryTime?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface AutoSaveState {
  lastSaved: Date;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  conflictDetected: boolean;
  localVersion: number;
  serverVersion: number;
  lastSaveAttempt: Date | null;
}

export interface SaveVersion {
  id: string;
  version: number;
  data: GuidedFlowData | string;
  timestamp: Date;
  userId: string;
  stepId: string;
  changeDescription: string;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    sessionId: string;
  };
}

export interface ConflictResolution {
  strategy: "merge" | "overwrite-local" | "overwrite-server" | "manual";
  resolvedData: GuidedFlowData;
  conflictedFields: string[];
  resolutionNotes?: string;
}

// ================================
// UNIFIED WORKFLOW SERVICE
// ================================

export class UnifiedWorkflowService {
  // Core workflow functionality
  private defaultSteps: WorkflowStep[] = [
    {
      id: "project-info",
      title: "Project Information",
      description: "Basic project details and location",
      isRequired: true,
      isCompleted: false,
      category: "data-collection",
      estimatedDuration: 5,
    },
    {
      id: "photo-analysis",
      title: "Photo Analysis",
      description: "Upload and analyze building photos",
      isRequired: true,
      isCompleted: false,
      category: "analysis",
      estimatedDuration: 10,
    },
    {
      id: "service-selection",
      title: "Service Selection",
      description: "Choose services to include in estimate",
      isRequired: true,
      isCompleted: false,
      category: "data-collection",
      estimatedDuration: 5,
    },
    {
      id: "measurements",
      title: "Measurements",
      description: "Take measurements and calculate areas",
      isRequired: true,
      isCompleted: false,
      category: "data-collection",
      estimatedDuration: 15,
      dependencies: ["service-selection"],
    },
    {
      id: "pricing",
      title: "Pricing & Calculations",
      description: "Calculate costs and generate pricing",
      isRequired: true,
      isCompleted: false,
      category: "calculation",
      estimatedDuration: 8,
      dependencies: ["service-selection", "measurements"],
    },
    {
      id: "review",
      title: "Review & Finalize",
      description: "Review estimate and finalize details",
      isRequired: true,
      isCompleted: false,
      category: "review",
      estimatedDuration: 10,
      dependencies: ["pricing"],
    },
  ];

  // Session and auto-save state
  private autoSaveStates = new Map<string, AutoSaveState>();
  private saveTimers = new Map<string, NodeJS.Timeout>();
  private dependencyRules = new Map<string, DependencyRule[]>();
  private listeners = new Map<string, ((update: DependencyUpdate) => void)[]>();

  // Configuration
  private config = {
    autoSaveInterval: 10000, // 10 seconds
    maxRetries: 3,
    retryDelay: 1000,
    maxDraftAge: 24, // hours
    maxRecoveryAttempts: 3,
    debounceMs: 500,
  };

  // ================================
  // CORE WORKFLOW METHODS
  // ================================

  /**
   * Initialize workflow with default or custom steps
   */
  async initializeWorkflow(
    estimateId: string,
    userId: string,
    customSteps?: WorkflowStep[],
  ): Promise<GuidedFlowData> {
    const steps = customSteps || this.defaultSteps;

    const initialData: GuidedFlowData = {
      estimateId,
      currentStep: steps[0]?.id || "project-info",
      completedSteps: [],
      projectInfo: {
        title: "",
        description: "",
        location: "",
        buildingType: "",
        estimatedValue: 0,
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        propertyDetails: {
          squareFootage: 0,
          stories: 1,
          yearBuilt: null,
          constructionType: "",
        },
      },
      photoAnalysis: {
        photos: [],
        aiAnalysis: null,
        extractedData: null,
      },
      serviceSelection: {
        selectedServices: [],
        dependencies: [],
      },
      measurements: {
        areas: [],
        takeoffData: null,
        totalSquareFeet: 0,
        measurementMethod: "manual",
      },
      pricingData: {
        calculations: [],
        totalCost: 0,
        margins: {},
        adjustments: [],
      },
      finalEstimate: {
        subtotal: 0,
        tax: 0,
        total: 0,
        terms: "",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      metadata: {
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        templateId: null,
        workflowVersion: "unified-v1",
      },
    };

    // Initialize auto-save state
    this.initializeAutoSave(estimateId, userId);

    // Set up dependency tracking
    this.initializeDependencyTracking();

    return initialData;
  }

  /**
   * Get workflow progress
   */
  getWorkflowProgress(flowData: GuidedFlowData): {
    currentStepIndex: number;
    totalSteps: number;
    progressPercentage: number;
    completedSteps: string[];
    nextStep?: WorkflowStep;
  } {
    const steps = this.defaultSteps;
    const currentStepIndex = steps.findIndex(
      (step) => step.id === flowData.currentStep,
    );
    const completedSteps = flowData.completedSteps || [];
    const progressPercentage = Math.round(
      (completedSteps.length / steps.length) * 100,
    );

    const nextStepIndex = currentStepIndex + 1;
    const nextStep =
      nextStepIndex < steps.length ? steps[nextStepIndex] : undefined;

    return {
      currentStepIndex,
      totalSteps: steps.length,
      progressPercentage,
      completedSteps,
      nextStep,
    };
  }

  /**
   * Navigate to next step with validation
   */
  async navigateToNextStep(
    flowData: GuidedFlowData,
    userId: string,
  ): Promise<{
    success: boolean;
    nextStep?: string;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    // Validate current step
    const validationResult = await this.validateStep(
      flowData.currentStep,
      flowData,
    );

    if (!validationResult.isValid) {
      return {
        success: false,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      };
    }

    // Find next step
    const steps = this.defaultSteps;
    const currentIndex = steps.findIndex(
      (step) => step.id === flowData.currentStep,
    );
    const nextStep = steps[currentIndex + 1];

    if (!nextStep) {
      return {
        success: false,
        errors: [
          {
            id: "no-next-step",
            type: "invalid",
            severity: "error",
            field: "currentStep",
            stepId: flowData.currentStep,
            message: "No next step available",
            blocksProgression: true,
          },
        ],
        warnings: [],
      };
    }

    // Update flow data
    flowData.currentStep = nextStep.id;
    if (!flowData.completedSteps.includes(flowData.currentStep)) {
      flowData.completedSteps.push(flowData.currentStep);
    }
    flowData.metadata.updatedAt = new Date();

    // Auto-save the updated flow
    await this.autoSave(
      flowData.estimateId,
      flowData,
      userId,
      `Navigated to ${nextStep.title}`,
    );

    return {
      success: true,
      nextStep: nextStep.id,
      errors: [],
      warnings: validationResult.warnings,
    };
  }

  // ================================
  // VALIDATION METHODS
  // ================================

  /**
   * Validate a specific step
   */
  async validateStep(
    stepId: string,
    flowData: GuidedFlowData,
  ): Promise<CrossStepValidationResult> {
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const suggestions: ValidationSuggestion[] = [];
    const blockedSteps: string[] = [];

    // Step-specific validation
    switch (stepId) {
      case "project-info":
        if (!flowData.projectInfo.title?.trim()) {
          errors.push({
            id: "missing-title",
            type: "required",
            severity: "error",
            field: "title",
            stepId,
            message: "Project title is required",
            blocksProgression: true,
          });
        }
        break;

      case "service-selection":
        if (flowData.serviceSelection.selectedServices.length === 0) {
          errors.push({
            id: "no-services",
            type: "required",
            severity: "error",
            field: "selectedServices",
            stepId,
            message: "At least one service must be selected",
            blocksProgression: true,
          });
        }
        break;

      case "measurements":
        if (flowData.measurements.totalSquareFeet === 0) {
          errors.push({
            id: "no-measurements",
            type: "required",
            severity: "error",
            field: "totalSquareFeet",
            stepId,
            message: "Measurements are required",
            blocksProgression: true,
          });
        }
        break;
    }

    // Cross-step validation
    await this.performCrossStepValidation(
      flowData,
      warnings,
      errors,
      suggestions,
    );

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      suggestions,
      blockedSteps,
      confidence: errors.length === 0 ? "high" : "low",
      lastValidated: new Date(),
    };
  }

  /**
   * Perform cross-step validation
   */
  private async performCrossStepValidation(
    flowData: GuidedFlowData,
    warnings: ValidationWarning[],
    errors: ValidationError[],
    suggestions: ValidationSuggestion[],
  ): Promise<void> {
    // Service-measurement consistency
    if (
      flowData.serviceSelection.selectedServices.length > 0 &&
      flowData.measurements.totalSquareFeet === 0
    ) {
      warnings.push({
        id: "service-measurement-mismatch",
        type: "inconsistency",
        severity: "medium",
        message: "Services selected but no measurements taken",
        affectedSteps: ["service-selection", "measurements"],
        suggestedAction: "Take measurements for selected services",
        canAutoFix: false,
      });
    }

    // Pricing calculation warnings
    if (
      flowData.measurements.totalSquareFeet > 0 &&
      flowData.pricingData.totalCost === 0
    ) {
      warnings.push({
        id: "measurements-no-pricing",
        type: "dependency",
        severity: "medium",
        message: "Measurements taken but pricing not calculated",
        affectedSteps: ["measurements", "pricing"],
        suggestedAction: "Calculate pricing based on measurements",
        canAutoFix: true,
        autoFixAction: () => this.triggerPricingCalculation(flowData),
      });
    }
  }

  /**
   * Trigger automatic pricing calculation
   */
  private async triggerPricingCalculation(
    flowData: GuidedFlowData,
  ): Promise<void> {
    // This would integrate with the pricing service
    // For now, just update the timestamp to indicate recalculation needed
    flowData.metadata.updatedAt = new Date();
  }

  // ================================
  // DEPENDENCY TRACKING METHODS
  // ================================

  /**
   * Initialize dependency tracking rules
   */
  private initializeDependencyTracking(): void {
    const rules: DependencyRule[] = [
      {
        id: "service-to-measurements",
        sourceStep: "service-selection",
        sourceField: "selectedServices",
        targetSteps: ["measurements"],
        type: "auto-populate",
        priority: "high",
        transformer: (services: ServiceType[]) => {
          return {
            requiredMeasurements: services
              .map((s) => s.measurementRequirements)
              .flat(),
          };
        },
      },
      {
        id: "measurements-to-pricing",
        sourceStep: "measurements",
        sourceField: "totalSquareFeet",
        targetSteps: ["pricing"],
        type: "recalculate",
        priority: "high",
      },
    ];

    rules.forEach((rule) => {
      const key = `${rule.sourceStep}.${rule.sourceField}`;
      if (!this.dependencyRules.has(key)) {
        this.dependencyRules.set(key, []);
      }
      this.dependencyRules.get(key)!.push(rule);
    });
  }

  /**
   * Process dependency updates
   */
  async processDependencyUpdate(
    sourceStep: string,
    sourceField: string,
    value: any,
    flowData: GuidedFlowData,
    userId: string,
  ): Promise<DependencyUpdate[]> {
    const key = `${sourceStep}.${sourceField}`;
    const rules = this.dependencyRules.get(key) || [];
    const updates: DependencyUpdate[] = [];

    for (const rule of rules) {
      if (rule.condition && !rule.condition(value, flowData)) {
        continue;
      }

      const transformedValue = rule.transformer
        ? rule.transformer(value, flowData)
        : value;

      const update: DependencyUpdate = {
        sourceStep,
        sourceField,
        value: transformedValue,
        affectedSteps: rule.targetSteps,
        updateType: rule.type,
        timestamp: new Date(),
      };

      updates.push(update);

      // Apply the update based on type
      switch (rule.type) {
        case "auto-populate":
          await this.applyAutoPopulation(rule, transformedValue, flowData);
          break;
        case "recalculate":
          await this.triggerRecalculation(rule, flowData);
          break;
        case "validate":
          await this.validateStep(rule.targetSteps[0], flowData);
          break;
      }
    }

    // Auto-save after dependency updates
    if (updates.length > 0) {
      await this.autoSave(
        flowData.estimateId,
        flowData,
        userId,
        "Dependency updates applied",
      );
    }

    return updates;
  }

  private async applyAutoPopulation(
    rule: DependencyRule,
    value: any,
    flowData: GuidedFlowData,
  ): Promise<void> {
    // Apply auto-population logic based on target steps
    // This would integrate with specific step data structures
  }

  private async triggerRecalculation(
    rule: DependencyRule,
    flowData: GuidedFlowData,
  ): Promise<void> {
    // Trigger recalculation for target steps
    flowData.metadata.updatedAt = new Date();
  }

  // ================================
  // SESSION MANAGEMENT METHODS
  // ================================

  /**
   * Initialize auto-save for an estimate
   */
  private initializeAutoSave(estimateId: string, userId: string): void {
    this.autoSaveStates.set(estimateId, {
      lastSaved: new Date(),
      isDirty: false,
      isSaving: false,
      saveError: null,
      conflictDetected: false,
      localVersion: 1,
      serverVersion: 1,
      lastSaveAttempt: null,
    });
  }

  /**
   * Auto-save flow data
   */
  async autoSave(
    estimateId: string,
    flowData: GuidedFlowData,
    userId: string,
    changeDescription: string = "Auto-save",
  ): Promise<void> {
    const state = this.autoSaveStates.get(estimateId);
    if (!state || state.isSaving) return;

    state.isSaving = true;
    state.lastSaveAttempt = new Date();

    try {
      const supabase = createClient();

      // Save to database
      const { error } = await supabase.from("session_drafts").upsert({
        id: estimateId,
        estimate_id: estimateId,
        user_id: userId,
        session_id: this.generateSessionId(),
        current_step: flowData.currentStep,
        data: flowData,
        updated_at: new Date().toISOString(),
        change_description: changeDescription,
      });

      if (error) {
        throw error;
      }

      state.lastSaved = new Date();
      state.isDirty = false;
      state.saveError = null;
      state.serverVersion++;
    } catch (error) {
      state.saveError = error instanceof Error ? error.message : "Save failed";
      console.error("Auto-save failed:", error);
    } finally {
      state.isSaving = false;
    }
  }

  /**
   * Recover session data
   */
  async recoverSession(
    estimateId: string,
    userId: string,
  ): Promise<SessionDraft | null> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("session_drafts")
        .select()
        .eq("estimate_id", estimateId)
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        estimateId: data.estimate_id,
        userId: data.user_id,
        sessionId: data.session_id,
        currentStep: data.current_step,
        data: data.data as GuidedFlowData,
        progress: {
          completedSteps: data.data?.completedSteps || [],
          currentStepIndex: this.defaultSteps.findIndex(
            (s) => s.id === data.current_step,
          ),
          totalSteps: this.defaultSteps.length,
          progressPercentage: Math.round(
            ((data.data?.completedSteps?.length || 0) /
              this.defaultSteps.length) *
              100,
          ),
        },
        metadata: {
          lastActivity: new Date(data.updated_at),
          browserInfo: {
            userAgent: "",
            platform: "",
            url: "",
          },
          autoSaveEnabled: true,
          isActive: true,
        },
        recovery: {
          source: "auto-save",
          recoveryAttempts: 0,
        },
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        expiresAt: new Date(
          Date.now() + this.config.maxDraftAge * 60 * 60 * 1000,
        ),
      };
    } catch (error) {
      console.error("Session recovery failed:", error);
      return null;
    }
  }

  /**
   * Get auto-save state
   */
  getAutoSaveState(estimateId: string): AutoSaveState | null {
    return this.autoSaveStates.get(estimateId) || null;
  }

  /**
   * Mark flow as dirty (needs saving)
   */
  markDirty(estimateId: string): void {
    const state = this.autoSaveStates.get(estimateId);
    if (state) {
      state.isDirty = true;
    }
  }

  // ================================
  // UTILITY METHODS
  // ================================

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up expired drafts
   */
  async cleanupExpiredDrafts(): Promise<void> {
    try {
      const supabase = createClient();
      const expiryDate = new Date(
        Date.now() - this.config.maxDraftAge * 60 * 60 * 1000,
      );

      await supabase
        .from("session_drafts")
        .delete()
        .lt("updated_at", expiryDate.toISOString());
    } catch (error) {
      console.error("Draft cleanup failed:", error);
    }
  }

  // ================================
  // CROSS-STEP VALIDATION METHODS (for test compatibility)
  // ================================

  /**
   * Validate cross-step dependencies
   */
  async validateCrossStepDependencies(
    flowData: GuidedFlowData,
  ): Promise<CrossStepValidationResult> {
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const suggestions: ValidationSuggestion[] = [];
    const blockedSteps: string[] = [];

    // Perform cross-step validation
    await this.performCrossStepValidation(
      flowData,
      warnings,
      errors,
      suggestions,
    );

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      suggestions,
      blockedSteps,
      confidence: errors.length === 0 ? "high" : "low",
      lastValidated: new Date(),
    };
  }

  // ================================
  // REAL-TIME VALIDATION METHODS
  // ================================

  private validationListeners = new Map<
    string,
    ((result: CrossStepValidationResult) => void)[]
  >();
  private validationTimers = new Map<string, NodeJS.Timeout>();
  public isValidating = false;

  /**
   * Subscribe to validation updates
   */
  subscribe(
    sessionId: string,
    callback: (result: CrossStepValidationResult) => void,
  ): void {
    if (!this.validationListeners.has(sessionId)) {
      this.validationListeners.set(sessionId, []);
    }
    this.validationListeners.get(sessionId)!.push(callback);
  }

  /**
   * Start real-time validation
   */
  startRealTimeValidation(sessionId: string, flowData: GuidedFlowData): void {
    this.isValidating = true;

    // Set up validation interval
    const timer = setInterval(async () => {
      const result = await this.validateCrossStepDependencies(flowData);
      this.notifyListeners(sessionId, result);
    }, 5000); // 5 second interval

    this.validationTimers.set(sessionId, timer);
  }

  /**
   * Stop real-time validation
   */
  stopRealTimeValidation(sessionId: string): void {
    const timer = this.validationTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.validationTimers.delete(sessionId);
    }

    // Check if any sessions are still validating
    this.isValidating = this.validationTimers.size > 0;
  }

  /**
   * Notify validation change
   */
  async notifyValidationChange(
    sessionId: string,
    flowData: GuidedFlowData,
  ): Promise<void> {
    const result = await this.validateCrossStepDependencies(flowData);
    this.notifyListeners(sessionId, result);
  }

  /**
   * Notify listeners
   */
  private notifyListeners(
    sessionId: string,
    result: CrossStepValidationResult,
  ): void {
    const listeners = this.validationListeners.get(sessionId) || [];
    listeners.forEach((callback) => callback(result));
  }

  /**
   * Add validation rule
   */
  addValidationRule(rule: any): void {
    // Store custom validation rules for step validation
    // Implementation would depend on specific requirements
  }

  /**
   * Remove validation rule
   */
  removeValidationRule(ruleId: string): void {
    // Remove custom validation rules
    // Implementation would depend on specific requirements
  }

  /**
   * Cleanup validation resources
   */
  cleanup(): void {
    // Stop all validation timers
    this.validationTimers.forEach((timer) => clearInterval(timer));
    this.validationTimers.clear();
    this.validationListeners.clear();
    this.isValidating = false;
  }

  // ================================
  // LEGACY COMPATIBILITY METHODS
  // ================================

  /**
   * Initialize service (legacy compatibility)
   */
  async initialize(): Promise<void> {
    // Initialize dependency tracking
    this.initializeDependencyTracking();
  }

  /**
   * Save draft (legacy compatibility)
   */
  async saveDraft(
    estimateId: string,
    flowData: GuidedFlowData,
    userId: string,
  ): Promise<void> {
    await this.autoSave(estimateId, flowData, userId, "Manual save");
  }

  /**
   * Get recoverable sessions (legacy compatibility)
   */
  async getRecoverableSessions(userId: string): Promise<SessionDraft[]> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("session_drafts")
        .select()
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching recoverable sessions:", error);
        return [];
      }

      return (data || []).map((draft) => ({
        id: draft.id,
        estimateId: draft.estimate_id,
        userId: draft.user_id,
        sessionId: draft.session_id,
        currentStep: draft.current_step,
        data: draft.data as GuidedFlowData,
        progress: {
          completedSteps: draft.data?.completedSteps || [],
          currentStepIndex: this.defaultSteps.findIndex(
            (s) => s.id === draft.current_step,
          ),
          totalSteps: this.defaultSteps.length,
          progressPercentage: Math.round(
            ((draft.data?.completedSteps?.length || 0) /
              this.defaultSteps.length) *
              100,
          ),
        },
        metadata: {
          lastActivity: new Date(draft.updated_at),
          browserInfo: {
            userAgent: "",
            platform: "",
            url: "",
          },
          autoSaveEnabled: true,
          isActive: true,
        },
        recovery: {
          source: "auto-save",
          recoveryAttempts: 0,
        },
        createdAt: new Date(draft.created_at),
        updatedAt: new Date(draft.updated_at),
        expiresAt: new Date(
          Date.now() + this.config.maxDraftAge * 60 * 60 * 1000,
        ),
      }));
    } catch (error) {
      console.error("Failed to get recoverable sessions:", error);
      return [];
    }
  }
}

// Export singleton instance
export const unifiedWorkflowService = new UnifiedWorkflowService();

// Legacy exports for backward compatibility
export { unifiedWorkflowService as workflowService };
export { unifiedWorkflowService as WorkflowService };
export { unifiedWorkflowService as CrossStepValidationService };
export { unifiedWorkflowService as DependencyTrackingService };
export { unifiedWorkflowService as SessionRecoveryService };
export { unifiedWorkflowService as AutoSaveService };
