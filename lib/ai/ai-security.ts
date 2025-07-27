import crypto from "crypto";
import { z } from "zod";
import { ContentFilterError, ValidationError } from "./ai-error-handler";

// Security configuration
export interface SecurityConfig {
  enableContentFiltering: boolean;
  enableInputSanitization: boolean;
  enableOutputValidation: boolean;
  maxInputLength: number;
  maxOutputLength: number;
  allowedFileTypes: string[];
  allowedImageTypes: string[];
  blockedPatterns: RegExp[];
  sensitiveDataPatterns: RegExp[];
}

// Default security configuration
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableContentFiltering: process.env.AI_ENABLE_CONTENT_FILTERING !== "false",
  enableInputSanitization: process.env.AI_ENABLE_INPUT_SANITIZATION !== "false",
  enableOutputValidation: process.env.AI_ENABLE_OUTPUT_VALIDATION !== "false",
  maxInputLength: parseInt(process.env.AI_MAX_INPUT_LENGTH || "50000"),
  maxOutputLength: parseInt(process.env.AI_MAX_OUTPUT_LENGTH || "20000"),
  allowedFileTypes: ["pdf", "txt", "docx", "doc"],
  allowedImageTypes: ["jpg", "jpeg", "png", "gif", "webp"],
  blockedPatterns: [
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b.*\b(FROM|INTO|SET|WHERE|VALUES)\b)/i,
    // Script injection patterns
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi,
    // Command injection patterns
    /(\||&|;|`|\$\(|\${)/g,
    // Path traversal patterns
    /\.\.\//g,
    // Suspicious patterns
    /\b(eval|exec|system|shell_exec|passthru)\b/gi,
  ],
  sensitiveDataPatterns: [
    // Credit card numbers
    /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
    // Social security numbers
    /\b\d{3}-?\d{2}-?\d{4}\b/g,
    // API keys (common patterns)
    /\b[A-Za-z0-9]{32,}\b/g,
    // Passwords (common patterns)
    /\b(password|passwd|pwd)\s*[:=]\s*\S+/gi,
  ],
};

// Content safety levels
export enum SafetyLevel {
  STRICT = "strict",
  MODERATE = "moderate",
  PERMISSIVE = "permissive",
}

// Security scanner class
export class AISecurityScanner {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  // Comprehensive content filtering
  scanContent(
    content: string,
    level: SafetyLevel = SafetyLevel.MODERATE,
  ): {
    safe: boolean;
    violations: string[];
    sanitized: string;
    risk_score: number;
  } {
    const violations: string[] = [];
    let riskScore = 0;
    let sanitized = content;

    if (!this.config.enableContentFiltering) {
      return { safe: true, violations: [], sanitized, risk_score: 0 };
    }

    // Check content length
    if (content.length > this.config.maxInputLength) {
      violations.push(
        `Content exceeds maximum length (${this.config.maxInputLength} chars)`,
      );
      riskScore += 20;
    }

    // Check for blocked patterns
    for (const pattern of this.config.blockedPatterns) {
      if (pattern.test(content)) {
        violations.push(`Blocked pattern detected: ${pattern.source}`);
        riskScore += 30;
        // Remove the pattern from sanitized content
        sanitized = sanitized.replace(pattern, "[FILTERED]");
      }
    }

    // Check for sensitive data
    for (const pattern of this.config.sensitiveDataPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        violations.push(`Sensitive data detected: ${matches.length} instances`);
        riskScore += 15;
        // Mask sensitive data
        sanitized = sanitized.replace(pattern, "[REDACTED]");
      }
    }

    // Additional safety checks based on level
    if (level === SafetyLevel.STRICT) {
      // Check for potential prompt injection
      const promptInjectionPatterns = [
        /ignore\s+previous\s+instructions/gi,
        /forget\s+what\s+i\s+told\s+you/gi,
        /new\s+instructions:/gi,
        /system\s*[:]\s*you\s+are/gi,
      ];

      for (const pattern of promptInjectionPatterns) {
        if (pattern.test(content)) {
          violations.push("Potential prompt injection detected");
          riskScore += 40;
          sanitized = sanitized.replace(pattern, "[PROMPT_INJECTION_FILTERED]");
        }
      }
    }

    // Check for excessive special characters (potential obfuscation)
    const specialCharRatio =
      (content.match(/[^a-zA-Z0-9\s]/g) || []).length / content.length;
    if (specialCharRatio > 0.3) {
      violations.push("High ratio of special characters detected");
      riskScore += 10;
    }

    // Check for very long words (potential buffer overflow attempts)
    const longWords = content.match(/\S{100,}/g);
    if (longWords) {
      violations.push(`Excessively long words detected: ${longWords.length}`);
      riskScore += 15;
    }

    const isSafe =
      riskScore <
      (level === SafetyLevel.STRICT
        ? 20
        : level === SafetyLevel.MODERATE
          ? 40
          : 60);

    return {
      safe: isSafe,
      violations,
      sanitized,
      risk_score: Math.min(riskScore, 100),
    };
  }

  // Sanitize input data
  sanitizeInput(input: any): any {
    if (!this.config.enableInputSanitization) {
      return input;
    }

    if (typeof input === "string") {
      return this.sanitizeString(input);
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeInput(item));
    }

    if (typeof input === "object" && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        const cleanKey = this.sanitizeString(key);
        sanitized[cleanKey] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  // Sanitize string content
  private sanitizeString(str: string): string {
    return str
      .trim()
      .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
      .replace(/[<>\"']/g, "") // Remove HTML/XML characters
      .substring(0, this.config.maxInputLength);
  }

  // Validate URL safety
  validateUrl(url: string): { valid: boolean; reason?: string } {
    try {
      const urlObj = new URL(url);

      // Only allow HTTP and HTTPS
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return { valid: false, reason: "Invalid protocol" };
      }

      // Block local/private IPs
      const hostname = urlObj.hostname;
      if (this.isPrivateIP(hostname)) {
        return { valid: false, reason: "Private IP addresses not allowed" };
      }

      // Check for suspicious domains
      const suspiciousDomains = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "10.",
        "192.168.",
        "172.",
      ];
      if (suspiciousDomains.some((domain) => hostname.includes(domain))) {
        return { valid: false, reason: "Suspicious domain detected" };
      }

      return { valid: true };
    } catch {
      return { valid: false, reason: "Invalid URL format" };
    }
  }

  // Check if IP is private
  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^192\.168\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^127\./,
      /^169\.254\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];

    return privateRanges.some((range) => range.test(ip));
  }

  // Validate file type
  validateFileType(
    filename: string,
    content?: Buffer,
  ): { valid: boolean; reason?: string } {
    const extension = filename.split(".").pop()?.toLowerCase();

    if (!extension) {
      return { valid: false, reason: "No file extension" };
    }

    if (!this.config.allowedFileTypes.includes(extension)) {
      return { valid: false, reason: `File type ${extension} not allowed` };
    }

    // Additional content-based validation
    if (content) {
      const contentType = this.detectFileType(content);
      if (contentType && !this.config.allowedFileTypes.includes(contentType)) {
        return {
          valid: false,
          reason: `Content type mismatch: ${contentType}`,
        };
      }
    }

    return { valid: true };
  }

  // Detect file type from content
  private detectFileType(content: Buffer): string | null {
    const signatures: Record<string, Buffer> = {
      pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]),
      jpg: Buffer.from([0xff, 0xd8, 0xff]),
      png: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      gif: Buffer.from([0x47, 0x49, 0x46]),
    };

    for (const [type, signature] of Object.entries(signatures)) {
      if (content.subarray(0, signature.length).equals(signature)) {
        return type;
      }
    }

    return null;
  }

  // Generate secure request ID
  generateSecureRequestId(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  // Hash sensitive data for logging
  hashSensitiveData(data: string): string {
    return crypto
      .createHash("sha256")
      .update(data)
      .digest("hex")
      .substring(0, 8);
  }

  // Rate limit key generation
  generateRateLimitKey(userId?: string, ip?: string): string {
    if (userId) {
      return `user:${userId}`;
    }
    if (ip) {
      return `ip:${this.hashSensitiveData(ip)}`;
    }
    return "anonymous";
  }
}

// Content validator for AI outputs
export class AIOutputValidator {
  private maxLength: number;

  constructor(maxLength: number = 20000) {
    this.maxLength = maxLength;
  }

  // Validate AI response structure
  validateResponse<T>(response: any, schema: z.ZodSchema<T>): T {
    try {
      // Check basic structure
      if (!response || typeof response !== "object") {
        throw new ValidationError("Invalid response structure", []);
      }

      // Check length if string
      if (typeof response === "string" && response.length > this.maxLength) {
        throw new ValidationError("Response exceeds maximum length", []);
      }

      // Validate against schema
      return schema.parse(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("Response validation failed", error.errors);
      }
      throw error;
    }
  }

  // Check for potentially harmful content in outputs
  scanOutput(content: string): { safe: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for potential data leakage
    if (
      content.includes("API_KEY") ||
      content.includes("password") ||
      content.includes("secret")
    ) {
      issues.push("Potential sensitive data in output");
    }

    // Check for malicious code
    if (/<script|javascript:|data:text\/html/gi.test(content)) {
      issues.push("Potential malicious code in output");
    }

    // Check for prompt injection attempts
    if (/ignore\s+previous\s+instructions/gi.test(content)) {
      issues.push("Potential prompt injection in output");
    }

    return {
      safe: issues.length === 0,
      issues,
    };
  }
}

// Security middleware for AI operations
export function withSecurity<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  config: {
    scanInput?: boolean;
    scanOutput?: boolean;
    safetyLevel?: SafetyLevel;
    validateUrls?: boolean;
  } = {},
) {
  const scanner = new AISecurityScanner();
  const validator = new AIOutputValidator();

  return async (...args: T): Promise<R> => {
    // Scan inputs if enabled
    if (config.scanInput) {
      for (const arg of args) {
        if (typeof arg === "string") {
          const scanResult = scanner.scanContent(arg, config.safetyLevel);
          if (!scanResult.safe) {
            throw new ContentFilterError(
              `Input failed security scan: ${scanResult.violations.join(", ")}`,
            );
          }
        }
      }
    }

    // Validate URLs if enabled
    if (config.validateUrls) {
      for (const arg of args) {
        if (
          typeof arg === "string" &&
          (arg.startsWith("http://") || arg.startsWith("https://"))
        ) {
          const urlValidation = scanner.validateUrl(arg);
          if (!urlValidation.valid) {
            throw new ValidationError(
              `Invalid URL: ${urlValidation.reason}`,
              [],
            );
          }
        }
      }
    }

    // Execute operation
    const result = await operation(...args);

    // Scan output if enabled
    if (config.scanOutput && typeof result === "string") {
      const outputScan = validator.scanOutput(result);
      if (!outputScan.safe) {
        throw new ContentFilterError(
          `Output failed security scan: ${outputScan.issues.join(", ")}`,
        );
      }
    }

    return result;
  };
}

// Export singleton instances
export const securityScanner = new AISecurityScanner();
export const outputValidator = new AIOutputValidator();

// Additional exports for compatibility
export const validateAIInput = (input: any): any => {
  return securityScanner.sanitizeInput(input);
};

export const sanitizeAIResponse = (response: any): any => {
  if (typeof response === "string") {
    const scanResult = outputValidator.scanOutput(response);
    if (!scanResult.safe) {
      console.warn("AI response contains potential issues:", scanResult.issues);
    }
  }
  return response;
};

export const validateAIRequest = async (request: any): Promise<void> => {
  // Basic request validation
  if (!request || typeof request !== "object") {
    throw new ValidationError("Invalid request format", []);
  }

  // Scan any string properties
  for (const [key, value] of Object.entries(request)) {
    if (typeof value === "string") {
      const scanResult = securityScanner.scanContent(value);
      if (!scanResult.safe) {
        throw new ContentFilterError(
          `Request field ${key} failed security scan: ${scanResult.violations.join(", ")}`,
        );
      }
    }
  }
};
