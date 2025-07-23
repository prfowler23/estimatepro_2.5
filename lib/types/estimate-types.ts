// Comprehensive type definitions for EstimatePro

// Service calculation types
export interface ServiceCalculationResult {
  area: number;
  basePrice: number;
  laborHours: number;
  setupHours?: number;
  rigHours?: number;
  totalHours: number;
  crewSize: number;
  equipment?: {
    type: string;
    days: number;
    cost: number;
  };
  breakdown: ServiceBreakdownItem[];
  warnings: string[];
  materials?: MaterialItem[];
  riskFactors?: RiskFactor[];
}

export interface ServiceBreakdownItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: "labor" | "materials" | "equipment" | "overhead";
}

export interface MaterialItem {
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  supplier?: string;
}

export interface RiskFactor {
  type: "height" | "access" | "weather" | "complexity" | "timeline";
  level: "low" | "medium" | "high";
  multiplier: number;
  factor?: number; // Additional risk factor for calculations
  description: string;
}

// Form data types for different services
export interface BaseServiceFormData {
  area: number;
  building_height_feet: number | null;
  accessType: "ladder" | "lift" | "scaffold" | "rope";
  timeConstraints?: string;
  specialRequirements?: string;
  glassArea?: number; // For services that need glass area calculations
}

export interface WindowCleaningFormData extends BaseServiceFormData {
  windowType: "standard" | "tinted" | "tempered";
  interiorCleaning: boolean;
  screenCleaning: boolean;
  sillCleaning: boolean;
  frequency: "one-time" | "monthly" | "quarterly" | "annually";
}

export interface PressureWashingFormData extends BaseServiceFormData {
  surfaceType: "concrete" | "brick" | "siding" | "metal";
  pressure: number;
  detergentRequired: boolean;
  waterRecovery: boolean;
  environmentalConcerns: boolean;
  requiresSealing?: boolean; // For pressure wash & seal services
}

export interface GlassRestorationFormData extends BaseServiceFormData {
  damageType: "mineral-deposits" | "scratches" | "etching" | "staining";
  severityLevel: "light" | "moderate" | "heavy";
  damageLevel: "light" | "moderate" | "heavy"; // Alternative property name for backward compatibility
  glassType: "standard" | "tempered" | "laminated" | "low-e";
  treatmentMethod: "chemical" | "mechanical" | "combination";
}

// AI extraction types
export interface AIExtractedData {
  customer: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  requirements: {
    services: string[];
    buildingType: string;
    buildingSize?: string;
    floors?: number;
    timeline?: string;
    budget?: string;
    location?: string;
    specialRequirements?: string[];
  };
  timeline?: {
    requestedDate?: string;
    deadline?: string;
    urgency?: "urgent" | "flexible" | "normal";
    flexibility?: "some" | "flexible" | "none";
  };
  urgencyScore: number;
  confidence: number;
  extractionDate: string;
  redFlags?: string[];
}

// Enhanced AI analysis types
export interface CompetitiveIntelligence {
  competitors: string[];
  pricingStrategy: string;
  serviceOfferings: string[];
  strengthsWeaknesses: string[];
  marketRates: Record<string, string>;
  differentiators: string[];
  threats: string[];
  opportunities: string[];
}

export interface RiskAssessmentResult {
  riskScore: number; // 1-10
  riskFactors: Array<{
    category: string;
    risk: string;
    severity: "low" | "medium" | "high" | "critical";
    mitigation: string;
  }>;
  recommendations: string[];
  pricing_adjustments: Record<string, number>;
}

export interface AutoQuoteResult {
  quote: FinalEstimate;
  aiAnalysis: {
    confidence: number;
    recommendations: string[];
    warnings: string[];
    pricingStrategy: string;
    competitivePosition?: string;
    expectedWinRate: number;
  };
  breakdown: {
    baseCalculation: ServiceEstimate[];
    adjustments: Array<{
      type: string;
      description: string;
      multiplier: number;
    }>;
    finalCalculation: ServiceEstimate[];
  };
}

export interface FollowUpPlan {
  strategy: "aggressive" | "moderate" | "gentle" | "minimal";
  timeline: FollowUpAction[];
  personalization: {
    tone: string;
    keyPoints: string[];
    objectionHandling: string[];
  };
  alternativeChannels: string[];
  escalationTriggers: string[];
}

export interface FollowUpAction {
  id: string;
  type: "email" | "call" | "text" | "proposal_update" | "meeting_request";
  scheduledDate: Date;
  priority: "low" | "medium" | "high" | "urgent";
  content: {
    subject?: string;
    body: string;
    attachments?: string[];
    callScript?: string;
  };
  conditions: string[];
  objectives: string[];
  successMetrics: string[];
}

