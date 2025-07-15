// Workflow service layer for guided estimation flows

import { supabase } from '@/lib/supabase/client';
import { withDatabaseRetry } from '@/lib/utils/retry-logic';
import { isNotNull, safeString, safeNumber, withDefaultArray } from '@/lib/utils/null-safety';
import { invalidateCache } from '@/lib/utils/cache';
import {
  GuidedFlowData,
  ServiceType,
  AIExtractedData,
  ServiceDependency,
  WorkArea,
  TakeoffData,
  WeatherAnalysis,
  PricingCalculation,
  FinalEstimate
} from '@/lib/types/estimate-types';

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  isRequired: boolean;
  isCompleted: boolean;
  data?: any;
  validationRules?: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export interface WorkflowProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  availableSteps: string[];
  completionPercentage: number;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  canProceed: boolean;
}

export class WorkflowService {
  private static readonly WORKFLOW_STEPS: WorkflowStep[] = [
    {
      id: 'initial-contact',
      title: 'Initial Contact',
      description: 'Capture initial customer contact and project information',
      isRequired: true,
      isCompleted: false,
      validationRules: [
        { field: 'contactMethod', type: 'required', message: 'Contact method is required' },
        { field: 'contactDate', type: 'required', message: 'Contact date is required' }
      ]
    },
    {
      id: 'scope-details',
      title: 'Scope Details',
      description: 'Define project scope and select services',
      isRequired: true,
      isCompleted: false,
      validationRules: [
        { field: 'selectedServices', type: 'required', message: 'At least one service must be selected' },
        { 
          field: 'selectedServices', 
          type: 'custom', 
          message: 'Selected services must be valid',
          validator: (value: string[]) => Array.isArray(value) && value.length > 0
        }
      ]
    },
    {
      id: 'files-photos',
      title: 'Files & Photos',
      description: 'Upload project files and photos for analysis',
      isRequired: false,
      isCompleted: false,
      validationRules: []
    },
    {
      id: 'area-of-work',
      title: 'Area of Work',
      description: 'Define work areas and measurements',
      isRequired: true,
      isCompleted: false,
      validationRules: [
        { field: 'workAreas', type: 'required', message: 'At least one work area is required' }
      ]
    },
    {
      id: 'takeoff',
      title: 'Takeoff',
      description: 'Detailed measurements and quantity takeoffs',
      isRequired: true,
      isCompleted: false,
      validationRules: [
        { field: 'takeoffData', type: 'required', message: 'Takeoff data is required' }
      ]
    },
    {
      id: 'duration',
      title: 'Duration',
      description: 'Estimate project duration and timeline',
      isRequired: true,
      isCompleted: false,
      validationRules: [
        { field: 'estimatedDuration', type: 'required', message: 'Estimated duration is required' },
        { 
          field: 'estimatedDuration', 
          type: 'custom', 
          message: 'Duration must be greater than 0',
          validator: (value: number) => safeNumber(value) > 0
        }
      ]
    },
    {
      id: 'expenses',
      title: 'Expenses',
      description: 'Calculate equipment and material costs',
      isRequired: true,
      isCompleted: false,
      validationRules: [
        { field: 'equipmentCosts', type: 'required', message: 'Equipment costs are required' },
        { field: 'materialCosts', type: 'required', message: 'Material costs are required' }
      ]
    },
    {
      id: 'pricing',
      title: 'Pricing',
      description: 'Calculate final pricing and apply adjustments',
      isRequired: true,
      isCompleted: false,
      validationRules: [
        { field: 'pricingCalculations', type: 'required', message: 'Pricing calculations are required' }
      ]
    },
    {
      id: 'summary',
      title: 'Summary',
      description: 'Review and finalize estimate',
      isRequired: true,
      isCompleted: false,
      validationRules: [
        { field: 'finalEstimate', type: 'required', message: 'Final estimate is required' }
      ]
    }
  ];

  // Workflow management methods
  static getWorkflowSteps(): WorkflowStep[] {
    return [...this.WORKFLOW_STEPS];
  }

  static getStepById(stepId: string): WorkflowStep | null {
    return this.WORKFLOW_STEPS.find(step => step.id === stepId) || null;
  }

  static getStepByIndex(index: number): WorkflowStep | null {
    return this.WORKFLOW_STEPS[index] || null;
  }

