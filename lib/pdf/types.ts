import { Database } from "@/types/supabase";

// PDF Generation Types
export type EstimateData = Database["public"]["Tables"]["estimates"]["Row"] & {
  estimate_number: string;
  services: EstimateService[];
};

export interface EstimateService {
  id?: string;
  service_type: string;
  area_sqft: number;
  glass_sqft?: number;
  price: number;
  labor_hours: number;
  setup_hours: number;
  rig_hours: number;
  total_hours: number;
  crew_size: number;
  equipment_type?: string | null;
  equipment_days?: number;
  equipment_cost?: number;
  calculation_details?: CalculationDetails;
}

export interface CalculationDetails {
  basePrice?: number;
  laborCost?: number;
  materialCost?: number;
  equipmentCost?: number;
  markup?: number;
  notes?: string;
}

// PDF Processing Types
export interface PDFProcessingOptions {
  extractImages?: boolean;
  performOCR?: boolean;
  detectMeasurements?: boolean;
  ocrConfig?: Partial<OCRConfig>;
  maxPages?: number;
  pageRange?: { start: number; end: number };
}

export interface PDFProcessingResult {
  success: boolean;
  text: string;
  images: PDFImageData[];
  measurements: PDFMeasurement[];
  metadata: PDFMetadata;
  error?: string;
  processingTime?: number;
}

export interface PDFImageData {
  pageNumber: number;
  imageIndex: number;
  data: Uint8Array;
  width: number;
  height: number;
  format: ImageFormat;
  extractedText?: string;
  confidence?: number;
  coordinates?: ImageCoordinates;
}

export interface ImageCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ImageFormat = "jpeg" | "png" | "gif" | "rgb" | "rgba";

export interface PDFMeasurement {
  type: MeasurementType;
  value: number;
  unit: MeasurementUnit;
  confidence: number;
  pageNumber: number;
  coordinates?: ImageCoordinates;
  rawText: string;
  normalizedValue?: number;
}

export type MeasurementType = "dimension" | "area" | "scale";

export type MeasurementUnit =
  | "feet"
  | "inches"
  | "meters"
  | "centimeters"
  | "square_feet"
  | "square_meters"
  | "scale_ratio";

export interface PDFMetadata {
  pageCount: number;
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  fileSize?: number;
  isEncrypted?: boolean;
}

export interface PDFToImageOptions {
  density?: number;
  saveFilename?: string;
  savePath?: string;
  format?: "png" | "jpeg";
  width?: number;
  height?: number;
  quality?: number;
  compression?: "none" | "fast" | "best";
}

// OCR Configuration
export interface OCRConfig {
  language: OCRLanguage;
  engineMode: OCREngineMode;
  pageSegMode: OCRPageSegMode;
  whitelist?: string;
  blacklist?: string;
  confidence?: number;
  tessdataPath?: string;
}

export type OCRLanguage = "eng" | "spa" | "fra" | "deu" | "ita" | "por";

export enum OCREngineMode {
  TESSERACT_ONLY = 0,
  LSTM_ONLY = 1,
  TESSERACT_AND_LSTM = 2,
  DEFAULT = 3,
}

export enum OCRPageSegMode {
  OSD_ONLY = 0,
  AUTO_OSD = 1,
  AUTO_ONLY = 2,
  AUTO = 3,
  SINGLE_COLUMN = 4,
  SINGLE_BLOCK_VERT_TEXT = 5,
  SINGLE_BLOCK = 6,
  SINGLE_LINE = 7,
  SINGLE_WORD = 8,
  CIRCLE_WORD = 9,
  SINGLE_CHAR = 10,
  SPARSE_TEXT = 11,
  SPARSE_TEXT_OSD = 12,
  RAW_LINE = 13,
}

// PDF Search Types
export interface PDFSearchResult {
  success: boolean;
  matches: PDFSearchMatch[];
  error?: string;
  totalMatches?: number;
}

export interface PDFSearchMatch {
  pageNumber: number;
  text: string;
  context: string;
  position?: { start: number; end: number };
  confidence?: number;
}

// Text Extraction Types
export interface PDFTextExtractionResult {
  success: boolean;
  text: string;
  error?: string;
  pageCount?: number;
}

// Building Dimensions Types
export interface BuildingDimensions {
  length?: number;
  width?: number;
  height?: number;
  area?: number;
  confidence: number;
  source?: "manual" | "extracted" | "calculated";
}

// PDF.js Types
export interface PDFPageProxy {
  getTextContent(): Promise<PDFTextContent>;
  getOperatorList(): Promise<PDFOperatorList>;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
  objs: {
    get(objId: string): any;
  };
}

export interface PDFTextContent {
  items: PDFTextItem[];
  styles: Record<string, any>;
}

export interface PDFTextItem {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}

export interface PDFOperatorList {
  fnArray: number[];
  argsArray: any[];
}

export interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
  getMetadata(): Promise<PDFDocumentMetadata>;
}

export interface PDFDocumentMetadata {
  info: {
    Title?: string;
    Author?: string;
    Subject?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
  };
  metadata?: any;
}

// Tesseract Types
export interface TesseractWorker {
  recognize(image: HTMLCanvasElement | string | Blob): Promise<TesseractResult>;
  setParameters(params: Record<string, string>): Promise<void>;
  terminate(): Promise<void>;
}

export interface TesseractResult {
  data: {
    text: string;
    confidence: number;
    words: TesseractWord[];
    lines: TesseractLine[];
    paragraphs: TesseractParagraph[];
  };
}

export interface TesseractWord {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface TesseractLine {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  words: TesseractWord[];
}

export interface TesseractParagraph {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  lines: TesseractLine[];
}

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

// Error Types
export class PDFProcessingError extends Error {
  constructor(
    message: string,
    public code: PDFErrorCode,
    public details?: any,
  ) {
    super(message);
    this.name = "PDFProcessingError";
  }
}

export enum PDFErrorCode {
  INVALID_PDF = "INVALID_PDF",
  EXTRACTION_FAILED = "EXTRACTION_FAILED",
  OCR_FAILED = "OCR_FAILED",
  GENERATION_FAILED = "GENERATION_FAILED",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  TIMEOUT = "TIMEOUT",
}
