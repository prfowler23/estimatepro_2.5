export interface PhotoAnalysisResult {
  windows?: {
    count: number;
    totalArea: number;
    gridPattern: string;
    confidence: number;
    locations: Array<{ x: number; y: number; width: number; height: number; }>;
  };
  materials?: {
    breakdown: Record<string, number>; // e.g. { brick: 60, glass: 30, concrete: 10 }
    conditions: string[];
    cleaningDifficulty: number; // 1-10
    specialCoatings?: string[];
  };
  measurements?: {
    buildingHeight: number;
    facadeWidth: number;
    stories: number;
    confidence: number;
  };
  damage?: {
    staining: string[];
    oxidation: string[];
    damage: string[];
    severity: 'low' | 'medium' | 'high';
  };
  safety?: {
    hazards: string[];
    requirements: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
}