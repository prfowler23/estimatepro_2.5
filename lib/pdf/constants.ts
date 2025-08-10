// PDF Generation Constants
export const PDF_GENERATION = {
  // Page Layout
  PAGE: {
    MARGIN: 20,
    FOOTER_HEIGHT: 30,
  },

  // Company Information
  COMPANY: {
    NAME: "EstimatePro",
    TAGLINE: "Building Services",
    SUBTITLE: "Estimation",
    FULL_NAME: "Professional Building Services",
    PHONE: "(555) 123-4567",
    EMAIL: "estimates@estimatepro.com",
    WEBSITE: "www.estimatepro.com",
  },

  // Colors (RGB values)
  COLORS: {
    PRIMARY: { r: 59, g: 130, b: 246 }, // Blue
    WHITE: { r: 255, g: 255, b: 255 },
    BLACK: { r: 0, g: 0, b: 0 },
    GRAY: { r: 100, g: 100, b: 100 },
  },

  // Font Sizes
  FONTS: {
    TITLE: 24,
    SECTION_HEADER: 14,
    LARGE: 16,
    NORMAL: 12,
    BODY: 11,
    SMALL: 10,
    FINE_PRINT: 9,
    FOOTER: 8,
  },

  // Logo Box Dimensions
  LOGO: {
    WIDTH: 60,
    HEIGHT: 30,
    TEXT_OFFSET_X: 5,
    TEXT_OFFSET_Y_PRIMARY: 12,
    TEXT_OFFSET_Y_SECONDARY: 20,
    TEXT_OFFSET_Y_TERTIARY: 26,
  },

  // Table Configuration
  TABLE: {
    COLUMNS: {
      SERVICE: { width: 35 },
      AREA: { width: 30 },
      HOURS: { width: 30 },
      CREW: { width: 20 },
      EQUIPMENT: { width: 30 },
      PRICE: { width: 25, align: "right" as const },
    },
    CELL_PADDING: 3,
  },

  // Terms and Conditions
  TERMS: [
    "• Estimate valid for 30 days from date issued",
    "• Payment terms: Net 30 days",
    "• All work performed during normal business hours unless otherwise specified",
    "• Additional charges may apply for work outside normal scope",
    "• Customer responsible for providing safe access to work areas",
    "• Weather delays may affect project timeline",
    "• Final pricing subject to site inspection and access verification",
  ],

  // Spacing
  SPACING: {
    SECTION_GAP: 20,
    LINE_HEIGHT: 5,
    SMALL_GAP: 8,
    MEDIUM_GAP: 10,
    LARGE_GAP: 15,
    HEADER_HEIGHT: 40,
    LINE_SPACING: 6,
  },

  // Document Properties
  DOCUMENT: {
    ESTIMATE_TITLE: "ESTIMATE",
    BILL_TO_LABEL: "BILL TO:",
    PROJECT_LOCATION_LABEL: "PROJECT LOCATION:",
    SERVICES_BREAKDOWN_LABEL: "SERVICES BREAKDOWN",
    NOTES_LABEL: "NOTES:",
    TERMS_LABEL: "TERMS & CONDITIONS:",
    CUSTOMER_APPROVAL_LABEL: "Customer Approval:",
    DATE_LABEL: "Date:",
  },

  // Validation
  VALIDATION: {
    MAX_NOTES_LENGTH: 5000,
    MAX_FILENAME_LENGTH: 255,
    MIN_SERVICES: 1,
  },
};

