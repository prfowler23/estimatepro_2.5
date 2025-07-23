// PHASE 2 FIX: Comprehensive data sanitization and security validation
import DOMPurify from "isomorphic-dompurify";
import { z } from "zod";

// Security-focused validation schemas
export const SecurityValidationSchemas = {
  // Text input sanitization
  safeText: z
    .string()
    .max(10000, "Text too long")
    .refine(
      (val) => !containsMaliciousPatterns(val),
      "Contains potentially malicious content",
    )
    .transform((val) => sanitizeText(val)),

  // Email validation with security checks
  secureEmail: z
    .string()
    .email("Invalid email format")
    .max(254, "Email too long")
    .refine((val) => !containsSuspiciousEmail(val), "Suspicious email pattern")
    .transform((val) => val.toLowerCase().trim()),

  // Phone number validation
  securePhone: z
    .string()
    .max(20, "Phone number too long")
    .regex(/^[\d\s\-\+\(\)\.]+$/, "Invalid phone number format")
    .transform((val) => sanitizePhoneNumber(val)),

  // URL validation
  secureUrl: z
    .string()
    .url("Invalid URL format")
    .max(2048, "URL too long")
    .refine((val) => isSecureUrl(val), "URL not allowed")
    .transform((val) => sanitizeUrl(val)),

  // File name validation
  secureFileName: z
    .string()
    .max(255, "File name too long")
    .regex(/^[a-zA-Z0-9\-_\.\s]+$/, "Invalid file name characters")
    .refine(
      (val) => !containsDangerousExtensions(val),
      "Potentially dangerous file type",
    )
    .transform((val) => sanitizeFileName(val)),

  // Numeric validation with bounds
  secureNumber: z
    .number()
    .finite("Number must be finite")
    .safe("Number out of safe range"),

  // Coordinate validation
  coordinate: z
    .number()
    .min(-180, "Invalid coordinate")
    .max(180, "Invalid coordinate")
    .finite("Coordinate must be finite"),

  // Currency amount validation
  currencyAmount: z
    .number()
    .min(0, "Amount cannot be negative")
    .max(999999999.99, "Amount too large")
    .finite("Amount must be finite"),
};

