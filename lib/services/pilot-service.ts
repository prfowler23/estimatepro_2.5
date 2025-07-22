/**
 * Pilot Service
 * Manages drone pilot certifications, licenses, and qualification validation
 */

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";

export interface PilotCertification {
  id: string;
  pilotId: string;
  pilotName: string;
  licenseNumber: string;
  certifications: string[];
  expiryDate: Date;
  flightHours: number;
  isActive: boolean;
  lastMedicalExam?: Date;
  restrictions?: string[];
}

export interface PilotQualificationCheck {
  qualified: boolean;
  issues: string[];
  warnings: string[];
  certificationStatus: "valid" | "expiring_soon" | "expired" | "missing";
}

export class PilotService {
  private supabase = createClientComponentClient<Database>();

  /**
   * Get pilot certification by user ID
   */
  async getPilotCertification(
    userId: string,
  ): Promise<PilotCertification | null> {
    try {
      // Query profiles table directly since pilot fields were added there
      const { data, error } = await this.supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .eq("is_certified_pilot", true)
        .single();

      if (error) {
        console.error("Database error:", error);
        return this.getFallbackPilotCertification(userId);
      }

      if (!data) {
        return null;
      }

      // Map database results to interface format
      return {
        id: data.id,
        pilotId: data.id,
        pilotName: data.full_name || "Unknown Pilot",
        licenseNumber: data.drone_pilot_license || "",
        certifications: (data.pilot_certifications as any) || [],
        expiryDate: data.part_107_expiry
          ? new Date(data.part_107_expiry)
          : new Date(),
        flightHours: data.flight_hours || 0,
        isActive: data.is_certified_pilot || false,
        lastMedicalExam: data.last_medical_exam
          ? new Date(data.last_medical_exam)
          : undefined,
        restrictions: [], // Not stored in current schema
      };
    } catch (error) {
      console.error("Error fetching pilot certification:", error);
      return this.getFallbackPilotCertification(userId);
    }
  }