// PDF Processing Constants
export const PDF_PROCESSING = {
  // OCR Configuration
  OCR: {
    DEFAULT_LANGUAGE: "eng" as const,
    DEFAULT_ENGINE_MODE: 1, // LSTM only
    DEFAULT_PAGE_SEG_MODE: 6, // Uniform block of text
    DEFAULT_WHITELIST:
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'\".,:-+()[]{}/* \n\t",
    MIN_CONFIDENCE: 0.1,
    MAX_CONFIDENCE: 1.0,
  },

  // Image Processing
  IMAGE: {
    DEFAULT_DENSITY: 150,
    DEFAULT_QUALITY: 100,
    DEFAULT_FORMAT: "png" as const,
    MAX_WIDTH: 4096,
    MAX_HEIGHT: 4096,
    SUPPORTED_FORMATS: ["jpeg", "png", "gif", "rgb", "rgba"] as const,
  },

  // File Size Limits
  LIMITS: {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    MAX_PAGES: 500,
    MAX_IMAGES_PER_PAGE: 50,
    MAX_OCR_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  },

  // Performance
  PERFORMANCE: {
    DEFAULT_RETRY_COUNT: 3,
    RETRY_DELAY: 1000, // ms
    OCR_TIMEOUT: 30000, // ms
    EXTRACTION_TIMEOUT: 60000, // ms
    CHUNK_SIZE: 10, // pages per chunk for large PDFs
  },

  // Search Configuration
  SEARCH: {
    CONTEXT_BEFORE: 50, // characters
    CONTEXT_AFTER: 50, // characters
    MAX_MATCHES_PER_PAGE: 100,
  },

  // Worker Configuration
  WORKER: {
    PDFJS_CDN_URL: "https://unpkg.com/pdfjs-dist@",
    WORKER_FILE: "/pdf.worker.min.js",
    WORKER_POOL_SIZE: 4,
  },
};

// Measurement Detection Patterns
export const MEASUREMENT_PATTERNS = [
  // Dimensions: "12 ft", "15'", "20 feet", "10.5 m", "25 cm"
  {
    regex: /(\d+(?:\.\d+)?)\s*(?:ft|feet|'|foot)\b/gi,
    unit: "feet" as const,
    type: "dimension" as const,
  },
  {
    regex: /(\d+(?:\.\d+)?)\s*(?:in|inches|"|inch)\b/gi,
    unit: "inches" as const,
    type: "dimension" as const,
  },
  {
    regex: /(\d+(?:\.\d+)?)\s*(?:m|meters?|metre?s?)\b/gi,
    unit: "meters" as const,
    type: "dimension" as const,
  },
  {
    regex: /(\d+(?:\.\d+)?)\s*(?:cm|centimeters?|centimetre?s?)\b/gi,
    unit: "centimeters" as const,
    type: "dimension" as const,
  },
  // Areas: "1200 sq ft", "500 sqft", "25 m²"
  {
    regex: /(\d+(?:\.\d+)?)\s*(?:sq\s*ft|sqft|square\s*feet)\b/gi,
    unit: "square_feet" as const,
    type: "area" as const,
  },
  {
    regex: /(\d+(?:\.\d+)?)\s*(?:sq\s*m|sqm|square\s*meters?|m²)\b/gi,
    unit: "square_meters" as const,
    type: "area" as const,
  },
  // Scale indicators: "1:100", "1\"=10'", "Scale: 1/4\"=1'"
  {
    regex: /(?:scale[\s:]*)?1["']?\s*[=:]\s*(\d+(?:\.\d+)?)\s*["']?/gi,
    unit: "scale_ratio" as const,
    type: "scale" as const,
  },
  {
    regex: /1\s*:\s*(\d+(?:\.\d+)?)/gi,
    unit: "scale_ratio" as const,
    type: "scale" as const,
  },
];

// Unit Conversion Factors
export const UNIT_CONVERSIONS = {
  // Length conversions to feet
  LENGTH_TO_FEET: {
    feet: 1,
    inches: 1 / 12,
    meters: 3.281,
    centimeters: 0.0328,
  },

  // Area conversions to square feet
  AREA_TO_SQFT: {
    square_feet: 1,
    square_meters: 10.764,
  },
};

// Error Messages
export const PDF_ERRORS = {
  INVALID_PDF: "The provided file is not a valid PDF",
  EXTRACTION_FAILED: "Failed to extract content from PDF",
  OCR_FAILED: "Optical character recognition failed",
  GENERATION_FAILED: "Failed to generate PDF document",
  FILE_TOO_LARGE: "PDF file exceeds maximum size limit",
  UNSUPPORTED_FORMAT: "Unsupported file format",
  PERMISSION_DENIED: "Permission denied to access this PDF",
  TIMEOUT: "Operation timed out",
  NO_SERVICES: "No services provided for PDF generation",
  INVALID_ESTIMATE_DATA: "Invalid estimate data provided",
  WORKER_INIT_FAILED: "Failed to initialize PDF worker",
  IMAGE_CONVERSION_FAILED: "Failed to convert PDF to images",
  SEARCH_FAILED: "Search operation failed",
  METADATA_EXTRACTION_FAILED: "Failed to extract PDF metadata",
};