// XSS and injection pattern detection
function containsMaliciousPatterns(text: string): boolean {
  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
    /javascript\s*:/gi, // JavaScript protocols
    /on\w+\s*=/gi, // Event handlers
    /data:text\/html/gi, // Data URLs with HTML
    /vbscript\s*:/gi, // VBScript protocols
    /<iframe\b[^>]*>/gi, // Iframe tags
    /<object\b[^>]*>/gi, // Object tags
    /<embed\b[^>]*>/gi, // Embed tags
    /expression\s*\(/gi, // CSS expressions
    /import\s*\(/gi, // ES6 imports
    /eval\s*\(/gi, // Eval calls
    /Function\s*\(/gi, // Function constructor
    /setTimeout\s*\(/gi, // setTimeout
    /setInterval\s*\(/gi, // setInterval
  ];

  return maliciousPatterns.some((pattern) => pattern.test(text));
}

// SQL injection pattern detection
function containsSqlInjection(text: string): boolean {
  const sqlPatterns = [
    /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/gi,
    /\b(select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(from|into|table|database|schema)\b/gi,
    /(\bor\b|\band\b)?\s*\d+\s*=\s*\d+/gi, // 1=1 type injections
    /\'\s*(or|and)\s*\'\w*\'\s*=\s*\'\w*\'/gi, // 'or'a'='a type injections
    /;\s*(drop|delete|truncate|alter)\b/gi, // Stacked queries
    /\/\*.*\*\//gi, // SQL comments
    /--\s*.*$/gm, // SQL line comments
  ];

  return sqlPatterns.some((pattern) => pattern.test(text));
}

// Email security validation
function containsSuspiciousEmail(email: string): boolean {
  const suspiciousPatterns = [
    /\+.*\+/g, // Multiple + symbols
    /\.{2,}/g, // Multiple consecutive dots
    /@.*@/g, // Multiple @ symbols
    /[<>]/g, // Angle brackets
    /javascript:/gi, // JavaScript protocol
    /data:/gi, // Data protocol
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(email));
}

// URL security validation
function isSecureUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow secure protocols
    const allowedProtocols = ["https:", "http:", "mailto:", "tel:"];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return false;
    }

    // Block suspicious hostnames
    const suspiciousPatterns = [
      /localhost/gi,
      /127\.0\.0\.1/gi,
      /0\.0\.0\.0/gi,
      /192\.168\./gi,
      /10\./gi,
      /172\.16\./gi,
    ];

    if (parsed.protocol !== "mailto:" && parsed.protocol !== "tel:") {
      if (suspiciousPatterns.some((pattern) => pattern.test(parsed.hostname))) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

// Dangerous file extension detection
function containsDangerousExtensions(fileName: string): boolean {
  const dangerousExtensions = [
    ".exe",
    ".bat",
    ".cmd",
    ".com",
    ".pif",
    ".scr",
    ".vbs",
    ".js",
    ".jar",
    ".ps1",
    ".sh",
    ".php",
    ".asp",
    ".aspx",
    ".jsp",
    ".jspx",
    ".cgi",
    ".pl",
    ".py",
    ".rb",
    ".go",
    ".c",
    ".cpp",
    ".cs",
    ".vb",
  ];

  const lowerFileName = fileName.toLowerCase();
  return dangerousExtensions.some((ext) => lowerFileName.endsWith(ext));
}

// Text sanitization
function sanitizeText(text: string): string {
  // Remove null bytes and control characters
  let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  // Normalize unicode
  sanitized = sanitized.normalize("NFC");

  // Use DOMPurify to clean HTML content
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content
  });

  return sanitized;
}

// Phone number sanitization
function sanitizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters except +
  let sanitized = phone.replace(/[^\d\+]/g, "");

  // Ensure only one + at the beginning
  if (sanitized.includes("+")) {
    const parts = sanitized.split("+");
    sanitized = "+" + parts[parts.length - 1];
  }

  return sanitized;
}

// URL sanitization
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Reconstruct URL to remove any malicious components
    return parsed.toString();
  } catch {
    return "";
  }
}

// File name sanitization
function sanitizeFileName(fileName: string): string {
  // Replace dangerous characters
  let sanitized = fileName.replace(/[<>:"/\\|?*]/g, "_");

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\.\s]+|[\.\s]+$/g, "");

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.lastIndexOf(".");
    if (ext > 0) {
      const name = sanitized.substring(0, ext);
      const extension = sanitized.substring(ext);
      sanitized = name.substring(0, 255 - extension.length) + extension;
    } else {
      sanitized = sanitized.substring(0, 255);
    }
  }

  return sanitized;
}

// Comprehensive data sanitization for guided flow data
export class DataSanitizer {
  // Sanitize complete guided flow data
  static sanitizeGuidedFlowData(data: any): any {
    if (!data || typeof data !== "object") {
      return {};
    }

    const sanitized = { ...data };

    // Initial Contact sanitization
    if (sanitized.initialContact) {
      sanitized.initialContact = this.sanitizeInitialContact(
        sanitized.initialContact,
      );
    }

    // Scope Details sanitization
    if (sanitized.scopeDetails) {
      sanitized.scopeDetails = this.sanitizeScopeDetails(
        sanitized.scopeDetails,
      );
    }

    // Files/Photos sanitization
    if (sanitized.filesPhotos) {
      sanitized.filesPhotos = this.sanitizeFilesPhotos(sanitized.filesPhotos);
    }

    // Area of Work sanitization
    if (sanitized.areaOfWork) {
      sanitized.areaOfWork = this.sanitizeAreaOfWork(sanitized.areaOfWork);
    }

    // Takeoff sanitization
    if (sanitized.takeoff) {
      sanitized.takeoff = this.sanitizeTakeoff(sanitized.takeoff);
    }

    // Duration sanitization
    if (sanitized.duration) {
      sanitized.duration = this.sanitizeDuration(sanitized.duration);
    }

    // Expenses sanitization
    if (sanitized.expenses) {
      sanitized.expenses = this.sanitizeExpenses(sanitized.expenses);
    }

    // Pricing sanitization
    if (sanitized.pricing) {
      sanitized.pricing = this.sanitizePricing(sanitized.pricing);
    }

    // Summary sanitization
    if (sanitized.summary) {
      sanitized.summary = this.sanitizeSummary(sanitized.summary);
    }

    return sanitized;
  }