// Service dependencies
export interface ServiceDependency {
  serviceType: string;
  dependsOn: string[];
  blockedBy?: string[];
  mustPrecedeBy?: number; // hours
  conflictsWith?: string[];
}

// File upload types
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
  processedAt?: Date;
  file?: File; // Original File object for processing
  status?: "pending" | "analyzing" | "complete" | "error"; // Processing status
  errorMessage?: string; // Error message for failed uploads
  analysis?: any; // AI analysis results
  metadata?: {
    width?: number;
    height?: number;
    compressed?: boolean;
    originalSize?: number;
  };
}

// AI analysis results
export interface AIAnalysisResult {
  id: string;
  fileId: string;
  analysisType: "facade" | "interior" | "scope" | "damage-assessment";
  confidence: number;
  findings: {
    surfaceArea?: number;
    buildingHeight: number | null;
    windowCount?: number;
    accessPoints?: string[];
    complications?: string[];
    recommendations?: string[];
  };
  processedAt: Date;
  processingTime: number;
}

// Work area types
export interface WorkArea {
  id: string;
  name: string;
  type: "exterior" | "interior" | "mixed";
  geometry: {
    type: "rectangle" | "polygon" | "circle";
    coordinates: number[][];
    area: number;
    perimeter: number;
  };
  surfaces: Surface[];
  accessRequirements: string[];
  riskFactors: RiskFactor[];
  measurements?: {
    totalArea: number;
    linearFeet: number;
    windowCount: number;
    doorCount: number;
  };
}

export interface Surface {
  id: string;
  type: "wall" | "window" | "door" | "roof" | "floor";
  material: string;
  area: number;
  condition: "excellent" | "good" | "fair" | "poor";
  cleaningRequirements: string[];
}

// Measurement types
export interface Measurement {
  id: string;
  workAreaId: string;
  type: "length" | "area" | "volume" | "count";
  value: number;
  unit: string;
  accuracy: number;
  method: "manual" | "photo-analysis" | "blueprint" | "laser";
  takenAt: Date;
  notes?: string;
}

// Takeoff data
export interface TakeoffData {
  id: string;
  workAreas: WorkArea[];
  measurements: Measurement[];
  calculations: {
    totalArea: number;
    totalPerimeter: number;
    complexityFactor: number;
    accessDifficulty: number;
  };
  accuracy: number;
  method: "manual" | "assisted" | "automatic";
  validatedAt?: Date;
  validator?: string;
  notes?: string; // Required by workflow service
}

// Weather analysis
export interface WeatherAnalysis {
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  forecast: WeatherForecast[];
  workableWindows: WorkableWindow[];
  seasonalFactors: SeasonalFactor[];
  recommendations: string[];
}

export interface WeatherForecast {
  date: string;
  temperature: {
    min: number;
    max: number;
    unit: "celsius" | "fahrenheit";
  };
  precipitation: {
    probability: number;
    amount: number;
    type: "rain" | "snow" | "sleet";
  };
  wind: {
    speed: number;
    direction: string;
    gusts?: number;
  };
  workability: number; // 0-100 score
}

export interface WorkableWindow {
  start: Date;
  end: Date;
  workability: number;
  constraints: string[];
}

export interface SeasonalFactor {
  season: "spring" | "summer" | "fall" | "winter";
  multiplier: number;
  considerations: string[];
}

// Equipment and material costs
export interface EquipmentCost {
  id: string;
  name: string;
  type: "rental" | "purchase" | "consumable";
  category: "cleaning" | "access" | "safety" | "transport";
  dailyCost: number;
  setupCost?: number;
  deliveryCost?: number;
  daysRequired: number;
  totalCost: number;
}

export interface MaterialCost {
  id: string;
  name: string;
  category: "chemicals" | "supplies" | "consumables";
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  supplier?: string;
  deliveryTime?: number;
}

// Pricing calculations
export interface PricingCalculation {
  basePrice: number;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  overheadCost: number;
  markup: number;
  margin: number;
  totalPrice: number;
  pricePerUnit: number;
  competitiveAnalysis?: CompetitiveAnalysis;
  profitability: ProfitabilityAnalysis;
}

export interface CompetitiveAnalysis {
  marketAverage: number;
  competitorPrices: number[];
  positionInMarket: "below" | "average" | "above";
  recommendation: string;
}

export interface ProfitabilityAnalysis {
  grossMargin: number;
  netMargin: number;
  roi: number;
  paybackPeriod: number;
  riskAdjustedReturn: number;
}

