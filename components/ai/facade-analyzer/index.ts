// Consolidated exports for Facade Analyzer components
// This provides a clean API surface for consuming components

// Type definitions
export * from "./types";

// Utility functions
export * from "./utils";

// Core components - Named exports for better tree-shaking
export { FacadeAnalyzerInput } from "./FacadeAnalyzerInput";
export { WindowsAnalysis } from "./WindowsAnalysis";
export { MaterialsAnalysis } from "./MaterialsAnalysis";
export { DamageAssessment } from "./DamageAssessment";
export { SafetyAnalysis } from "./SafetyAnalysis";
export { BuildingMeasurements } from "./BuildingMeasurements";
export { Recommendations } from "./Recommendations";
export { AnalysisResults } from "./AnalysisResults";

// Default export for convenience
const FacadeAnalyzer = {
  Input: FacadeAnalyzerInput,
  Windows: WindowsAnalysis,
  Materials: MaterialsAnalysis,
  Damage: DamageAssessment,
  Safety: SafetyAnalysis,
  Measurements: BuildingMeasurements,
  Recommendations: Recommendations,
  Results: AnalysisResults,
};

export default FacadeAnalyzer;