  private static sanitizeInitialContact(data: any): any {
    return {
      ...data,
      contactMethod: this.sanitizeEnum(data.contactMethod, [
        "email",
        "meeting",
        "phone",
        "walkin",
      ]),
      originalContent: this.sanitizeString(data.originalContent),
      extractedData: data.extractedData
        ? {
            ...data.extractedData,
            customer: data.extractedData.customer
              ? {
                  name: this.sanitizeString(data.extractedData.customer.name),
                  email: data.extractedData.customer.email
                    ? this.sanitizeEmail(data.extractedData.customer.email)
                    : undefined,
                  phone: data.extractedData.customer.phone
                    ? this.sanitizePhoneNumber(
                        data.extractedData.customer.phone,
                      )
                    : undefined,
                  company: data.extractedData.customer.company
                    ? this.sanitizeString(data.extractedData.customer.company)
                    : undefined,
                }
              : undefined,
            requirements: data.extractedData.requirements
              ? {
                  services: Array.isArray(
                    data.extractedData.requirements.services,
                  )
                    ? data.extractedData.requirements.services.map((s: any) =>
                        this.sanitizeString(s),
                      )
                    : [],
                  buildingType: this.sanitizeString(
                    data.extractedData.requirements.buildingType,
                  ),
                  location: data.extractedData.requirements.location
                    ? this.sanitizeString(
                        data.extractedData.requirements.location,
                      )
                    : undefined,
                }
              : undefined,
          }
        : undefined,
    };
  }

  private static sanitizeScopeDetails(data: any): any {
    return {
      ...data,
      selectedServices: Array.isArray(data.selectedServices)
        ? data.selectedServices.map((s: any) => this.sanitizeString(s))
        : [],
      serviceOrder: Array.isArray(data.serviceOrder)
        ? data.serviceOrder.map((s: any) => this.sanitizeString(s))
        : [],
      autoAddedServices: Array.isArray(data.autoAddedServices)
        ? data.autoAddedServices.map((s: any) => this.sanitizeString(s))
        : [],
      scopeNotes: data.scopeNotes
        ? this.sanitizeString(data.scopeNotes)
        : undefined,
      accessRestrictions: Array.isArray(data.accessRestrictions)
        ? data.accessRestrictions.map((r: any) => this.sanitizeString(r))
        : [],
      specialRequirements: Array.isArray(data.specialRequirements)
        ? data.specialRequirements.map((r: any) => this.sanitizeString(r))
        : [],
    };
  }

  private static sanitizeFilesPhotos(data: any): any {
    return {
      ...data,
      files: Array.isArray(data.files)
        ? data.files.map((file: any) => ({
            ...file,
            id: this.sanitizeString(file.id),
            name: file.name ? this.sanitizeFileName(file.name) : undefined,
            type: this.sanitizeEnum(file.type, [
              "photo",
              "video",
              "area_map",
              "measurement_screenshot",
              "plan",
            ]),
            status: this.sanitizeEnum(file.status, [
              "pending",
              "analyzing",
              "complete",
              "error",
            ]),
          }))
        : [],
      analysisComplete: Boolean(data.analysisComplete),
      summary: data.summary
        ? {
            totalPhotos: this.sanitizeNumber(data.summary.totalPhotos),
            analyzedPhotos: this.sanitizeNumber(data.summary.analyzedPhotos),
            totalWindows: data.summary.totalWindows
              ? this.sanitizeNumber(data.summary.totalWindows)
              : undefined,
            totalArea: data.summary.totalArea
              ? this.sanitizeNumber(data.summary.totalArea)
              : undefined,
            measurements: data.summary.measurements
              ? {
                  stories: data.summary.measurements.stories
                    ? this.sanitizeNumber(data.summary.measurements.stories)
                    : undefined,
                  buildingHeight: data.summary.measurements.buildingHeight
                    ? this.sanitizeNumber(
                        data.summary.measurements.buildingHeight,
                      )
                    : undefined,
                }
              : undefined,
          }
        : undefined,
    };
  }

  private static sanitizeAreaOfWork(data: any): any {
    return {
      ...data,
      workAreas: Array.isArray(data.workAreas)
        ? data.workAreas.map((area: any) => ({
            ...area,
            id: this.sanitizeString(area.id),
            name: this.sanitizeString(area.name),
            area: this.sanitizeNumber(area.area),
            perimeter: this.sanitizeNumber(area.perimeter),
          }))
        : [],
      scale: data.scale
        ? {
            pixelsPerFoot: this.sanitizeNumber(data.scale.pixelsPerFoot),
            isSet: Boolean(data.scale.isSet),
          }
        : undefined,
      notes: data.notes ? this.sanitizeString(data.notes) : undefined,
      backgroundImage: data.backgroundImage
        ? this.sanitizeString(data.backgroundImage)
        : undefined,
    };
  }

