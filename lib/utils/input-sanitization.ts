/**
 * Input sanitization utilities for XSS prevention
 * Safely handles user-provided content for display
 */

import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html - The HTML content to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br"],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitizes plain text for safe display
 * Escapes HTML entities and removes potentially dangerous content
 * @param text - The text to sanitize
 * @returns Sanitized text string
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitizes building names and other user input for display
 * @param input - The user input to sanitize
 * @returns Sanitized string safe for display
 */
export function sanitizeUserInput(input: string | null | undefined): string {
  if (!input) {
    return "";
  }

  // Remove any HTML tags and sanitize
  const cleaned = input.replace(/<[^>]*>/g, "");
  return sanitizeText(cleaned).trim();
}

/**
 * Validates and sanitizes file names
 * @param fileName - The file name to sanitize
 * @returns Sanitized file name
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== "string") {
    return "untitled";
  }

  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 255);
}

/**
 * Sanitizes URLs for safe usage
 * @param url - The URL to sanitize
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Only allow http/https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    // Remove any credentials
    parsed.username = "";
    parsed.password = "";

    // Remove fragments for security
    parsed.hash = "";

    return parsed.toString();
  } catch {
    return null;
  }
}
