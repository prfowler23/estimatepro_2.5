import { z } from "zod";
import { NextRequest } from "next/server";

export interface SecurityAuditResult {
  passed: boolean;
  vulnerabilities: SecurityVulnerability[];
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendations: string[];
}

export interface SecurityVulnerability {
  type: "xss" | "sqli" | "csrf" | "rce" | "path_traversal" | "size_limit";
  severity: "low" | "medium" | "high" | "critical";
  field: string;
  value: string;
  description: string;
  mitigation: string;
}

const SECURITY_PATTERNS = {
  xss: [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
  ],
  sqli: [
    /('|(\\')|(;|\\x3b)|(\\||\\x7c))/gi,
    /(union|select|insert|delete|update|drop|create|alter|exec|execute)/gi,
    /--\s*$/gi,
    /\/\*.*?\*\//gi,
  ],
  pathTraversal: [/\.\.[\\/]/g, /\.\.%2f/gi, /\.\.%5c/gi, /%2e%2e/gi],
  rce: [
    /(eval|exec|system|shell_exec|passthru|proc_open)/gi,
    /\$\(/g,
    /`[^`]*`/g,
  ],
};

const MAX_SIZES = {
  text: 10000, // 10KB
  file: 10 * 1024 * 1024, // 10MB
  array: 1000,
  object: 100,
};

export class SecurityAuditor {
  private static instance: SecurityAuditor;

  public static getInstance(): SecurityAuditor {
    if (!SecurityAuditor.instance) {
      SecurityAuditor.instance = new SecurityAuditor();
    }
    return SecurityAuditor.instance;
  }

  public auditRequest(request: NextRequest, body?: any): SecurityAuditResult {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Audit URL parameters
    const url = new URL(request.url);
    for (const [key, value] of url.searchParams.entries()) {
      vulnerabilities.push(
        ...this.scanForVulnerabilities(key, value, "url_param"),
      );
    }

    // Audit headers
    request.headers.forEach((value, key) => {
      vulnerabilities.push(
        ...this.scanForVulnerabilities(key, value, "header"),
      );
    });

    // Audit body if provided
    if (body) {
      vulnerabilities.push(...this.auditObject(body, "body"));
    }

    const riskLevel = this.calculateRiskLevel(vulnerabilities);
    const recommendations = this.generateRecommendations(vulnerabilities);

    return {
      passed: riskLevel !== "critical",
      vulnerabilities,
      riskLevel,
      recommendations,
    };
  }

  private scanForVulnerabilities(
    field: string,
    value: string,
    context: string,
  ): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    if (typeof value !== "string") return vulnerabilities;

    // Size limits
    if (value.length > MAX_SIZES.text) {
      vulnerabilities.push({
        type: "size_limit",
        severity: "medium",
        field: `${context}.${field}`,
        value: value.substring(0, 100) + "...",
        description: `Field exceeds maximum size limit (${value.length} > ${MAX_SIZES.text})`,
        mitigation: "Implement proper input size validation",
      });
    }

    // XSS Detection
    for (const pattern of SECURITY_PATTERNS.xss) {
      if (pattern.test(value)) {
        vulnerabilities.push({
          type: "xss",
          severity: "high",
          field: `${context}.${field}`,
          value: value.substring(0, 100) + "...",
          description: "Potential XSS vulnerability detected",
          mitigation: "Sanitize input using DOMPurify or similar library",
        });
        break;
      }
    }

    // SQL Injection Detection
    for (const pattern of SECURITY_PATTERNS.sqli) {
      if (pattern.test(value)) {
        vulnerabilities.push({
          type: "sqli",
          severity: "critical",
          field: `${context}.${field}`,
          value: value.substring(0, 100) + "...",
          description: "Potential SQL injection vulnerability detected",
          mitigation: "Use parameterized queries and input validation",
        });
        break;
      }
    }

    // Path Traversal Detection
    for (const pattern of SECURITY_PATTERNS.pathTraversal) {
      if (pattern.test(value)) {
        vulnerabilities.push({
          type: "path_traversal",
          severity: "high",
          field: `${context}.${field}`,
          value: value.substring(0, 100) + "...",
          description: "Potential path traversal vulnerability detected",
          mitigation:
            "Validate and sanitize file paths, use whitelist approach",
        });
        break;
      }
    }

    // RCE Detection
    for (const pattern of SECURITY_PATTERNS.rce) {
      if (pattern.test(value)) {
        vulnerabilities.push({
          type: "rce",
          severity: "critical",
          field: `${context}.${field}`,
          value: value.substring(0, 100) + "...",
          description: "Potential remote code execution vulnerability detected",
          mitigation: "Never execute user input, use safe alternatives",
        });
        break;
      }
    }

    return vulnerabilities;
  }

  private auditObject(obj: any, path: string = ""): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    if (Array.isArray(obj)) {
      if (obj.length > MAX_SIZES.array) {
        vulnerabilities.push({
          type: "size_limit",
          severity: "medium",
          field: path,
          value: `Array with ${obj.length} items`,
          description: `Array exceeds maximum size limit (${obj.length} > ${MAX_SIZES.array})`,
          mitigation: "Implement proper array size validation",
        });
      }

      obj.forEach((item, index) => {
        vulnerabilities.push(...this.auditObject(item, `${path}[${index}]`));
      });
    } else if (obj && typeof obj === "object") {
      const keys = Object.keys(obj);
      if (keys.length > MAX_SIZES.object) {
        vulnerabilities.push({
          type: "size_limit",
          severity: "medium",
          field: path,
          value: `Object with ${keys.length} properties`,
          description: `Object exceeds maximum property limit (${keys.length} > ${MAX_SIZES.object})`,
          mitigation: "Implement proper object size validation",
        });
      }

      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = path ? `${path}.${key}` : key;

        if (typeof value === "string") {
          vulnerabilities.push(
            ...this.scanForVulnerabilities(key, value, path || "object"),
          );
        } else if (typeof value === "object" && value !== null) {
          vulnerabilities.push(...this.auditObject(value, fieldPath));
        }
      }
    }

    return vulnerabilities;
  }

  private calculateRiskLevel(
    vulnerabilities: SecurityVulnerability[],
  ): "low" | "medium" | "high" | "critical" {
    if (vulnerabilities.some((v) => v.severity === "critical"))
      return "critical";
    if (vulnerabilities.some((v) => v.severity === "high")) return "high";
    if (vulnerabilities.some((v) => v.severity === "medium")) return "medium";
    return "low";
  }

  private generateRecommendations(
    vulnerabilities: SecurityVulnerability[],
  ): string[] {
    const recommendations = new Set<string>();

    vulnerabilities.forEach((vuln) => {
      recommendations.add(vuln.mitigation);
    });

    // General security recommendations
    if (vulnerabilities.length > 0) {
      recommendations.add("Implement comprehensive input validation");
      recommendations.add("Use Content Security Policy (CSP) headers");
      recommendations.add(
        "Enable security headers (HSTS, X-Frame-Options, etc.)",
      );
      recommendations.add("Implement rate limiting");
      recommendations.add("Log security events for monitoring");
    }

    return Array.from(recommendations);
  }

  public sanitizeInput(input: string): string {
    let sanitized = input;

    // Basic XSS prevention
    sanitized = sanitized
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");

    // Remove potential script injections
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, "");
    sanitized = sanitized.replace(/javascript:/gi, "");
    sanitized = sanitized.replace(/on\w+\s*=/gi, "");

    return sanitized.trim();
  }

  public validateFileUpload(file: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!file) {
      errors.push("No file provided");
      return { valid: false, errors };
    }

    // Check file size
    if (file.size > MAX_SIZES.file) {
      errors.push(
        `File too large: ${file.size} bytes > ${MAX_SIZES.file} bytes`,
      );
    }

    // Check file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/json",
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push(`Invalid file type: ${file.type}`);
    }

    // Check filename for path traversal
    if (
      SECURITY_PATTERNS.pathTraversal.some((pattern) => pattern.test(file.name))
    ) {
      errors.push("Invalid filename: potential path traversal detected");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Security middleware function
export async function securityAudit(
  request: NextRequest,
  body?: any,
): Promise<{ passed: boolean; result: SecurityAuditResult }> {
  const auditor = SecurityAuditor.getInstance();
  const result = auditor.auditRequest(request, body);

  // Log security events
  if (result.vulnerabilities.length > 0) {
    console.warn("Security audit failed:", {
      url: request.url,
      method: request.method,
      vulnerabilities: result.vulnerabilities,
      userAgent: request.headers.get("user-agent"),
      ip:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      timestamp: new Date().toISOString(),
    });
  }

  return {
    passed: result.passed,
    result,
  };
}

// Validation schemas for common inputs
export const SecuritySchemas = {
  safeString: z
    .string()
    .max(1000)
    .refine(
      (val) => !SECURITY_PATTERNS.xss.some((pattern) => pattern.test(val)),
      "Input contains potentially dangerous content",
    ),

  email: z.string().email().max(254),

  filename: z
    .string()
    .max(255)
    .refine(
      (val) =>
        !SECURITY_PATTERNS.pathTraversal.some((pattern) => pattern.test(val)),
      "Filename contains invalid characters",
    ),

  buildingName: z
    .string()
    .min(1)
    .max(200)
    .refine(
      (val) => !SECURITY_PATTERNS.xss.some((pattern) => pattern.test(val)),
      "Building name contains invalid characters",
    ),
};
