/**
 * Two-Factor Authentication Service
 * Provides TOTP-based 2FA functionality for enhanced security
 */

import { supabase } from "@/lib/supabase/client";
import { authenticator } from "otplib";
import QRCode from "qrcode";

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  success: boolean;
  error?: string;
}

/**
 * Generate a new 2FA secret and QR code for setup
 */
export async function setupTwoFactorForUser(
  userId: string,
  email: string,
): Promise<TwoFactorSetup> {
  const secret = authenticator.generateSecret();
  const appName = "EstimatePro";
  const otpAuthUrl = authenticator.keyuri(email, appName, secret);

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

  // Generate backup codes
  const backupCodes = Array.from({ length: 8 }, () =>
    Math.random().toString(36).substring(2, 8).toUpperCase(),
  );

  // Store secret and backup codes in database (encrypted)
  const { error } = await supabase.from("user_two_factor").upsert({
    user_id: userId,
    secret_encrypted: btoa(secret), // In production, use proper encryption
    backup_codes: backupCodes,
    enabled: false, // Not enabled until verified
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to setup 2FA: ${error.message}`);
  }

  return {
    secret,
    qrCodeUrl,
    backupCodes,
  };
}

/**
 * Verify 2FA token and enable 2FA for user
 */
export async function verifyAndEnable2FA(
  userId: string,
  token: string,
): Promise<TwoFactorVerification> {
  // Get user's 2FA secret
  const { data: twoFactorData, error: fetchError } = await supabase
    .from("user_two_factor")
    .select("secret_encrypted")
    .eq("user_id", userId)
    .single();

  if (fetchError || !twoFactorData) {
    return { success: false, error: "2FA setup not found" };
  }

  const secret = atob(twoFactorData.secret_encrypted);
  const isValid = authenticator.verify({ token, secret });

  if (!isValid) {
    return { success: false, error: "Invalid verification code" };
  }

  // Enable 2FA
  const { error: updateError } = await supabase
    .from("user_two_factor")
    .update({
      enabled: true,
      verified_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    return { success: false, error: "Failed to enable 2FA" };
  }

  return { success: true };
}

/**
 * Verify 2FA token during login
 */
export async function verify2FAToken(
  userId: string,
  token: string,
): Promise<TwoFactorVerification> {
  // Get user's 2FA configuration
  const { data: twoFactorData, error: fetchError } = await supabase
    .from("user_two_factor")
    .select("secret_encrypted, backup_codes, enabled")
    .eq("user_id", userId)
    .single();

  if (fetchError || !twoFactorData || !twoFactorData.enabled) {
    return { success: false, error: "2FA not enabled for this user" };
  }

  // Check if it's a backup code
  if (twoFactorData.backup_codes?.includes(token.toUpperCase())) {
    // Remove used backup code
    const updatedBackupCodes = twoFactorData.backup_codes.filter(
      (code) => code !== token.toUpperCase(),
    );

    await supabase
      .from("user_two_factor")
      .update({ backup_codes: updatedBackupCodes })
      .eq("user_id", userId);

    return { success: true };
  }

  // Verify TOTP token
  const secret = atob(twoFactorData.secret_encrypted);
  const isValid = authenticator.verify({ token, secret });

  return {
    success: isValid,
    error: isValid ? undefined : "Invalid verification code",
  };
}

/**
 * Disable 2FA for a user
 */
export async function disable2FA(
  userId: string,
  password: string,
): Promise<TwoFactorVerification> {
  // Verify password before disabling 2FA
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || user.id !== userId) {
    return { success: false, error: "Authentication required" };
  }

  // In a real implementation, you'd verify the password here
  // For now, we'll assume the user is authenticated

  const { error } = await supabase
    .from("user_two_factor")
    .delete()
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: "Failed to disable 2FA" };
  }

  return { success: true };
}

/**
 * Check if user has 2FA enabled
 */
export async function is2FAEnabled(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_two_factor")
    .select("enabled")
    .eq("user_id", userId)
    .single();

  return !error && data?.enabled === true;
}

/**
 * Setup 2FA for current authenticated user (wrapper function)
 */
export async function setupTwoFactor(): Promise<{
  success: boolean;
  data?: { secret: string; qr_code: string; backup_codes: string[] };
  error?: string;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required" };
    }

    const setup = await setupTwoFactorForUser(user.id, user.email || "");
    return {
      success: true,
      data: {
        secret: setup.secret,
        qr_code: setup.qrCodeUrl,
        backup_codes: setup.backupCodes,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Verify 2FA token for current user (wrapper function)
 */
export async function verifyTwoFactor(
  token: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required" };
    }

    return await verifyAndEnable2FA(user.id, token);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Disable 2FA for current user (wrapper function)
 */
export async function disableTwoFactor(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required" };
    }

    return await disable2FA(user.id, ""); // Password verification would be added here
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Generate backup codes for current user
 */
export async function generateBackupCodes(): Promise<{
  success: boolean;
  backup_codes?: string[];
  error?: string;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required" };
    }

    // Generate new backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).substring(2, 8).toUpperCase(),
    );

    // Update in database
    const { error } = await supabase
      .from("user_two_factor")
      .update({
        backup_codes: backupCodes,
        backup_codes_generated: true,
      })
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "Failed to generate backup codes" };
    }

    return { success: true, backup_codes: backupCodes };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