  static getStepIndex(stepId: string): number {
    return this.WORKFLOW_STEPS.findIndex(step => step.id === stepId);
  }

  static getNextStep(currentStepId: string): WorkflowStep | null {
    const currentIndex = this.getStepIndex(currentStepId);
    return currentIndex >= 0 && currentIndex < this.WORKFLOW_STEPS.length - 1
      ? this.WORKFLOW_STEPS[currentIndex + 1]
      : null;
  }

  static getPreviousStep(currentStepId: string): WorkflowStep | null {
    const currentIndex = this.getStepIndex(currentStepId);
    return currentIndex > 0 ? this.WORKFLOW_STEPS[currentIndex - 1] : null;
  }

  static calculateProgress(guidedFlowData: GuidedFlowData): WorkflowProgress {
    const totalSteps = this.WORKFLOW_STEPS.length;
    const completedSteps: string[] = [];
    const availableSteps: string[] = [];

    // Check which steps are completed
    this.WORKFLOW_STEPS.forEach(step => {
      const stepData = guidedFlowData[step.id as keyof GuidedFlowData];
      const isCompleted = this.isStepCompleted(step.id, stepData);
      
      if (isCompleted) {
        completedSteps.push(step.id);
      }
      
      // Step is available if it's not required to be sequential or previous steps are completed
      const isAvailable = this.isStepAvailable(step.id, guidedFlowData);
      if (isAvailable) {
        availableSteps.push(step.id);
      }
    });

    const completionPercentage = (completedSteps.length / totalSteps) * 100;
    const currentStep = completedSteps.length + 1;

    return {
      currentStep: Math.min(currentStep, totalSteps),
      totalSteps,
      completedSteps,
      availableSteps,
      completionPercentage
    };
  }

  // Step validation methods
  static validateStep(stepId: string, data: any): WorkflowValidationResult {
    const step = this.getStepById(stepId);
    if (!step) {
      return {
        isValid: false,
        errors: { general: ['Invalid step ID'] },
        warnings: {},
        canProceed: false
      };
    }

    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};

