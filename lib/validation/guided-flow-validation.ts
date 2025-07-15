import { z } from 'zod';

// Step validation schemas
export const InitialContactValidationSchema = z.object({
  contactMethod: z.enum(['email', 'meeting', 'phone', 'walkin']),
  originalContent: z.string().min(10, 'Content must be at least 10 characters'),
  extractedData: z.object({
    customer: z.object({
      name: z.string().min(2, 'Customer name is required'),
      email: z.string().email('Valid email is required').optional(),
      phone: z.string().min(10, 'Valid phone number is required').optional(),
    }),
    requirements: z.object({
      services: z.array(z.string()).min(1, 'At least one service must be specified'),
      buildingType: z.string().min(1, 'Building type is required'),
    }).optional(),
  }).optional(),
});

export const ScopeDetailsValidationSchema = z.object({
  selectedServices: z.array(z.string()).min(1, 'At least one service must be selected'),
  serviceOrder: z.array(z.string()),
  autoAddedServices: z.array(z.string()),
  overrides: z.record(z.object({
    price: z.number().positive().optional(),
    reason: z.string().optional(),
  })),
  scopeNotes: z.string().optional(),
  accessRestrictions: z.array(z.string()),
  specialRequirements: z.array(z.string()),
});

export const FilesPhotosValidationSchema = z.object({
  files: z.array(z.object({
    id: z.string(),
    type: z.enum(['photo', 'video', 'area_map', 'measurement_screenshot', 'plan']),
    status: z.enum(['pending', 'analyzing', 'complete', 'error']),
  })).min(1, 'At least one file must be uploaded'),
  analysisComplete: z.boolean(),
  summary: z.object({
    totalPhotos: z.number().min(1, 'At least one photo is required for analysis'),
    analyzedPhotos: z.number(),
    totalWindows: z.number().optional(),
    totalArea: z.number().optional(),
  }),
});

export const AreaOfWorkValidationSchema = z.object({
  workAreas: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, 'Area name is required'),
    area: z.number().positive('Area must be greater than 0'),
    perimeter: z.number().positive('Perimeter must be greater than 0'),
  })).min(1, 'At least one work area must be defined'),
  scale: z.object({
    pixelsPerFoot: z.number().positive('Scale must be set'),
    isSet: z.boolean().refine(val => val === true, 'Scale must be properly set'),
  }),
  notes: z.string().optional(),
  backgroundImage: z.string().min(1, 'Background image is required'),
});

export const TakeoffValidationSchema = z.object({
  measurements: z.array(z.object({
    category: z.string().min(1, 'Category is required'),
    subcategory: z.string().min(1, 'Subcategory is required'),
    quantity: z.number().positive('Quantity must be greater than 0'),
    unit: z.string().min(1, 'Unit is required'),
    notes: z.string().optional(),
  })).min(1, 'At least one measurement is required'),
  totalQuantities: z.record(z.number()),
  qualityFactors: z.object({
    accessibility: z.enum(['easy', 'moderate', 'difficult']),
    complexity: z.enum(['simple', 'moderate', 'complex']),
    safetyRisk: z.enum(['low', 'medium', 'high']),
  }),
});

export const DurationValidationSchema = z.object({
  timeline: z.object({
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    totalDays: z.number().positive('Duration must be greater than 0'),
  }),
  weatherAnalysis: z.object({
    riskLevel: z.enum(['low', 'medium', 'high']),
    recommendations: z.array(z.string()),
  }).optional(),
  manualOverrides: z.array(z.object({
    service: z.string(),
    originalDuration: z.number(),
    adjustedDuration: z.number(),
    reason: z.string().min(1, 'Override reason is required'),
  })),
});

export const ExpensesValidationSchema = z.object({
  equipment: z.array(z.object({
    item: z.string().min(1, 'Equipment item is required'),
    cost: z.number().positive('Cost must be greater than 0'),
    quantity: z.number().positive('Quantity must be greater than 0'),
  })),
  materials: z.array(z.object({
    item: z.string().min(1, 'Material item is required'),
    cost: z.number().positive('Cost must be greater than 0'),
    quantity: z.number().positive('Quantity must be greater than 0'),
  })),
  labor: z.array(z.object({
    role: z.string().min(1, 'Labor role is required'),
    hours: z.number().positive('Hours must be greater than 0'),
    rate: z.number().positive('Rate must be greater than 0'),
  })),
  totalCosts: z.object({
    equipment: z.number().nonnegative(),
    materials: z.number().nonnegative(),
    labor: z.number().positive('Labor cost is required'),
    other: z.number().nonnegative(),
    grand: z.number().positive('Total cost must be greater than 0'),
  }),
});

export const PricingValidationSchema = z.object({
  strategy: z.enum(['competitive', 'value_based', 'cost_plus']),
  basePrice: z.number().positive('Base price must be greater than 0'),
  adjustments: z.array(z.object({
    type: z.string(),
    amount: z.number(),
    reason: z.string(),
  })),
  finalPrice: z.number().positive('Final price must be greater than 0'),
  profitMargin: z.number().min(0, 'Profit margin cannot be negative').max(100, 'Profit margin cannot exceed 100%'),
  competitiveAnalysis: z.object({
    marketRate: z.number().positive().optional(),
    winProbability: z.number().min(0).max(100).optional(),
  }).optional(),
});

