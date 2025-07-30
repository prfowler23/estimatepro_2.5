/**
 * Server-side file validation utilities for enhanced security
 * Provides additional validation beyond client-side checks
 */

import { FileTypeResult, fileTypeFromBuffer } from "file-type";

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types with their magic number signatures
export const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": ["jpeg", "jpg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
} as const;

// Get all allowed extensions
export const ALLOWED_EXTENSIONS = Object.values(ALLOWED_IMAGE_TYPES).flat();

/**
 * Validates file type by checking magic number signature
 * This is more secure than relying on file extension or MIME type
 * @param buffer - File buffer to validate
 * @returns File type info or null if invalid
 */
export async function validateFileType(
  buffer: Buffer,
): Promise<FileTypeResult | null> {
  const fileType = await fileTypeFromBuffer(buffer);

  if (!fileType) {
    return null;
  }

  // Check if the detected type is in our allowed list
  const isAllowed = Object.keys(ALLOWED_IMAGE_TYPES).includes(fileType.mime);

  return isAllowed ? fileType : null;
}

/**
 * Validates file size
 * @param size - File size in bytes
 * @returns True if valid, false otherwise
 */
export function validateFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

/**
 * Comprehensive file validation for uploaded files
 * @param buffer - File buffer
 * @param originalName - Original filename
 * @param size - File size in bytes
 * @returns Validation result with file type info
 */
export async function validateUploadedFile(
  buffer: Buffer,
  originalName: string,
  size: number,
): Promise<{
  isValid: boolean;
  fileType?: FileTypeResult;
  error?: string;
}> {
  // Validate file size
  if (!validateFileSize(size)) {
    return {
      isValid: false,
      error: `File size must be between 1 byte and ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  // Validate file type by magic number
  const fileType = await validateFileType(buffer);
  if (!fileType) {
    return {
      isValid: false,
      error:
        "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
    };
  }

  // Additional security: check for embedded scripts in SVG (if we add SVG support later)
  if (fileType.mime === "image/svg+xml") {
    const content = buffer.toString("utf8");
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // event handlers
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(content))) {
      return {
        isValid: false,
        error: "SVG file contains potentially malicious content",
      };
    }
  }

  return {
    isValid: true,
    fileType,
  };
}

/**
 * Sanitizes and validates filename
 * @param filename - Original filename
 * @param fileType - Detected file type
 * @returns Sanitized filename
 */
export function sanitizeFilename(
  filename: string,
  fileType?: FileTypeResult,
): string {
  // Remove directory traversal attempts and dangerous characters
  let sanitized = filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 255);

  // Ensure proper extension based on detected file type
  if (fileType && !sanitized.toLowerCase().endsWith(`.${fileType.ext}`)) {
    // Remove existing extension if it doesn't match
    sanitized = sanitized.replace(/\.[^.]*$/, "");
    sanitized += `.${fileType.ext}`;
  }

  return sanitized || "image";
}

/**
 * Checks if file buffer might be malicious
 * Basic heuristics for detecting potentially dangerous files
 * @param buffer - File buffer to check
 * @returns True if file appears safe
 */
export function isFileSafe(buffer: Buffer): boolean {
  const content = buffer.toString("binary", 0, Math.min(buffer.length, 1024));

  // Check for common malicious signatures
  const maliciousPatterns = [
    "PK\x03\x04", // ZIP files disguised as images
    "\x7fELF", // ELF executables
    "MZ", // PE executables
    "\xFE\xED\xFA", // Mach-O executables
  ];

  return !maliciousPatterns.some((pattern) => content.includes(pattern));
}

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  checkMagicNumber?: boolean;
  sanitizeFilename?: boolean;
}

/**
 * Complete file validation with options
 * @param file - File data
 * @param options - Validation options
 * @returns Validation result
 */
export async function validateFile(
  file: {
    buffer: Buffer;
    originalname: string;
    size: number;
    mimetype: string;
  },
  options: FileValidationOptions = {},
): Promise<{
  isValid: boolean;
  sanitizedName?: string;
  detectedType?: FileTypeResult;
  error?: string;
}> {
  const {
    maxSize = MAX_FILE_SIZE,
    allowedTypes = Object.keys(ALLOWED_IMAGE_TYPES),
    checkMagicNumber = true,
    sanitizeFilename: shouldSanitize = true,
  } = options;

  // Size validation
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
    };
  }

  // Basic safety check
  if (!isFileSafe(file.buffer)) {
    return {
      isValid: false,
      error: "File contains potentially malicious content",
    };
  }

  let detectedType: FileTypeResult | undefined;

  if (checkMagicNumber) {
    detectedType = (await validateFileType(file.buffer)) || undefined;
    if (!detectedType) {
      return {
        isValid: false,
        error: "Invalid or unsupported file type",
      };
    }
  } else {
    // Fallback to MIME type validation
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: "File type not allowed",
      };
    }
  }

  const sanitizedName = shouldSanitize
    ? sanitizeFilename(file.originalname, detectedType)
    : file.originalname;

  return {
    isValid: true,
    sanitizedName,
    detectedType,
  };
}