// Manual overrides
export interface ManualOverride {
  id: string;
  type: "price" | "time" | "materials" | "labor";
  originalValue: number;
  overrideValue: number;
  reason: string;
  approvedBy?: string;
  approvedAt?: Date;
  expiresAt?: Date;
}

// Final estimate
export interface FinalEstimate {
  id: string;
  summary: {
    totalPrice: number;
    totalTime: number;
    totalArea: number;
    serviceCount: number;
    complexityScore: number;
  };
  services: ServiceEstimate[];
  timeline: ProjectTimeline;
  terms: ContractTerms;
  validUntil: Date;
  approval: {
    status: "pending" | "approved" | "rejected";
    approvedBy?: string;
    approvedAt?: Date;
    comments?: string;
  };
}

export interface ServiceEstimate {
  quote_id: string;
  serviceType: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  price: number;
  area_sqft: number | null;
  glass_sqft: number | null;
  duration: number;
  startDate?: Date;
  endDate?: Date;
  dependencies: string[];
  notes?: string;
  // Additional properties required by estimate service
  calculationResult?: ServiceCalculationResult;
  formData?: any;
}

export interface ProjectTimeline {
  startDate: Date;
  endDate: Date;
  totalDuration: number;
  phases: ProjectPhase[];
  milestones: Milestone[];
  criticalPath: string[];
}

export interface ProjectPhase {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  services: string[];
  dependencies: string[];
  resources: ResourceRequirement[];
}

export interface Milestone {
  id: string;
  name: string;
  date: Date;
  description: string;
  deliverables: string[];
  dependencies: string[];
}

export interface ResourceRequirement {
  type: "labor" | "equipment" | "materials";
  name: string;
  quantity: number;
  startDate: Date;
  endDate: Date;
  cost: number;
}

export interface ContractTerms {
  paymentSchedule: PaymentSchedule[];
  warranties: Warranty[];
  limitations: string[];
  changeOrderPolicy: string;
  cancellationPolicy: string;
  insuranceRequirements: string[];
}

export interface PaymentSchedule {
  description: string;
  percentage: number;
  amount: number;
  dueDate: Date;
  conditions: string[];
}

export interface Warranty {
  type: "workmanship" | "materials" | "equipment";
  duration: number;
  unit: "days" | "months" | "years";
  coverage: string;
  limitations: string[];
}

// Union types for form data
export type ServiceFormData =
  | WindowCleaningFormData
  | PressureWashingFormData
  | GlassRestorationFormData
  | BaseServiceFormData;

// Helper types
// Service ID type - using short codes as used in UI
export type ServiceType =
  | "WC" // Window Cleaning
  | "PW" // Pressure Washing
  | "SW" // Soft Washing
  | "BF" // Biofilm Removal
  | "GR" // Glass Restoration
  | "FR" // Frame Restoration
  | "HD" // High Dusting
  | "FC" // Final Clean
  | "GRC" // Granite Reconditioning
  | "PWS" // Pressure Wash & Seal
  | "PD" // Parking Deck
  | "BR" // Biofilm Removal
  | "GC"; // General Cleaning

// Service mapping for display names and metadata
export const SERVICE_METADATA: Record<
  ServiceType,
  {
    name: string;
    fullName: string;
    basePrice: string;
    category: string;
  }
> = {
  WC: {
    name: "Window Cleaning",
    fullName: "window-cleaning",
    basePrice: "$2-4/window",
    category: "cleaning",
  },
  PW: {
    name: "Pressure Washing",
    fullName: "pressure-washing",
    basePrice: "$0.15-0.50/sq ft",
    category: "cleaning",
  },
  SW: {
    name: "Soft Washing",
    fullName: "soft-washing",
    basePrice: "$0.45/sq ft",
    category: "cleaning",
  },
  BF: {
    name: "Biofilm Removal",
    fullName: "biofilm-removal",
    basePrice: "$0.75/sq ft",
    category: "specialty",
  },
  GR: {
    name: "Glass Restoration",
    fullName: "glass-restoration",
    basePrice: "$5-35/window",
    category: "restoration",
  },
  FR: {
    name: "Frame Restoration",
    fullName: "frame-restoration",
    basePrice: "$25/frame",
    category: "restoration",
  },
  HD: {
    name: "High Dusting",
    fullName: "high-dusting",
    basePrice: "$0.37-0.75/sq ft",
    category: "cleaning",
  },
  FC: {
    name: "Final Clean",
    fullName: "final-clean",
    basePrice: "$70/hour",
    category: "cleaning",
  },
  GRC: {
    name: "Granite Reconditioning",
    fullName: "granite-reconditioning",
    basePrice: "$1.75/sq ft",
    category: "specialty",
  },
  PWS: {
    name: "Pressure Wash & Seal",
    fullName: "pressure-wash-seal",
    basePrice: "$1.25-1.35/sq ft",
    category: "cleaning",
  },
  PD: {
    name: "Parking Deck",
    fullName: "parking-deck",
    basePrice: "$16-23/space",
    category: "specialty",
  },
  BR: {
    name: "Biofilm Removal",
    fullName: "biofilm-removal",
    basePrice: "$0.75/sq ft",
    category: "specialty",
  },
  GC: {
    name: "General Cleaning",
    fullName: "general-cleaning",
    basePrice: "$50-100/hr",
    category: "cleaning",
  },
};

