/**
 * Manual adjustments made to facade analysis results
 */
export interface FacadeAnalysisAdjustments {
  measurements?: {
    total_facade_sqft?: number;
    total_glass_sqft?: number;
    building_height_feet?: number;
  };
  materials?: {
    overrides: Array<{
      original_type: string;
      corrected_type: string;
      sqft: number;
      reason: string;
    }>;
  };
  ground_surfaces?: {
    sidewalk_sqft?: number;
    parking_sqft?: number;
    loading_dock_sqft?: number;
  };
  complexity_override?: "simple" | "moderate" | "complex";
  notes?: string;
  adjusted_by: string;
  adjusted_at: string;
}

/**
 * Image metadata for facade analysis
 */
export interface FacadeImageMetadata {
  capture_date?: string;
  camera_settings?: {
    focal_length?: number;
    aperture?: string;
    iso?: number;
  };
  weather_conditions?: string;
  lighting_conditions?: "natural" | "artificial" | "mixed";
  distance_from_building?: number;
  photographer?: string;
  processing_notes?: string;
  [key: string]: unknown;
}

/**
 * Properties for detected elements
 */
export interface DetectedElementProperties {
  // Window properties
  window_type?: "single" | "double" | "storefront" | "curtain_wall";
  frame_material?: "aluminum" | "wood" | "vinyl" | "steel";

  // Door properties
  door_type?: "entrance" | "service" | "emergency" | "loading";

  // Material zone properties
  material_condition?: "excellent" | "good" | "fair" | "poor";
  cleaning_difficulty?: 1 | 2 | 3 | 4 | 5;

  // Covered area properties
  coverage_type?: "awning" | "canopy" | "overhang" | "balcony";

  // General properties
  accessibility?: "easy" | "moderate" | "difficult" | "dangerous";
  [key: string]: unknown;
}

export interface FacadeAnalysis {
  id: string;
  estimate_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;

  // Building Information
  building_address: string;
  building_type:
    | "office"
    | "retail"
    | "residential"
    | "industrial"
    | "mixed-use"
    | "institutional";
  building_height_stories: number;
  building_height_feet: number;

  // Measurements
  total_facade_sqft: number;
  total_glass_sqft: number;
  net_facade_sqft: number;
  glass_to_facade_ratio: number;

  // Material Breakdown
  materials: FacadeMaterial[];
  facade_complexity: "simple" | "moderate" | "complex";

  // Ground Surfaces
  sidewalk_sqft: number;
  covered_walkway_sqft: number;
  parking_spaces: number;
  parking_sqft: number;
  loading_dock_sqft: number;

  // Analysis Metadata
  confidence_level: number;
  ai_model_version: string;
  image_sources: ImageSource[];
  validation_notes: string;
  manual_adjustments: FacadeAnalysisAdjustments;

  // Flags
  requires_field_verification: boolean;
  has_covered_areas: boolean;
  is_historic_building: boolean;
}

export interface FacadeMaterial {
  type:
    | "brick"
    | "stone"
    | "concrete"
    | "eifs"
    | "metal"
    | "wood"
    | "glass"
    | "other";
  sqft: number;
  estimated_sqft?: number; // Optional estimated square footage
  percentage: number;
  confidence: number;
  location?: string;
}

export interface ImageSource {
  url: string;
  type: "aerial" | "ground" | "drone" | "satellite";
  view_angle: "front" | "rear" | "left" | "right" | "oblique" | "top";
  uploaded_at: string;
}

export interface FacadeAnalysisImage {
  id: string;
  facade_analysis_id: string;
  uploaded_by: string;
  created_at: string;
  image_url: string;
  image_type: "aerial" | "ground" | "drone" | "satellite";
  view_angle: "front" | "rear" | "left" | "right" | "oblique" | "top";
  ai_analysis_results: AIAnalysisResult;
  detected_elements: DetectedElement[];
  confidence_scores: Record<string, number>;
  metadata: FacadeImageMetadata;
}

export interface AIAnalysisResult {
  windows_detected: number;
  facade_area: number;
  glass_area: number;
  materials_identified: FacadeMaterial[];
  height_estimation: {
    stories: number;
    feet: number;
    confidence: number;
  };
  covered_areas_detected: boolean;
  processing_time_ms: number;
}

export interface DetectedElement {
  type: "window" | "door" | "balcony" | "material_zone" | "covered_area";
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  properties?: DetectedElementProperties;
}

export interface FacadeAnalysisAIResponse {
  success: boolean;
  analysis: {
    measurements: {
      total_facade_sqft: number;
      total_glass_sqft: number;
      glass_to_facade_ratio: number;
      confidence: number;
    };
    materials: FacadeMaterial[];
    complexity: "simple" | "moderate" | "complex";
    ground_surfaces?: {
      sidewalk_sqft?: number;
      parking_sqft?: number;
      loading_dock_sqft?: number;
    };
    recommendations: string[];
    confidence_level: number;
  };
}
