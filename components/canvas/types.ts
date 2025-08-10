// Canvas component type definitions

export type DrawingTool = "select" | "rectangle" | "polygon" | "measure";

export interface Point {
  x: number;
  y: number;
}

export interface Shape {
  id: string;
  type: "rectangle" | "polygon";
  points: Point[];
  area: number;
  perimeter?: number;
  label?: string;
  color: string;
}

export interface Measurement {
  id: string;
  start: Point;
  end: Point;
  distance: number;
  label?: string;
  color: string;
}

export interface Scale {
  pixelsPerFoot: number;
}

export interface TakeoffData {
  shapes: Shape[];
  measurements: Measurement[];
  scale: Scale;
  backgroundImage?: string;
  calculations?: {
    totalArea: number;
    totalPerimeter: number;
    shapeCount: number;
    measurementCount: number;
  };
}

export interface DirtyRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Component prop types
export interface AreaBuilderProps {
  onSave: (data: TakeoffData) => void;
  initialData?: TakeoffData | null;
  height?: number;
}

export interface DrawingCanvasProps {
  backgroundImage?: string;
  onShapesChange: (shapes: Shape[], measurements: Measurement[]) => void;
  currentTool: DrawingTool;
  scale?: Scale;
  width?: number;
  height?: number;
  onScaleChange?: (scale: Scale) => void;
}

export interface ToolPaletteProps {
  currentTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onClearAll: () => void;
}

export interface ScaleSetterProps {
  scale: Scale;
  onScaleChange: (scale: Scale) => void;
}

export interface AreaSummaryProps {
  shapes: Shape[];
  scale: Scale;
}

// Validation constants
export const MAX_FILE_SIZE_MB = 10;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
export const MIN_SHAPE_SIZE = 10; // Minimum pixels for shape creation
export const MAX_LABEL_LENGTH = 100;