export const SummaryValidationSchema = z.object({
  customerApproval: z.boolean().refine(val => val === true, 'Customer approval is required'),
  proposalFormat: z.enum(['pdf', 'word', 'html']),
  deliveryMethod: z.enum(['email', 'print', 'portal']),
  followUpDate: z.string().min(1, 'Follow-up date is required'),
  terms: z.object({
    paymentTerms: z.string().min(1, 'Payment terms are required'),
    warranty: z.string().min(1, 'Warranty terms are required'),
    validUntil: z.string().min(1, 'Proposal validity date is required'),
  }),
});

// Step validation function
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class GuidedFlowValidator {
  static validateStep(stepNumber: number, data: any): ValidationResult {
    const schemas = [
      InitialContactValidationSchema,
      ScopeDetailsValidationSchema, 
      FilesPhotosValidationSchema,
      AreaOfWorkValidationSchema,
      TakeoffValidationSchema,
      DurationValidationSchema,
      ExpensesValidationSchema,
      PricingValidationSchema,
      SummaryValidationSchema,
    ];

    const schema = schemas[stepNumber - 1];
    if (!schema) {
      return {
        isValid: false,
        errors: ['Invalid step number'],
        warnings: [],
      };
    }

    try {
      schema.parse(data);
      return {
        isValid: true,
        errors: [],
        warnings: this.getStepWarnings(stepNumber, data),
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        return {
          isValid: false,
          errors,
          warnings: this.getStepWarnings(stepNumber, data),
        };
      }
      return {
        isValid: false,
        errors: ['Unknown validation error'],
        warnings: [],
      };
    }
  }

  static validateAllSteps(flowData: any): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    for (let i = 1; i <= 9; i++) {
      const stepData = this.getStepData(i, flowData);
      if (stepData) {
        const result = this.validateStep(i, stepData);
        allErrors.push(...result.errors.map(err => `Step ${i}: ${err}`));
        allWarnings.push(...result.warnings.map(warn => `Step ${i}: ${warn}`));
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  static getStepData(stepNumber: number, flowData: any): any {
    const stepDataKeys = [
      'initialContact',
      'scopeDetails', 
      'filesPhotos',
      'areaOfWork',
      'takeoff',
      'duration',
      'expenses',
      'pricing',
      'summary',
    ];

    const key = stepDataKeys[stepNumber - 1];
    return flowData[key];
  }

  static getStepWarnings(stepNumber: number, data: any): string[] {
    const warnings: string[] = [];

    switch (stepNumber) {
      case 1: // Initial Contact
        if (!data.extractedData?.customer?.email && !data.extractedData?.customer?.phone) {
          warnings.push('No contact information extracted - consider manual entry');
        }
        break;

      case 2: // Scope Details
        if (data.selectedServices.length > 5) {
          warnings.push('Many services selected - ensure proper scheduling coordination');
        }
        break;

      case 3: // Files/Photos
        if (data.summary.analyzedPhotos < data.summary.totalPhotos) {
          warnings.push('Not all photos have been analyzed - some estimates may be incomplete');
        }
        break;

      case 4: // Area of Work
        if (data.workAreas.some((area: any) => area.area > 50000)) {
          warnings.push('Large work areas detected - consider dividing into smaller sections');
        }
        break;

      case 5: // Takeoff
        if (data.measurements.length < 3) {
          warnings.push('Limited measurements - consider adding more detail for accuracy');
        }
        break;

      case 6: // Duration
        if (data.timeline.totalDays > 30) {
          warnings.push('Long project duration - consider milestone scheduling');
        }
        break;

      case 7: // Expenses
        if (data.totalCosts.grand > 100000) {
          warnings.push('High-value project - ensure thorough review before submission');
        }
        break;

      case 8: // Pricing
        if (data.profitMargin < 15) {
          warnings.push('Low profit margin - verify cost calculations');
        }
        break;

      case 9: // Summary
        // No specific warnings for summary step
        break;
    }

    return warnings;
  }

  static canProgressToStep(currentStep: number, flowData: any): ValidationResult {
    if (currentStep === 1) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const previousStepData = this.getStepData(currentStep - 1, flowData);
    if (!previousStepData) {
      return {
        isValid: false,
        errors: ['Previous step data is missing'],
        warnings: [],
      };
    }

    return this.validateStep(currentStep - 1, previousStepData);
  }

  static getStepCompletionStatus(flowData: any): boolean[] {
    const completionStatus: boolean[] = [];

    for (let i = 1; i <= 9; i++) {
      const stepData = this.getStepData(i, flowData);
      if (stepData) {
        const validation = this.validateStep(i, stepData);
        completionStatus.push(validation.isValid);
      } else {
        completionStatus.push(false);
      }
    }

    return completionStatus;
  }
}

// Export step names for UI
export const STEP_NAMES = [
  'Initial Contact',
  'Scope Details', 
  'Files & Photos',
  'Area of Work',
  'Takeoff',
  'Duration',
  'Expenses',
  'Pricing',
  'Summary',
];

export const STEP_DESCRIPTIONS = [
  'Extract customer information and requirements',
  'Define services and scope of work',
  'Upload and analyze building photos',
  'Map work areas and measurements',
  'Detailed quantity takeoffs',
  'Project timeline and scheduling',
  'Cost breakdown and expenses',
  'Pricing strategy and final quote',
  'Review and generate proposal',
];