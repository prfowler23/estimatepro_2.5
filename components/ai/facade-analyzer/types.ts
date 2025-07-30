// Type definitions for Facade Analyzer components
export interface FacadeAnalysisResult {
  windows: {
    count: number;
    totalArea: number;
    gridPattern: string;
    confidence: number;
    cleaningDifficulty: string;
  };
  materials: {
    breakdown: Record<string, number>;
    conditions: string[];
    cleaningDifficulty: number;
    dominant: string;
    weathering: string;
  };
  damage: {
    staining: string[];
    oxidation: string[];
    damage: string[];
    severity: string;
    affectedArea: number;
    repairUrgency: string;
  };
  safety: {
    hazards: string[];
    requirements: string[];
    riskLevel: string;
    accessChallenges: string[];
    equipmentNeeded: string[];
  };
  measurements: {
    buildingHeight: number;
    facadeWidth: number;
    confidence: number;
    estimatedSqft: number;
    stories: number;
  };
  recommendations: {
    services: string[];
    timeline: string;
    priority: string;
    estimatedCost: { min: number; max: number };
  };
  confidence: number;
}

export type RiskLevel = "low" | "medium" | "high";

export interface FacadeAnalyzerInputProps {
  imageUrl: string;
  setImageUrl: (url: string) => void;
  buildingType: string;
  setBuildingType: (type: string) => void;
  onAnalyze: () => Promise<void>;
  isAnalyzing: boolean;
  error: string | null;
}
