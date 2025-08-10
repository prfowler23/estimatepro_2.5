// Core estimate editor components
export { EstimateEditor } from "./estimate-editor";
export { EstimateEditorOptimized } from "./estimate-editor-optimized";

// Modular section components
export { EstimateHeader } from "./estimate-header";
export { CustomerInfoSection } from "./customer-info-section";
export { BuildingInfoSection } from "./building-info-section";
export { ServicesSection } from "./services-section";
export { EstimateSummarySection } from "./estimate-summary-section";
export { NotesSection } from "./notes-section";

// List and card components
export { EstimateCard } from "./estimate-card";
export { EstimateList } from "./estimate-list";

// Performance optimization components
export {
  OptimizedEstimateComponent,
  HeaderSkeleton,
  SectionSkeleton,
} from "./estimate-editor-lazy";

// Types and interfaces (re-exported for convenience)
export type { Estimate, EstimateService } from "@/lib/stores/estimate-store";