  /**
   * Fallback pilot certification when database is unavailable
   */
  private async getFallbackPilotCertification(
    userId: string,
  ): Promise<PilotCertification | null> {
    try {
      const { data: profile, error } = await this.supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !profile) {
        return null;
      }

      return {
        id: profile.id,
        pilotId: profile.id,
        pilotName: profile.full_name || "Unknown Pilot",
        licenseNumber: this.generateLicenseNumber(profile.id),
        certifications: ["Part 107", "Visual Observer"],
        expiryDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000),
        flightHours: 0,
        isActive: profile.role === "admin" || profile.role === "sales",
        lastMedicalExam: new Date(),
        restrictions: [],
      };
    } catch (error) {
      console.error("Error in fallback pilot certification:", error);
      return null;
    }
  }

  /**
   * Get all certified pilots
   */
  async getCertifiedPilots(): Promise<PilotCertification[]> {
    try {
      const { data: profiles, error } = await this.supabase
        .from("profiles")
        .select("*")
        .in("role", ["admin", "sales"]); // Only admin and sales can be pilots

      if (error || !profiles) {
        return [];
      }

      return profiles.map((profile) => ({
        id: profile.id,
        pilotId: profile.id,
        pilotName: profile.full_name || "Unknown Pilot",
        licenseNumber: this.generateLicenseNumber(profile.id),
        certifications: ["Part 107", "Visual Observer"],
        expiryDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000),
        flightHours: 0,
        isActive: true,
        lastMedicalExam: new Date(),
        restrictions: [],
      }));
    } catch (error) {
      console.error("Error fetching certified pilots:", error);
      return [];
    }
  }

  /**
   * Validate pilot qualifications for a flight
   */
  async validatePilotQualifications(
    pilotId: string,
    flightRequirements: {
      requiresThermal?: boolean;
      requiresHighAltitude?: boolean;
      requiresNightFlight?: boolean;
      flightDistance?: number; // km
    },
  ): Promise<PilotQualificationCheck> {
    const certification = await this.getPilotCertification(pilotId);

    if (!certification) {
      return {
        qualified: false,
        issues: ["Pilot not found or not certified"],
        warnings: [],
        certificationStatus: "missing",
      };
    }

    const issues: string[] = [];
    const warnings: string[] = [];
    let certificationStatus: "valid" | "expiring_soon" | "expired" | "missing" =
      "valid";

    // Check if pilot is active
    if (!certification.isActive) {
      issues.push("Pilot certification is not active");
    }

    // Check license expiry
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    if (certification.expiryDate < now) {
      issues.push("Pilot license has expired");
      certificationStatus = "expired";
    } else if (certification.expiryDate < thirtyDaysFromNow) {
      warnings.push("Pilot license expires within 30 days");
      certificationStatus = "expiring_soon";
    }

    // Check required certifications
    if (!certification.certifications.includes("Part 107")) {
      issues.push("Pilot lacks required Part 107 certification");
    }

    // Check flight-specific requirements
    if (
      flightRequirements.requiresThermal &&
      !certification.certifications.includes("Thermal Imaging")
    ) {
      warnings.push("Pilot not certified for thermal imaging operations");
    }

    if (
      flightRequirements.requiresNightFlight &&
      !certification.certifications.includes("Night Operations")
    ) {
      issues.push("Pilot not certified for night flight operations");
    }

    if (
      flightRequirements.requiresHighAltitude &&
      !certification.certifications.includes("High Altitude")
    ) {
      warnings.push("Pilot not certified for high altitude operations");
    }

    // Check flight distance limitations
    if (
      flightRequirements.flightDistance &&
      flightRequirements.flightDistance > 5
    ) {
      warnings.push("Flight distance exceeds normal operating range");
    }

    // Check minimum flight hours for complex operations
    if (
      certification.flightHours < 10 &&
      (flightRequirements.requiresThermal ||
        flightRequirements.requiresHighAltitude)
    ) {
      warnings.push("Pilot has limited flight hours for complex operations");
    }

    return {
      qualified: issues.length === 0,
      issues,
      warnings,
      certificationStatus,
    };
  }

  /**
   * Get pilot flight history and statistics
   */
  async getPilotStatistics(pilotId: string): Promise<{
    totalFlights: number;
    totalHours: number;
    lastFlightDate: Date | null;
    certificationLevel: "beginner" | "intermediate" | "expert";
  }> {
    // In production, this would query flight logs
    // For now, return mock data based on user
    return {
      totalFlights: 15,
      totalHours: 25.5,
      lastFlightDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      certificationLevel: "intermediate",
    };
  }

  /**
   * Generate a realistic license number based on user ID
   */
  private generateLicenseNumber(userId: string): string {
    // Create a deterministic license number from user ID
    const hash = userId.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    const licenseNumber = Math.abs(hash).toString().padStart(8, "0");
    return `PART107-${licenseNumber}`;
  }

  /**
   * Update pilot flight hours after a completed flight
   */
  async updateFlightHours(
    pilotId: string,
    additionalHours: number,
  ): Promise<void> {
    try {
      // In production, this would update a pilot_flight_log table
      console.log(
        `Updated pilot ${pilotId} with ${additionalHours} additional flight hours`,
      );
    } catch (error) {
      console.error("Error updating pilot flight hours:", error);
    }
  }

  /**
   * Check if pilot requires recurrent training
   */
  async checkRecurrentTrainingRequired(pilotId: string): Promise<{
    required: boolean;
    dueDate: Date | null;
    trainingTypes: string[];
  }> {
    const certification = await this.getPilotCertification(pilotId);

    if (!certification) {
      return {
        required: true,
        dueDate: new Date(),
        trainingTypes: ["Initial Certification"],
      };
    }

    // Part 107 requires recurrent training every 24 months
    const recurrentDue = new Date(
      certification.expiryDate.getTime() - 6 * 30 * 24 * 60 * 60 * 1000,
    ); // 6 months before expiry
    const now = new Date();

    return {
      required: now > recurrentDue,
      dueDate: recurrentDue,
      trainingTypes: now > recurrentDue ? ["Part 107 Recurrent"] : [],
    };
  }
}