  private static sanitizeTakeoff(data: any): any {
    return {
      ...data,
      measurements: Array.isArray(data.measurements)
        ? data.measurements.map((measurement: any) => ({
            ...measurement,
            category: this.sanitizeString(measurement.category),
            subcategory: this.sanitizeString(measurement.subcategory),
            quantity: this.sanitizeNumber(measurement.quantity),
            unit: this.sanitizeString(measurement.unit),
            notes: measurement.notes
              ? this.sanitizeString(measurement.notes)
              : undefined,
          }))
        : [],
      totalQuantities: this.sanitizeObjectNumbers(data.totalQuantities),
      qualityFactors: data.qualityFactors
        ? {
            accessibility: this.sanitizeEnum(
              data.qualityFactors.accessibility,
              ["easy", "moderate", "difficult"],
            ),
            complexity: this.sanitizeEnum(data.qualityFactors.complexity, [
              "simple",
              "moderate",
              "complex",
            ]),
            safetyRisk: this.sanitizeEnum(data.qualityFactors.safetyRisk, [
              "low",
              "medium",
              "high",
            ]),
          }
        : undefined,
    };
  }

  private static sanitizeDuration(data: any): any {
    return {
      ...data,
      timeline: data.timeline
        ? {
            startDate: this.sanitizeString(data.timeline.startDate),
            endDate: this.sanitizeString(data.timeline.endDate),
            totalDays: this.sanitizeNumber(data.timeline.totalDays),
          }
        : undefined,
      weatherAnalysis: data.weatherAnalysis
        ? {
            riskLevel: this.sanitizeEnum(data.weatherAnalysis.riskLevel, [
              "low",
              "medium",
              "high",
            ]),
            recommendations: Array.isArray(data.weatherAnalysis.recommendations)
              ? data.weatherAnalysis.recommendations.map((r: any) =>
                  this.sanitizeString(r),
                )
              : [],
            riskScore: data.weatherAnalysis.riskScore
              ? this.sanitizeNumber(data.weatherAnalysis.riskScore)
              : undefined,
          }
        : undefined,
      manualOverrides: Array.isArray(data.manualOverrides)
        ? data.manualOverrides.map((override: any) => ({
            service: this.sanitizeString(override.service),
            originalDuration: this.sanitizeNumber(override.originalDuration),
            adjustedDuration: this.sanitizeNumber(override.adjustedDuration),
            reason: this.sanitizeString(override.reason),
          }))
        : [],
    };
  }

  private static sanitizeExpenses(data: any): any {
    return {
      ...data,
      equipment: Array.isArray(data.equipment)
        ? data.equipment.map((item: any) => ({
            item: this.sanitizeString(item.item),
            cost: this.sanitizeCurrency(item.cost),
            quantity: this.sanitizeNumber(item.quantity),
          }))
        : [],
      materials: Array.isArray(data.materials)
        ? data.materials.map((item: any) => ({
            item: this.sanitizeString(item.item),
            cost: this.sanitizeCurrency(item.cost),
            quantity: this.sanitizeNumber(item.quantity),
          }))
        : [],
      labor: Array.isArray(data.labor)
        ? data.labor.map((item: any) => ({
            role: this.sanitizeString(item.role),
            hours: this.sanitizeNumber(item.hours),
            rate: this.sanitizeCurrency(item.rate),
          }))
        : [],
      totalCosts: data.totalCosts
        ? {
            equipment: this.sanitizeCurrency(data.totalCosts.equipment),
            materials: this.sanitizeCurrency(data.totalCosts.materials),
            labor: this.sanitizeCurrency(data.totalCosts.labor),
            other: this.sanitizeCurrency(data.totalCosts.other),
            grand: this.sanitizeCurrency(data.totalCosts.grand),
            total: this.sanitizeCurrency(data.totalCosts.total),
          }
        : undefined,
    };
  }

