export enum ServiceTypeCode {
  GLASS_RESTORATION = "GR",
  WINDOW_CLEANING = "WC",
  PRESSURE_WASHING = "PW",
  PRESSURE_WASH_SEAL = "PWS",
  FINAL_CLEAN = "FC",
  FRAME_RESTORATION = "FR",
  HIGH_DUSTING = "HD",
  SOFT_WASHING = "SW",
  PARKING_DECK = "PD",
  GRANITE_RECONDITIONING = "GRC",
  BIOFILM_REMOVAL = "BF",
  FACADE_ANALYSIS = "FACADE_ANALYSIS",
}

export interface CalculatorFormProps {
  onSubmit: (result: CalculationResult) => void;
  onCancel: () => void;
  estimateId: string;
}

export interface CalculationResult {
  totalCost: number;
  laborCost: number;
  materialCost: number;
  equipmentCost?: number;
  marginAmount?: number;
  confidence?: number;
  breakdown?: Record<string, any>;
}

export interface DynamicFormLoaderProps {
  serviceType: ServiceTypeCode | null;
  onSubmit: (result: CalculationResult) => void;
  onCancel: () => void;
  estimateId: string;
}
