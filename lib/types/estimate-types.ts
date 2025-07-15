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
  category: 'labor' | 'materials' | 'equipment' | 'overhead';
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
  type: 'height' | 'access' | 'weather' | 'complexity' | 'timeline';
  level: 'low' | 'medium' | 'high';
  multiplier: number;
  description: string;
}

// Form data types for different services
export interface BaseServiceFormData {
  area: number;
  buildingHeight: number;
  accessType: 'ladder' | 'lift' | 'scaffold' | 'rope';
  timeConstraints?: string;
  specialRequirements?: string;
}

export interface WindowCleaningFormData extends BaseServiceFormData {
  windowType: 'standard' | 'tinted' | 'tempered';
  interiorCleaning: boolean;
  screenCleaning: boolean;
  sillCleaning: boolean;
  frequency: 'one-time' | 'monthly' | 'quarterly' | 'annually';
}

export interface PressureWashingFormData extends BaseServiceFormData {
  surfaceType: 'concrete' | 'brick' | 'siding' | 'metal';
  pressure: number;
  detergentRequired: boolean;
  waterRecovery: boolean;
  environmentalConcerns: boolean;
}

export interface GlassRestorationFormData extends BaseServiceFormData {
  damageType: 'mineral-deposits' | 'scratches' | 'etching' | 'staining';
  severityLevel: 'light' | 'moderate' | 'heavy';
  glassType: 'standard' | 'tempered' | 'laminated' | 'low-e';
  treatmentMethod: 'chemical' | 'mechanical' | 'combination';
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
  };
  urgencyScore: number;
  confidence: number;
  extractionDate: string;
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
    severity: 'low' | 'medium' | 'high' | 'critical';
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
  strategy: 'aggressive' | 'moderate' | 'gentle' | 'minimal';
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
  type: 'email' | 'call' | 'text' | 'proposal_update' | 'meeting_request';
  scheduledDate: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
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
  analysisType: 'facade' | 'interior' | 'scope' | 'damage-assessment';
  confidence: number;
  findings: {
    surfaceArea?: number;
    buildingHeight?: number;
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
  type: 'exterior' | 'interior' | 'mixed';
  geometry: {
    type: 'rectangle' | 'polygon' | 'circle';
    coordinates: number[][];
    area: number;
    perimeter: number;
  };
  surfaces: Surface[];
  accessRequirements: string[];
  riskFactors: RiskFactor[];
}

export interface Surface {
  id: string;
  type: 'wall' | 'window' | 'door' | 'roof' | 'floor';
  material: string;
  area: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  cleaningRequirements: string[];
}

// Measurement types
export interface Measurement {
  id: string;
  workAreaId: string;
  type: 'length' | 'area' | 'volume' | 'count';
  value: number;
  unit: string;
  accuracy: number;
  method: 'manual' | 'photo-analysis' | 'blueprint' | 'laser';
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
  method: 'manual' | 'assisted' | 'automatic';
  validatedAt?: Date;
  validator?: string;
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
    unit: 'celsius' | 'fahrenheit';
  };
  precipitation: {
    probability: number;
    amount: number;
    type: 'rain' | 'snow' | 'sleet';
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
  season: 'spring' | 'summer' | 'fall' | 'winter';
  multiplier: number;
  considerations: string[];
}

// Equipment and material costs
export interface EquipmentCost {
  id: string;
  name: string;
  type: 'rental' | 'purchase' | 'consumable';
  category: 'cleaning' | 'access' | 'safety' | 'transport';
  dailyCost: number;
  setupCost?: number;
  deliveryCost?: number;
  daysRequired: number;
  totalCost: number;
}

export interface MaterialCost {
  id: string;
  name: string;
  category: 'chemicals' | 'supplies' | 'consumables';
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
  positionInMarket: 'below' | 'average' | 'above';
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
  type: 'price' | 'time' | 'materials' | 'labor';
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
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: Date;
    comments?: string;
  };
}

export interface ServiceEstimate {
  serviceType: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  duration: number;
  startDate?: Date;
  endDate?: Date;
  dependencies: string[];
  notes?: string;
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
  type: 'labor' | 'equipment' | 'materials';
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
  type: 'workmanship' | 'materials' | 'equipment';
  duration: number;
  unit: 'days' | 'months' | 'years';
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
export type ServiceType = 
  | 'window-cleaning'
  | 'pressure-washing'
  | 'soft-washing'
  | 'biofilm-removal'
  | 'glass-restoration'
  | 'frame-restoration'
  | 'high-dusting'
  | 'final-clean'
  | 'granite-reconditioning'
  | 'pressure-wash-seal'
  | 'parking-deck';

export type EstimateStatus = 'draft' | 'review' | 'approved' | 'sent' | 'accepted' | 'rejected';

export type UserRole = 'admin' | 'sales' | 'estimator' | 'viewer';

// Export all types for easy importing
export type {
  ServiceCalculationResult,
  ServiceBreakdownItem,
  MaterialItem,
  RiskFactor,
  BaseServiceFormData,
  AIExtractedData,
  ServiceDependency,
  UploadedFile,
  AIAnalysisResult,
  WorkArea,
  Surface,
  Measurement,
  TakeoffData,
  WeatherAnalysis,
  WeatherForecast,
  WorkableWindow,
  SeasonalFactor,
  EquipmentCost,
  MaterialCost,
  PricingCalculation,
  CompetitiveAnalysis,
  ProfitabilityAnalysis,
  ManualOverride,
  FinalEstimate,
  ServiceEstimate,
  ProjectTimeline,
  ProjectPhase,
  Milestone,
  ResourceRequirement,
  ContractTerms,
  PaymentSchedule,
  Warranty
};