    // Run validation rules
    step.validationRules?.forEach(rule => {
      const fieldValue = data?.[rule.field];
      const fieldErrors: string[] = [];

      switch (rule.type) {
        case 'required':
          if (!fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0)) {
            fieldErrors.push(rule.message);
          }
          break;
        
        case 'minLength':
          if (safeString(fieldValue).length < (rule.value || 0)) {
            fieldErrors.push(rule.message);
          }
          break;
        
        case 'maxLength':
          if (safeString(fieldValue).length > (rule.value || 0)) {
            fieldErrors.push(rule.message);
          }
          break;
        
        case 'pattern':
          if (rule.value && !new RegExp(rule.value).test(safeString(fieldValue))) {
            fieldErrors.push(rule.message);
          }
          break;
        
        case 'custom':
          if (rule.validator && !rule.validator(fieldValue)) {
            fieldErrors.push(rule.message);
          }
          break;
      }

      if (fieldErrors.length > 0) {
        errors[rule.field] = fieldErrors;
      }
    });

    // Step-specific validation
    const stepValidation = this.validateStepData(stepId, data);
    Object.keys(stepValidation.errors).forEach(field => {
      errors[field] = [...(errors[field] || []), ...stepValidation.errors[field]];
    });
    Object.keys(stepValidation.warnings).forEach(field => {
      warnings[field] = [...(warnings[field] || []), ...stepValidation.warnings[field]];
    });

    const isValid = Object.keys(errors).length === 0;
    const canProceed = isValid || !step.isRequired;

    return {
      isValid,
      errors,
      warnings,
      canProceed
    };
  }

  static validateEntireWorkflow(guidedFlowData: GuidedFlowData): WorkflowValidationResult {
    const allErrors: Record<string, string[]> = {};
    const allWarnings: Record<string, string[]> = {};

    // Validate each step
    this.WORKFLOW_STEPS.forEach(step => {
      const stepData = guidedFlowData[step.id as keyof GuidedFlowData];
      const stepValidation = this.validateStep(step.id, stepData);

      Object.keys(stepValidation.errors).forEach(field => {
        const key = `${step.id}.${field}`;
        allErrors[key] = stepValidation.errors[field];
      });

      Object.keys(stepValidation.warnings).forEach(field => {
        const key = `${step.id}.${field}`;
        allWarnings[key] = stepValidation.warnings[field];
      });
    });

    // Cross-step validation
    const crossValidation = this.validateCrossStepDependencies(guidedFlowData);
    Object.keys(crossValidation.errors).forEach(field => {
      allErrors[field] = crossValidation.errors[field];
    });
    Object.keys(crossValidation.warnings).forEach(field => {
      allWarnings[field] = crossValidation.warnings[field];
    });

    const isValid = Object.keys(allErrors).length === 0;
    const canProceed = isValid;

    return {
      isValid,
      errors: allErrors,
      warnings: allWarnings,
      canProceed
    };
  }

  // Database operations
  static async saveWorkflowProgress(
    userId: string,
    estimateId: string,
    guidedFlowData: GuidedFlowData,
    currentStep: number
  ): Promise<boolean> {
    const result = await withDatabaseRetry(async () => {
      const { error } = await supabase
        .from('estimation_flows')
        .upsert({
          user_id: userId,
          estimate_id: estimateId,
          flow_data: guidedFlowData,
          current_step: currentStep,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    });

    if (result.success) {
      invalidateCache.estimationFlow(estimateId);
    }

    return result.success;
  }

  static async loadWorkflowProgress(estimateId: string): Promise<{
    guidedFlowData: GuidedFlowData;
    currentStep: number;
  } | null> {
    const result = await withDatabaseRetry(async () => {
      const { data, error } = await supabase
        .from('estimation_flows')
        .select('flow_data, current_step')
        .eq('estimate_id', estimateId)
        .single();

      if (error) throw error;
      return data;
    });

    if (result.success && result.data) {
      return {
        guidedFlowData: result.data.flow_data || {},
        currentStep: result.data.current_step || 1
      };
    }

    return null;
  }

  static async deleteWorkflowProgress(estimateId: string): Promise<boolean> {
    const result = await withDatabaseRetry(async () => {
      const { error } = await supabase
        .from('estimation_flows')
        .delete()
        .eq('estimate_id', estimateId);

      if (error) throw error;
      return true;
    });

    if (result.success) {
      invalidateCache.estimationFlow(estimateId);
    }

    return result.success;
  }

  // Business logic methods
  static generateServiceDependencies(selectedServices: ServiceType[]): ServiceDependency[] {
    const dependencies: ServiceDependency[] = [];
    
    // Define service dependencies
    const dependencyMap = {
      'glass-restoration': ['window-cleaning'],
      'frame-restoration': ['window-cleaning'],
      'pressure-wash-seal': ['pressure-washing'],
      'final-clean': ['high-dusting', 'window-cleaning'],
      'granite-reconditioning': ['pressure-washing']
    };

    selectedServices.forEach(service => {
      const requiredServices = dependencyMap[service as keyof typeof dependencyMap];
      if (requiredServices) {
        requiredServices.forEach(required => {
          if (selectedServices.includes(required as ServiceType)) {
            dependencies.push({
              service: service,
              dependsOn: required as ServiceType,
              type: 'prerequisite',
              description: `${service} should be performed after ${required}`
            });
          }
        });
      }
    });

    return dependencies;
  }

  static calculateEstimatedDuration(
    workAreas: WorkArea[],
    selectedServices: ServiceType[]
  ): number {
    let totalDuration = 0;

    workAreas.forEach(area => {
      selectedServices.forEach(service => {
        // Base duration rates (hours per sq ft)
        const durationRates = {
          'window-cleaning': 0.01,
          'pressure-washing': 0.005,
          'soft-washing': 0.007,
          'biofilm-removal': 0.02,
          'glass-restoration': 0.04,
          'frame-restoration': 0.03,
          'high-dusting': 0.003,
          'final-clean': 0.002,
          'granite-reconditioning': 0.015,
          'pressure-wash-seal': 0.01,
          'parking-deck': 0.003
        };

        const rate = durationRates[service];
        const areaDuration = (area.measurements?.totalArea || 0) * rate;
        totalDuration += areaDuration;
      });
    });

    // Add setup and breakdown time
    totalDuration += selectedServices.length * 2; // 2 hours per service for setup/breakdown

    return Math.max(totalDuration, 4); // Minimum 4 hours
  }

  static generateDefaultTakeoffData(workAreas: WorkArea[]): TakeoffData {
    const measurements = workAreas.reduce((acc, area) => {
      if (area.measurements) {
        acc.totalArea += area.measurements.totalArea || 0;
        acc.linearFeet += area.measurements.linearFeet || 0;
        acc.windowCount += area.measurements.windowCount || 0;
        acc.doorCount += area.measurements.doorCount || 0;
      }
      return acc;
    }, {
      totalArea: 0,
      linearFeet: 0,
      windowCount: 0,
      doorCount: 0
    });

    return {
      measurements,
      quantityBreakdown: workAreas.map(area => ({
        area: area.name,
        quantities: area.measurements || {}
      })),
      notes: 'Generated from work area measurements'
    };
  }

  // Private helper methods
  private static isStepCompleted(stepId: string, stepData: any): boolean {
    if (!stepData) return false;

    switch (stepId) {
      case 'initial-contact':
        return !!(stepData.contactMethod && stepData.contactDate);
      
      case 'scope-details':
        return !!(stepData.selectedServices && stepData.selectedServices.length > 0);
      
      case 'files-photos':
        return true; // Optional step
      
      case 'area-of-work':
        return !!(stepData.workAreas && stepData.workAreas.length > 0);
      
      case 'takeoff':
        return !!stepData.takeoffData;
      
      case 'duration':
        return !!(stepData.estimatedDuration && stepData.estimatedDuration > 0);
      
      case 'expenses':
        return !!(stepData.equipmentCosts && stepData.materialCosts);
      
      case 'pricing':
        return !!stepData.pricingCalculations;
      
      case 'summary':
        return !!(stepData.finalEstimate && stepData.proposalGenerated);
      
      default:
        return false;
    }
  }

  private static isStepAvailable(stepId: string, guidedFlowData: GuidedFlowData): boolean {
    const stepIndex = this.getStepIndex(stepId);
    if (stepIndex === 0) return true; // First step is always available

    // Check if previous required steps are completed
    for (let i = 0; i < stepIndex; i++) {
      const prevStep = this.WORKFLOW_STEPS[i];
      if (prevStep.isRequired) {
        const prevStepData = guidedFlowData[prevStep.id as keyof GuidedFlowData];
        if (!this.isStepCompleted(prevStep.id, prevStepData)) {
          return false;
        }
      }
    }

    return true;
  }

  private static validateStepData(stepId: string, data: any): {
    errors: Record<string, string[]>;
    warnings: Record<string, string[]>;
  } {
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};

    switch (stepId) {
      case 'scope-details':
        if (data?.selectedServices && data.selectedServices.length > 5) {
          warnings.selectedServices = ['Many services selected - consider project complexity'];
        }
        break;
      
      case 'duration':
        if (data?.estimatedDuration && data.estimatedDuration > 80) {
          warnings.estimatedDuration = ['Long project duration - consider breaking into phases'];
        }
        break;
      
      case 'expenses':
        if (data?.equipmentCosts && data.materialCosts) {
          const totalCosts = safeNumber(data.equipmentCosts) + safeNumber(data.materialCosts);
          if (totalCosts > 10000) {
            warnings.totalCosts = ['High material/equipment costs - verify estimates'];
          }
        }
        break;
    }

    return { errors, warnings };
  }

  private static validateCrossStepDependencies(guidedFlowData: GuidedFlowData): {
    errors: Record<string, string[]>;
    warnings: Record<string, string[]>;
  } {
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};

    // Check service dependencies
    const scopeData = guidedFlowData.scopeDetails;
    if (scopeData?.selectedServices) {
      const dependencies = this.generateServiceDependencies(scopeData.selectedServices);
      if (dependencies.length > 0) {
        warnings['cross-step.dependencies'] = [
          `Service dependencies detected: ${dependencies.length} dependencies to consider`
        ];
      }
    }

    // Check duration vs work areas
    const durationData = guidedFlowData.duration;
    const areaData = guidedFlowData.areaOfWork;
    if (durationData?.estimatedDuration && areaData?.workAreas) {
      const calculatedDuration = this.calculateEstimatedDuration(
        areaData.workAreas, 
        scopeData?.selectedServices || []
      );
      const difference = Math.abs(durationData.estimatedDuration - calculatedDuration);
      if (difference > calculatedDuration * 0.5) {
        warnings['cross-step.duration'] = [
          'Estimated duration significantly differs from calculated duration'
        ];
      }
    }

    return { errors, warnings };
  }
}

export default WorkflowService;