  private static sanitizePricing(data: any): any {
    return {
      ...data,
      strategy: this.sanitizeEnum(data.strategy, [
        "competitive",
        "value_based",
        "cost_plus",
      ]),
      basePrice: this.sanitizeCurrency(data.basePrice),
      finalPrice: this.sanitizeCurrency(data.finalPrice),
      adjustments: Array.isArray(data.adjustments)
        ? data.adjustments.map((adj: any) => ({
            type: this.sanitizeString(adj.type),
            amount: this.sanitizeNumber(adj.amount),
            reason: this.sanitizeString(adj.reason),
          }))
        : [],
      profitMargin: data.profitMargin
        ? this.sanitizeNumber(data.profitMargin)
        : undefined,
      winProbability: data.winProbability
        ? this.sanitizeNumber(data.winProbability)
        : undefined,
      competitiveAnalysis: data.competitiveAnalysis
        ? {
            marketRate: data.competitiveAnalysis.marketRate
              ? this.sanitizeCurrency(data.competitiveAnalysis.marketRate)
              : undefined,
            winProbability: data.competitiveAnalysis.winProbability
              ? this.sanitizeNumber(data.competitiveAnalysis.winProbability)
              : undefined,
          }
        : undefined,
    };
  }

  private static sanitizeSummary(data: any): any {
    return {
      ...data,
      customerApproval: Boolean(data.customerApproval),
      proposalFormat: this.sanitizeEnum(data.proposalFormat, [
        "pdf",
        "word",
        "html",
      ]),
      deliveryMethod: this.sanitizeEnum(data.deliveryMethod, [
        "email",
        "print",
        "portal",
      ]),
      followUpDate: this.sanitizeString(data.followUpDate),
      terms: data.terms
        ? {
            paymentTerms: this.sanitizeString(data.terms.paymentTerms),
            warranty: this.sanitizeString(data.terms.warranty),
            validUntil: this.sanitizeString(data.terms.validUntil),
          }
        : undefined,
    };
  }

  // Helper sanitization methods
  private static sanitizeString(value: any): string {
    if (typeof value !== "string") {
      return "";
    }

    try {
      return SecurityValidationSchemas.safeText.parse(value);
    } catch {
      return "";
    }
  }

  private static sanitizeEmail(value: any): string {
    if (typeof value !== "string") {
      return "";
    }

    try {
      return SecurityValidationSchemas.secureEmail.parse(value);
    } catch {
      return "";
    }
  }

  private static sanitizePhoneNumber(value: any): string {
    if (typeof value !== "string") {
      return "";
    }

    try {
      return SecurityValidationSchemas.securePhone.parse(value);
    } catch {
      return "";
    }
  }

  private static sanitizeFileName(value: any): string {
    if (typeof value !== "string") {
      return "";
    }

    try {
      return SecurityValidationSchemas.secureFileName.parse(value);
    } catch {
      return "";
    }
  }

  private static sanitizeNumber(value: any): number {
    if (typeof value === "number") {
      try {
        return SecurityValidationSchemas.secureNumber.parse(value);
      } catch {
        return 0;
      }
    }

    if (typeof value === "string") {
      const num = parseFloat(value);
      if (!isNaN(num) && isFinite(num)) {
        try {
          return SecurityValidationSchemas.secureNumber.parse(num);
        } catch {
          return 0;
        }
      }
    }

    return 0;
  }

  private static sanitizeCurrency(value: any): number {
    const num = this.sanitizeNumber(value);
    try {
      return SecurityValidationSchemas.currencyAmount.parse(num);
    } catch {
      return 0;
    }
  }

  private static sanitizeEnum(value: any, allowedValues: string[]): string {
    if (typeof value === "string" && allowedValues.includes(value)) {
      return value;
    }
    return allowedValues[0] || "";
  }

  private static sanitizeObjectNumbers(obj: any): Record<string, number> {
    if (!obj || typeof obj !== "object") {
      return {};
    }

    const sanitized: Record<string, number> = {};
    Object.keys(obj).forEach((key) => {
      const sanitizedKey = this.sanitizeString(key);
      if (sanitizedKey) {
        sanitized[sanitizedKey] = this.sanitizeNumber(obj[key]);
      }
    });

    return sanitized;
  }
}

// Export validation utilities
export const ValidationUtils = {
  containsMaliciousPatterns,
  containsSqlInjection,
  containsSuspiciousEmail,
  isSecureUrl,
  containsDangerousExtensions,
  sanitizeText,
  sanitizePhoneNumber,
  sanitizeUrl,
  sanitizeFileName,
};

export default DataSanitizer;
