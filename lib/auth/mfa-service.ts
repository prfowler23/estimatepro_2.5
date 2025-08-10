/**
 * Enhanced MFA Service - Supabase Native MFA Integration
 * Addresses Supabase security advisor warnings for MFA options
 * Integrates with Supabase's built-in MFA system while maintaining backward compatibility
 */

import { createClient } from "@/lib/supabase/client";
import type {
  AuthMFAEnrollResponse,
  AuthMFAVerifyResponse,
  AuthMFAChallengeResponse,
} from "@supabase/supabase-js";

export interface MFAEnrollmentResult {
  success: boolean;
  data?: {
    id: string;
    qr_code: string;
    secret: string;
    type: "totp" | "phone";
  };
  error?: string;
}

export interface MFAVerificationResult {
  success: boolean;
  error?: string;
}

export interface MFAChallenge {
  id: string;
  challenge_id: string;
  factor_id: string;
}

export class MFAService {
  private supabase = createClient();

  /**
   * Enroll a TOTP (Time-based One-Time Password) factor
   * Uses Supabase's native MFA system
   */
  async enrollTOTP(): Promise<MFAEnrollmentResult> {
    try {
      const { data, error } = await this.supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "EstimatePro",
        friendlyName: "EstimatePro TOTP",
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: {
          id: data.id,
          qr_code: data.totp?.qr_code || "",
          secret: data.totp?.secret || "",
          type: "totp",
        },
      };
    } catch (error: any) {
      console.error("MFA TOTP enrollment failed:", error);
      return {
        success: false,
        error: error.message || "Failed to enroll TOTP",
      };
    }
  }

  /**
   * Verify TOTP code during enrollment to complete setup
   */
  async verifyTOTPEnrollment(
    factorId: string,
    code: string,
  ): Promise<MFAVerificationResult> {
    try {
      const challengeResponse = await this.supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeResponse.error) {
        throw challengeResponse.error;
      }

      const { data, error } = await this.supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeResponse.data.id,
        code,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error("MFA TOTP verification failed:", error);
      return {
        success: false,
        error: error.message || "Invalid verification code",
      };
    }
  }

  /**
   * Challenge a user's MFA factor during login
   */
  async challengeMFAFactor(
    factorId: string,
  ): Promise<{ success: boolean; challenge?: MFAChallenge; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.mfa.challenge({
        factorId,
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        challenge: {
          id: data.id,
          challenge_id: data.id,
          factor_id: factorId,
        },
      };
    } catch (error: any) {
      console.error("MFA challenge failed:", error);
      return {
        success: false,
        error: error.message || "Failed to create MFA challenge",
      };
    }
  }

  /**
   * Verify MFA code during login
   */
  async verifyMFACode(
    factorId: string,
    challengeId: string,
    code: string,
  ): Promise<MFAVerificationResult> {
    try {
      const { data, error } = await this.supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });

      if (error) {
        throw error;
      }

      // Log successful MFA verification for audit
      await this.logSecurityEvent("MFA_VERIFICATION_SUCCESS", {
        factor_id: factorId,
        challenge_id: challengeId,
      });

      return { success: true };
    } catch (error: any) {
      console.error("MFA verification failed:", error);

      // Log failed MFA attempt for security audit
      await this.logSecurityEvent(
        "MFA_VERIFICATION_FAILED",
        {
          factor_id: factorId,
          challenge_id: challengeId,
          error: error.message,
        },
        false,
      );

      return {
        success: false,
        error: error.message || "Invalid verification code",
      };
    }
  }

  /**
   * Get all MFA factors for the current user
   */
  async getUserMFAFactors(): Promise<{
    success: boolean;
    factors?: any[];
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase.auth.mfa.listFactors();

      if (error) {
        throw error;
      }

      return {
        success: true,
        factors: data?.all || [],
      };
    } catch (error: any) {
      console.error("Failed to get MFA factors:", error);
      return {
        success: false,
        error: error.message || "Failed to retrieve MFA factors",
      };
    }
  }

  /**
   * Unenroll (remove) an MFA factor
   */
  async unenrollMFAFactor(factorId: string): Promise<MFAVerificationResult> {
    try {
      const { error } = await this.supabase.auth.mfa.unenroll({
        factorId,
      });

      if (error) {
        throw error;
      }

      // Log MFA factor removal for audit
      await this.logSecurityEvent("MFA_FACTOR_REMOVED", {
        factor_id: factorId,
      });

      return { success: true };
    } catch (error: any) {
      console.error("MFA unenroll failed:", error);
      return {
        success: false,
        error: error.message || "Failed to remove MFA factor",
      };
    }
  }

  /**
   * Get the Authenticator Assurance Level (AAL) for the current session
   */
  async getAssuranceLevel(): Promise<{
    success: boolean;
    level?: string;
    error?: string;
  }> {
    try {
      const { data, error } =
        await this.supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (error) {
        throw error;
      }

      return {
        success: true,
        level: data?.currentLevel || "aal1",
      };
    } catch (error: any) {
      console.error("Failed to get assurance level:", error);
      return {
        success: false,
        error: error.message || "Failed to get assurance level",
      };
    }
  }

  /**
   * Check if the current user has MFA enabled
   */
  async isMFAEnabled(): Promise<boolean> {
    try {
      const result = await this.getUserMFAFactors();
      return result.success && (result.factors?.length || 0) > 0;
    } catch (error) {
      console.error("Error checking MFA status:", error);
      return false;
    }
  }

  /**
   * Get MFA enrollment status and recommendations
   */
  async getMFAStatus(): Promise<{
    enabled: boolean;
    factorCount: number;
    recommendations: string[];
    assuranceLevel: string;
  }> {
    try {
      const [factorsResult, assuranceResult] = await Promise.all([
        this.getUserMFAFactors(),
        this.getAssuranceLevel(),
      ]);

      const factorCount = factorsResult.factors?.length || 0;
      const enabled = factorCount > 0;
      const assuranceLevel = assuranceResult.level || "aal1";

      const recommendations: string[] = [];

      if (!enabled) {
        recommendations.push(
          "Enable two-factor authentication to secure your account",
        );
      }

      if (factorCount < 2) {
        recommendations.push(
          "Consider setting up a backup authentication method",
        );
      }

      if (assuranceLevel === "aal1") {
        recommendations.push(
          "Complete MFA challenge to achieve higher security level",
        );
      }

      return {
        enabled,
        factorCount,
        recommendations,
        assuranceLevel,
      };
    } catch (error) {
      console.error("Error getting MFA status:", error);
      return {
        enabled: false,
        factorCount: 0,
        recommendations: ["Error retrieving MFA status. Please try again."],
        assuranceLevel: "aal1",
      };
    }
  }

  /**
   * Log security events for audit purposes
   */
  private async logSecurityEvent(
    eventType: string,
    details: Record<string, any>,
    success: boolean = true,
  ): Promise<void> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) return;

      await this.supabase.rpc("log_security_event", {
        p_user_id: user.id,
        p_event_type: eventType,
        p_event_details: details,
        p_success: success,
      });
    } catch (error) {
      // Don't throw on logging errors, just log them
      console.error("Failed to log security event:", error);
    }
  }

  /**
   * Update user security preferences
   */
  async updateSecurityPreferences(preferences: {
    mfa_enabled?: boolean;
    mfa_methods?: string[];
    backup_codes_generated?: boolean;
  }): Promise<MFAVerificationResult> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Authentication required" };
      }

      const { error } = await this.supabase
        .from("user_security_preferences")
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error("Failed to update security preferences:", error);
      return {
        success: false,
        error: error.message || "Failed to update security preferences",
      };
    }
  }

  /**
   * Get user security preferences
   */
  async getSecurityPreferences(): Promise<{
    success: boolean;
    preferences?: any;
    error?: string;
  }> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Authentication required" };
      }

      const { data, error } = await this.supabase
        .from("user_security_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // Not found is OK
        throw error;
      }

      return {
        success: true,
        preferences: data || {
          user_id: user.id,
          mfa_enabled: false,
          mfa_methods: [],
          backup_codes_generated: false,
        },
      };
    } catch (error: any) {
      console.error("Failed to get security preferences:", error);
      return {
        success: false,
        error: error.message || "Failed to retrieve security preferences",
      };
    }
  }
}

// Export singleton instance
export const mfaService = new MFAService();

// Export legacy compatibility functions
export {
  setupTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  is2FAEnabled,
  generateBackupCodes,
} from "./two-factor-auth";
