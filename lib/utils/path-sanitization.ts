import path from "path";

/**
 * Sanitizes file paths to prevent path traversal attacks
 */
export function sanitizeFilePath(userId: string, fileName: string): string {
  // Remove any characters that could be used for path traversal
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, "");

  // Extract just the filename, removing any directory components
  const baseName = path.basename(fileName);

  // Remove any remaining dangerous patterns
  const sanitizedFileName = baseName
    .replace(/\.\./g, "")
    .replace(/[^a-zA-Z0-9-_.]/g, "_");

  // Ensure the filename has a safe extension
  const fileExt = path.extname(sanitizedFileName).toLowerCase();
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".heic"];

  if (!allowedExtensions.includes(fileExt)) {
    throw new Error(`Invalid file extension: ${fileExt}`);
  }

  // Construct the final path
  const finalPath = `${sanitizedUserId}/${sanitizedFileName}`;

  // Final safety check
  if (
    finalPath.includes("..") ||
    finalPath.includes("//") ||
    finalPath.startsWith("/")
  ) {
    throw new Error("Invalid file path detected");
  }

  return finalPath;
}

/**
 * Validates that a filename is safe
 */
export function isValidFileName(fileName: string): boolean {
  // Check for common path traversal patterns
  const dangerousPatterns = [
    "..",
    "~",
    "\\",
    "\x00", // null byte
    "%2e%2e", // URL encoded ..
    "%252e%252e", // Double URL encoded ..
    "..%2f", // URL encoded ../
    "..\\", // Windows path traversal
  ];

  const lowerFileName = fileName.toLowerCase();
  return !dangerousPatterns.some((pattern) => lowerFileName.includes(pattern));
}

/**
 * Generate a secure filename with timestamp and random string
 */
export function generateSecureFileName(originalFileName: string): string {
  const fileExt = path.extname(originalFileName).toLowerCase();
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);

  return `${timestamp}-${randomString}${fileExt}`;
}
