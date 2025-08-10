import { z } from "zod";
import { EstimateService, EstimateStoreState } from "./estimate-store";

// Error types for better error handling
export class EstimateError extends Error {
  constructor(
    message: string,
    public code: EstimateErrorCode,
    public details?: unknown,
  ) {
    super(message);
    this.name = "EstimateError";
  }
}

export enum EstimateErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  CONFLICT = "CONFLICT",
  UNKNOWN = "UNKNOWN",
}

// Validation schemas
export const EstimateServiceSchema = z.object({
  id: z.string(),
  serviceType: z.string(),
  calculationResult: z.object({
    basePrice: z.number().min(0),
    area: z.number().min(0).optional(),
    laborHours: z.number().min(0).optional(),
    setupHours: z.number().min(0).optional(),
    rigHours: z.number().min(0).optional(),
    totalHours: z.number().min(0).optional(),
    crewSize: z.number().min(1).optional(),
    equipment: z
      .object({
        type: z.string().optional(),
        days: z.number().optional(),
        cost: z.number().optional(),
      })
      .optional(),
    breakdown: z.array(z.any()).optional(),
    warnings: z.array(z.string()).optional(),
  }),
  formData: z.record(z.any()),
});

export const EstimateSchema = z.object({
  id: z.string().optional(),
  quote_number: z.string().optional(),
  estimate_number: z.string().optional(),
  customer_name: z.string().min(1, "Customer name is required"),
  customer_email: z.string().email("Invalid email address"),
  customer_phone: z.string().min(10, "Phone number must be at least 10 digits"),
  company_name: z.string().optional(),
  building_name: z.string().min(1, "Building name is required"),
  building_address: z.string().min(1, "Building address is required"),
  building_height_stories: z.number().min(1).max(200),
  building_height_feet: z.number().optional(),
  building_type: z.string().optional(),
  total_price: z.number().min(0),
  status: z.enum(["draft", "sent", "approved", "rejected"]),
  notes: z.string().optional(),
  services: z.array(EstimateServiceSchema),
  estimation_flow_id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// Type guards
export function isEstimateError(error: unknown): error is EstimateError {
  return error instanceof EstimateError;
}

export function isValidEstimate(data: unknown): data is EstimateStoreState {
  try {
    EstimateSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

export function isValidEstimateService(data: unknown): data is EstimateService {
  try {
    EstimateServiceSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

// Validation helpers
export function validateEstimate(data: unknown): {
  success: boolean;
  data?: EstimateStoreState;
  errors?: z.ZodError;
} {
  try {
    const validated = EstimateSchema.parse(data);
    return { success: true, data: validated as EstimateStoreState };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

export function validateEstimateService(data: unknown): {
  success: boolean;
  data?: EstimateService;
  errors?: z.ZodError;
} {
  try {
    const validated = EstimateServiceSchema.parse(data);
    return { success: true, data: validated as EstimateService };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

// State types for better type safety
export type EstimateStatus = "draft" | "sent" | "approved" | "rejected";

export interface EstimateLoadingState {
  isLoading: boolean;
  isSaving: boolean;
  error: EstimateError | null;
}

export interface EstimateDataState {
  currentEstimate: EstimateStoreState | null;
  services: EstimateService[];
  hasUnsavedChanges: boolean;
  lastSaveTime: Date | null;
}

export interface GuidedFlowState {
  guidedFlowData: Record<string, any>;
  currentStep: number;
}

// Action types for better type safety
export interface EstimateActions {
  // Customer actions
  setCustomerInfo: (info: Partial<EstimateStoreState>) => void;

  // Service actions
  addService: (service: EstimateService) => void;
  removeService: (serviceId: string) => void;
  updateService: (serviceId: string, updates: Partial<EstimateService>) => void;
  clearServices: () => void;

  // Guided flow actions
  updateGuidedFlowData: (step: string, data: any) => void;
  setCurrentStep: (step: number) => void;
  resetGuidedFlow: () => void;

  // Estimate management
  createEstimate: () => Promise<string | null>;
  saveEstimate: () => Promise<boolean>;
  loadEstimate: (estimateId: string) => Promise<boolean>;

  // Auto-save
  autoSave: () => Promise<boolean>;
  debouncedAutoSave: () => void;

  // Error handling
  setError: (error: EstimateError | null) => void;
  clearError: () => void;

  // Calculations
  calculateTotal: () => number;
  generateEstimateNumber: () => string;

  // Cleanup
  cleanup: () => void;
}

// Combined store type
export type EstimateStore = EstimateLoadingState &
  EstimateDataState &
  GuidedFlowState &
  EstimateActions;
