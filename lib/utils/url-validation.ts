/**
 * URL validation utilities for security
 * Prevents SSRF attacks by validating and sanitizing URLs
 */

import { z } from "zod";

// Whitelist of allowed domains for external resources
const ALLOWED_IMAGE_DOMAINS = [
  "localhost",
  "estimatepro.com",
  "*.estimatepro.com",
  "cloudinary.com",
  "*.cloudinary.com",
  "amazonaws.com",
  "*.amazonaws.com",
  "googleusercontent.com",
  "*.googleusercontent.com",
  "unsplash.com",
  "*.unsplash.com",
  "pexels.com",
  "*.pexels.com",
];

// Blocked protocols to prevent attacks
const BLOCKED_PROTOCOLS = [
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "about:",
  "chrome:",
  "chrome-extension:",
];

// URL validation schema
const ImageUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      try {
        const parsedUrl = new URL(url);

        // Check for blocked protocols
        if (
          BLOCKED_PROTOCOLS.some((protocol) =>
            url.toLowerCase().startsWith(protocol),
          )
        ) {
          return false;
        }

        // Only allow http/https
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          return false;
        }

        // Prevent localhost/internal IPs in production
        if (process.env.NODE_ENV === "production") {
          const hostname = parsedUrl.hostname.toLowerCase();

          // Block localhost and common internal hostnames
          if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname)) {
            return false;
          }

          // Block private IP ranges
          const ipPattern = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/;
          if (ipPattern.test(hostname)) {
            return false;
          }
        }

        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid or potentially unsafe URL" },
  );

/**
 * Validates an image URL for safety
 * @param url - The URL to validate
 * @returns The validated URL
 * @throws Error if URL is invalid or unsafe
 */
export function validateImageUrl(url: string): string {
  // Basic validation
  const result = ImageUrlSchema.safeParse(url);

  if (!result.success) {
    throw new Error("Invalid URL: " + result.error.errors[0].message);
  }

  const parsedUrl = new URL(result.data);

  // Check against whitelist in production
  if (process.env.NODE_ENV === "production") {
    const hostname = parsedUrl.hostname.toLowerCase();
    const isAllowed = ALLOWED_IMAGE_DOMAINS.some((domain) => {
      if (domain.startsWith("*.")) {
        const baseDomain = domain.substring(2);
        return hostname === baseDomain || hostname.endsWith("." + baseDomain);
      }
      return hostname === domain;
    });

    if (!isAllowed) {
      throw new Error(`URL domain not allowed: ${hostname}`);
    }
  }

  // Additional security checks
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("URLs with credentials are not allowed");
  }

  // Limit URL length to prevent DoS
  if (url.length > 2048) {
    throw new Error("URL is too long");
  }

  return result.data;
}

/**
 * Sanitizes a URL by removing potentially dangerous parts
 * @param url - The URL to sanitize
 * @returns The sanitized URL or null if invalid
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const validated = validateImageUrl(url);
    const parsedUrl = new URL(validated);

    // Remove any fragments or unnecessary parts
    parsedUrl.hash = "";

    // Ensure proper encoding
    return parsedUrl.toString();
  } catch {
    return null;
  }
}

/**
 * Checks if a URL points to an image based on extension
 * @param url - The URL to check
 * @returns True if URL appears to be an image
 */
export function isImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.toLowerCase();
    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".svg",
      ".bmp",
      ".ico",
    ];

    return imageExtensions.some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * Validates multiple URLs at once
 * @param urls - Array of URLs to validate
 * @returns Object with valid and invalid URLs
 */
export function validateImageUrls(urls: string[]): {
  valid: string[];
  invalid: { url: string; error: string }[];
} {
  const valid: string[] = [];
  const invalid: { url: string; error: string }[] = [];

  for (const url of urls) {
    try {
      const validatedUrl = validateImageUrl(url);
      valid.push(validatedUrl);
    } catch (error) {
      invalid.push({
        url,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { valid, invalid };
}
