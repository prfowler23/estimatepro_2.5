/**
 * Pilot Service Client
 * Client-safe version of pilot service without server-side dependencies
 */

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

export class PilotServiceClient {
  /**
   * Mock pilot certification for client-side usage
   */
  async getPilotCertification(
    userId: string,
  ): Promise<PilotCertification | null> {
    // Return mock data for client-side
    return {
      id: userId,
      pilotId: userId,
      pilotName: "Demo Pilot",
      licenseNumber: this.generateLicenseNumber(userId),
      certifications: ["Part 107", "Visual Observer"],
      expiryDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000),
      flightHours: 100,
      isActive: true,
      lastMedicalExam: new Date(),
      restrictions: [],
    };
  }

  /**
   * Get all certified pilots - mock for client
   */
  async getCertifiedPilots(): Promise<PilotCertification[]> {
    return [
      {
        id: "pilot1",
        pilotId: "pilot1",
        pilotName: "Demo Pilot 1",
        licenseNumber: "FAA-107-001",
        certifications: ["Part 107", "Visual Observer"],
        expiryDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000),
        flightHours: 150,
        isActive: true,
        lastMedicalExam: new Date(),
        restrictions: [],
      },
    ];
  }

  /**
   * Check pilot qualifications
   */
  async checkPilotQualifications(
    pilotId: string,
    flightRequirements?: {
      altitude?: number;
      nightFlight?: boolean;
      overPeople?: boolean;
    },
  ): Promise<PilotQualificationCheck> {
    const qualification: PilotQualificationCheck = {
      qualified: true,
      issues: [],
      warnings: [],
      certificationStatus: "valid",
    };

    return qualification;
  }

  /**
   * Generate a mock license number
   */
  private generateLicenseNumber(userId: string): string {
    const hash = userId.slice(-4).toUpperCase();
    return `FAA-107-${hash}`;
  }
}
