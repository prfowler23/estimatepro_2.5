/**
 * Type definitions for guided flow data structures
 * Used in multi-step estimation workflows
 */

import type { ServiceType } from "./estimate-types";

// Step-specific data types

/**
 * Initial contact information collected at workflow start
 */
export interface InitialContactData {
  contactDate: string;
  contactMethod: string;
  initialNotes?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  companyName?: string;
}

/**
 * Files and photos uploaded during the workflow
 * Includes AI analysis results if available
 */
export interface FilesPhotosData {
  uploadedFiles: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: string;
  }>;
  photoAnalysis?: {
    buildingType?: string;
    estimatedHeight?: number;
    services?: string[];
    confidence?: number;
  };
}

/**
 * Work area definitions and measurements
 * Links areas to specific services
 */
export interface AreaOfWorkData {
  workAreas: Array<{
    id: string;
    name: string;
    sqft: number;
    services: ServiceType[];
    notes?: string;
  }>;
  totalSqft: number;
  buildingType?: string;
  buildingHeight?: number;
}

/**
 * Detailed takeoff measurements and data
 * Can be imported from various sources
 */
export interface TakeoffStepData {
  measurements: {
    [key: string]: {
      value: number;
      unit: string;
      notes?: string;
    };
  };
  importSource?: "manual" | "photo" | "drawing" | "ai";
  notes?: string;
  takeoffComplete: boolean;
}

export interface ScopeDetailsData {
  selectedServices: ServiceType[];
  serviceDependencies: Record<string, string[]>;
  serviceNotes: Record<string, string>;
  scopeComplete: boolean;
}

export interface DurationData {
  estimatedDuration: number;
  startDate?: string;
  endDate?: string;
  workSchedule?: {
    daysPerWeek: number;
    hoursPerDay: number;
  };
}

export interface ExpensesData {
  laborCosts: {
    workers: number;
    hoursPerWorker: number;
    ratePerHour: number;
    total: number;
  };
  materialCosts: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  equipmentCosts: Array<{
    id: string;
    name: string;
    days: number;
    dailyRate: number;
    total: number;
  }>;
  totalExpenses: number;
}

export interface PricingData {
  subtotal: number;
  markup: number;
  markupPercentage: number;
  total: number;
  pricingStrategy?: {
    id: string;
    name: string;
    multiplier: number;
  };
}

/**
 * Additional workflow data that can be dynamically added
 */
export interface AdditionalWorkflowData {
  customFields?: Record<string, unknown>;
  integrationData?: Record<string, unknown>;
  userDefinedSteps?: Array<{
    id: string;
    name: string;
    data: Record<string, unknown>;
    completed: boolean;
  }>;
}

/**
 * Combined guided flow data with type safety
 */
export interface GuidedFlowData {
  initialContact?: InitialContactData;
  filesPhotos?: FilesPhotosData;
  areaOfWork?: AreaOfWorkData;
  takeoff?: TakeoffStepData;
  scopeDetails?: ScopeDetailsData;
  duration?: DurationData;
  expenses?: ExpensesData;
  pricing?: PricingData;
  additional?: AdditionalWorkflowData;
}