export type EstimateStatus =
  | "draft"
  | "review"
  | "approved"
  | "sent"
  | "accepted"
  | "rejected";

export type UserRole = "admin" | "sales" | "estimator" | "viewer";

// --- Guided Estimation Flow Step Data Types ---

export interface InitialContactData {
  contactMethod: "email" | "meeting" | "phone" | "walkin";
  contactDate?: string; // ISO string
  initialNotes?: string;
  originalContent?: string; // Raw content for AI extraction
  aiExtractedData?: AIExtractedData;
}

export interface ScopeDetailsData {
  selectedServices: ServiceType[];
  serviceDependencies?: ServiceDependency[];
  serviceOrder?: string[];
  autoAddedServices?: string[];
  overrides?: Record<string, { price?: number; reason?: string }>;
  scopeNotes?: string;
  accessRestrictions?: string[];
  specialRequirements?: string[];
  autoPopulated?: boolean;
}

export interface FilesPhotosData {
  files: UploadedFile[];
  uploadedFiles?: UploadedFile[]; // Backward compatibility
  aiAnalysisResults?: AIAnalysisResult[];
  analysisComplete?: boolean;
  summary?: any;
}

export interface AreaOfWorkData {
  workAreas: WorkArea[];
  measurements?: Measurement[];
  scale?: number | { pixelsPerFoot: number }; // Required by AreaOfWork component
  totalArea?: number;
  backgroundImage?: string;
  imageName?: string;
  notes?: string;
  autoPopulated?: boolean;
  autoPopulationSource?: string;
}

export interface TakeoffStepData {
  takeoffData: TakeoffData;
  measurements?: Measurement[];
}

export interface DurationStepData {
  estimatedDuration: number | { days: number; hours: number };
  weatherAnalysis?: WeatherAnalysis;
  weatherFactors?: any; // Required by workflow templates
  schedulingConstraints?: any; // Required by workflow templates
  serviceDurations?: any;
  timeline?: any;
  manualOverrides?: Record<string, number>;
  projectStartDate?: string;
  autoPopulated?: boolean;
  autoPopulationSource?: string;
}

export interface ExpensesStepData {
  equipment: any[];
  materials: any[];
  labor: any[];
  otherCosts: any[];
  totalCosts: {
    equipment: number;
    materials: number;
    labor: number;
    other: number;
    grand: number;
  };
  margins: {
    equipment: number;
    materials: number;
    labor: number;
    other: number;
  };
  markedUpTotals?: {
    equipment: number;
    materials: number;
    labor: number;
    other: number;
    grand: number;
  };
  other?: number; // For compatibility with Summary component
  // Backward compatibility
  equipmentCosts?: EquipmentCost[];
  materialCosts?: MaterialCost[];
  laborCosts?: any[];
}

export interface PricingStepData {
  pricingCalculations: PricingCalculation;
  manualOverrides?: ManualOverride[];
  basePrice?: number;
  finalPrice?: number;
  price?: number; // Additional price field
  strategy?: any;
  winProbability?: number;
  adjustments?: any[];
  riskFactors?: any[];
  confidence?: number;
}

export interface SummaryStepData {
  finalEstimate: FinalEstimate;
  proposalGenerated: boolean;
  customer?: any;
  pricing?: any;
  timeline?: any;
  costs?: any;
  services?: any[];
  proposal?: any;
  status?: string;
}

// Unified GuidedFlowData interface
export interface GuidedFlowData {
  initialContact?: InitialContactData;
  scopeDetails?: ScopeDetailsData;
  filesPhotos?: FilesPhotosData;
  areaOfWork?: AreaOfWorkData;
  takeoff?: TakeoffStepData;
  duration?: DurationStepData;
  expenses?: ExpensesStepData;
  pricing?: PricingStepData;
  summary?: SummaryStepData;
  // PHASE 2 FIX: Add template metadata tracking
  _templateMetadata?: {
    templateId: string;
    templateName: string;
    appliedAt: string;
  };
}

// Main estimate interfaces for backward compatibility
export interface Estimate extends FinalEstimate {}
export interface EstimateService extends ServiceEstimate {}
