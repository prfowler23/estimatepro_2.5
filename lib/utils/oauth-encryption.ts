import crypto from "crypto";

/**
 * OAuth Token Encryption Utility
 * Uses AES-256-GCM for authenticated encryption
 */

// Get encryption key from environment or generate a default one (should be set in production)
const ENCRYPTION_KEY =
  process.env.OAUTH_ENCRYPTION_KEY ||
  crypto
    .createHash("sha256")
    .update("default-encryption-key-change-in-production")
    .digest();

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Derives a key from password using PBKDF2
 */
function deriveKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, "sha256");
}

/**
 * Encrypts OAuth tokens for secure storage
 */
export function encryptOAuthToken(token: string): string {
  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive key from salt
    const key = deriveKey(salt);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the token
    const encrypted = Buffer.concat([
      cipher.update(token, "utf8"),
      cipher.final(),
    ]);

    // Get the authentication tag
    const tag = cipher.getAuthTag();

    // Combine salt, iv, tag, and encrypted data
    const combined = Buffer.concat([salt, iv, tag, encrypted]);

    // Return base64 encoded string
    return combined.toString("base64");
  } catch (error) {
    throw new Error("Failed to encrypt OAuth token");
  }
}

/**
 * Decrypts OAuth tokens from storage
 */
export function decryptOAuthToken(encryptedToken: string): string {
  try {
    // Decode from base64
    const combined = Buffer.from(encryptedToken, "base64");

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, TAG_POSITION);
    const tag = combined.subarray(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = combined.subarray(ENCRYPTED_POSITION);

    // Derive key from salt
    const key = deriveKey(salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt the token
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    throw new Error("Failed to decrypt OAuth token");
  }
}

/**
 * Encrypts OAuth credentials object
 */
export function encryptOAuthCredentials(
  credentials: Record<string, any>,
): Record<string, any> {
  const encrypted: Record<string, any> = {};

  for (const [key, value] of Object.entries(credentials)) {
    if (
      typeof value === "string" &&
      (key.includes("token") || key.includes("secret"))
    ) {
      // Encrypt sensitive fields
      encrypted[key] = encryptOAuthToken(value);
    } else {
      // Keep non-sensitive fields as-is
      encrypted[key] = value;
    }
  }

  return encrypted;
}

/**
 * Decrypts OAuth credentials object
 */
export function decryptOAuthCredentials(
  encryptedCredentials: Record<string, any>,
): Record<string, any> {
  const decrypted: Record<string, any> = {};

  for (const [key, value] of Object.entries(encryptedCredentials)) {
    if (
      typeof value === "string" &&
      (key.includes("token") || key.includes("secret"))
    ) {
      // Decrypt sensitive fields
      try {
        decrypted[key] = decryptOAuthToken(value);
      } catch (error) {
        // If decryption fails, it might be an unencrypted token (for backward compatibility)
        decrypted[key] = value;
      }
    } else {
      // Keep non-sensitive fields as-is
      decrypted[key] = value;
    }
  }

  return decrypted;
}

/**
 * Validates that encryption key is properly configured
 */
export function validateEncryptionConfig(): boolean {
  if (!process.env.OAUTH_ENCRYPTION_KEY) {
    console.warn(
      "WARNING: OAUTH_ENCRYPTION_KEY not set. Using default key. This is insecure in production!",
    );
    return false;
  }

  if (process.env.OAUTH_ENCRYPTION_KEY.length < 32) {
    console.warn(
      "WARNING: OAUTH_ENCRYPTION_KEY should be at least 32 characters long",
    );
    return false;
  }

  return true;
}
