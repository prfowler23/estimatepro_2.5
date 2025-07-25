// Type definitions for guided flow data structures

import type { ServiceType } from "./estimate-types";

// Step-specific data types
export interface InitialContactData {
  contactDate: string;
  contactMethod: string;
  initialNotes?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  companyName?: string;
}

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

// Combined guided flow data
export interface GuidedFlowData {
  initialContact?: InitialContactData;
  filesPhotos?: FilesPhotosData;
  areaOfWork?: AreaOfWorkData;
  takeoff?: TakeoffStepData;
  scopeDetails?: ScopeDetailsData;
  duration?: DurationData;
  expenses?: ExpensesData;
  pricing?: PricingData;
  [key: string]: any; // Allow for additional fields
}
