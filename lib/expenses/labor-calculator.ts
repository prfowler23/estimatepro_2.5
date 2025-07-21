export interface LaborRole {
  id: string;
  title: string;
  hourlyRate: number;
  overtimeRate: number;
  benefitsRate: number; // percentage of base rate for benefits/overhead
  requiredCertifications?: string[];
  description?: string;
  skillLevel: "entry" | "intermediate" | "advanced" | "expert";
}

export interface ServiceDuration {
  service: string;
  serviceName?: string;
  baseDuration: number;
  weatherImpact: number;
  finalDuration: number;
  confidence: "high" | "medium" | "low";
  dependencies: string[];
}

export interface LaborCost {
  service: string;
  role: string;
  roleId: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  hourlyRate: number;
  overtimeRate: number;
  benefitsRate: number;
  baseCost: number;
  overtimeCost: number;
  benefitsCost: number;
  totalCost: number;
  workers: number;
  productivity: number; // adjustment factor
  notes?: string;
}

export interface CrewRequirement {
  service: string;
  roles: { roleId: string; count: number; efficiency?: number }[];
  hoursPerDay: number;
  minimumCrew: number;
  productivityFactors: {
    height: number; // 1.0 = normal, >1.0 = slower
    weather: number; // risk factor 0-1
    complexity: "low" | "medium" | "high";
  };
}

export interface ProductivityFactors {
  heightMultiplier: number;
  weatherRisk: number;
  complexityLevel: "low" | "medium" | "high";
  experienceBonus: number; // crew experience factor
  equipmentEfficiency: number; // equipment quality factor
}

export const LABOR_ROLES: LaborRole[] = [
  {
    id: "crew-lead",
    title: "Crew Lead",
    hourlyRate: 35,
    overtimeRate: 52.5,
    benefitsRate: 45, // 45% of base rate for benefits/overhead
    requiredCertifications: ["OSHA-30", "Lift Certification", "First Aid"],
    description:
      "Experienced supervisor responsible for crew coordination and safety",
    skillLevel: "advanced",
  },
  {
    id: "technician",
    title: "Service Technician",
    hourlyRate: 25,
    overtimeRate: 37.5,
    benefitsRate: 42,
    requiredCertifications: ["OSHA-10"],
    description: "Skilled technician for general cleaning operations",
    skillLevel: "intermediate",
  },
  {
    id: "technician-senior",
    title: "Senior Service Technician",
    hourlyRate: 28,
    overtimeRate: 42,
    benefitsRate: 43,
    requiredCertifications: ["OSHA-10", "Pressure Washing Cert"],
    description: "Experienced technician with specialized skills",
    skillLevel: "advanced",
  },
  {
    id: "helper",
    title: "Helper/Laborer",
    hourlyRate: 18,
    overtimeRate: 27,
    benefitsRate: 38,
    description: "Entry-level assistant for basic tasks and setup",
    skillLevel: "entry",
  },
  {
    id: "restoration-specialist",
    title: "Restoration Specialist",
    hourlyRate: 32,
    overtimeRate: 48,
    benefitsRate: 50,
    requiredCertifications: ["Glass Restoration Cert", "OSHA-10"],
    description: "Specialist in glass and surface restoration techniques",
    skillLevel: "expert",
  },
  {
    id: "high-rise-technician",
    title: "High-Rise Technician",
    hourlyRate: 38,
    overtimeRate: 57,
    benefitsRate: 55,
    requiredCertifications: [
      "OSHA-30",
      "Rope Access Level 2",
      "Fall Protection",
    ],
    description: "Certified technician for high-rise and rope access work",
    skillLevel: "expert",
  },
  {
    id: "safety-observer",
    title: "Safety Observer",
    hourlyRate: 22,
    overtimeRate: 33,
    benefitsRate: 40,
    requiredCertifications: ["OSHA-30", "Safety Observer Cert"],
    description: "Dedicated safety oversight for high-risk operations",
    skillLevel: "intermediate",
  },
];

export const CREW_REQUIREMENTS: CrewRequirement[] = [
  {
    service: "BWP",
    roles: [
      { roleId: "crew-lead", count: 1, efficiency: 1.0 },
      { roleId: "technician", count: 1, efficiency: 0.95 },
    ],
    hoursPerDay: 8,
    minimumCrew: 2,
    productivityFactors: {
      height: 1.1,
      weather: 0.3,
      complexity: "medium",
    },
  },
  {
    service: "BWS",
    roles: [
      { roleId: "crew-lead", count: 1, efficiency: 1.0 },
      { roleId: "technician", count: 1, efficiency: 0.95 },
      { roleId: "helper", count: 1, efficiency: 0.8 },
    ],
    hoursPerDay: 8,
    minimumCrew: 2,
    productivityFactors: {
      height: 1.05,
      weather: 0.4,
      complexity: "high",
    },
  },
  {
    service: "WC",
    roles: [
      { roleId: "crew-lead", count: 1, efficiency: 1.0 },
      { roleId: "technician", count: 1, efficiency: 1.0 },
    ],
    hoursPerDay: 8,
    minimumCrew: 2,
    productivityFactors: {
      height: 1.2,
      weather: 0.5,
      complexity: "medium",
    },
  },
  {
    service: "GR",
    roles: [
      { roleId: "restoration-specialist", count: 1, efficiency: 1.0 },
      { roleId: "technician-senior", count: 1, efficiency: 0.9 },
    ],
    hoursPerDay: 8,
    minimumCrew: 2,
    productivityFactors: {
      height: 1.3,
      weather: 0.2,
      complexity: "high",
    },
  },
  {
    service: "HBW",
    roles: [
      { roleId: "high-rise-technician", count: 2, efficiency: 1.0 },
      { roleId: "safety-observer", count: 1, efficiency: 1.0 },
      { roleId: "helper", count: 1, efficiency: 0.7 },
    ],
    hoursPerDay: 8,
    minimumCrew: 3,
    productivityFactors: {
      height: 1.8,
      weather: 0.7,
      complexity: "high",
    },
  },
  {
    service: "PWF",
    roles: [
      { roleId: "crew-lead", count: 1, efficiency: 1.0 },
      { roleId: "technician", count: 1, efficiency: 1.0 },
    ],
    hoursPerDay: 8,
    minimumCrew: 2,
    productivityFactors: {
      height: 1.0,
      weather: 0.3,
      complexity: "low",
    },
  },
  {
    service: "HFS",
    roles: [
      { roleId: "technician", count: 1, efficiency: 1.0 },
      { roleId: "helper", count: 1, efficiency: 0.9 },
    ],
    hoursPerDay: 8,
    minimumCrew: 1,
    productivityFactors: {
      height: 1.0,
      weather: 0.0,
      complexity: "low",
    },
  },
  {
    service: "PC",
    roles: [
      { roleId: "crew-lead", count: 1, efficiency: 1.0 },
      { roleId: "technician", count: 2, efficiency: 0.95 },
    ],
    hoursPerDay: 8,
    minimumCrew: 2,
    productivityFactors: {
      height: 1.0,
      weather: 0.1,
      complexity: "medium",
    },
  },
  {
    service: "PWP",
    roles: [
      { roleId: "crew-lead", count: 1, efficiency: 1.0 },
      { roleId: "technician", count: 2, efficiency: 1.0 },
    ],
    hoursPerDay: 8,
    minimumCrew: 2,
    productivityFactors: {
      height: 1.0,
      weather: 0.2,
      complexity: "medium",
    },
  },
  {
    service: "IW",
    roles: [
      { roleId: "technician", count: 1, efficiency: 1.0 },
      { roleId: "helper", count: 1, efficiency: 0.9 },
    ],
    hoursPerDay: 8,
    minimumCrew: 1,
    productivityFactors: {
      height: 1.0,
      weather: 0.0,
      complexity: "low",
    },
  },
  {
    service: "DC",
    roles: [
      { roleId: "crew-lead", count: 1, efficiency: 1.0 },
      { roleId: "technician", count: 1, efficiency: 1.0 },
    ],
    hoursPerDay: 8,
    minimumCrew: 2,
    productivityFactors: {
      height: 1.0,
      weather: 0.4,
      complexity: "medium",
    },
  },
];

export class LaborCalculator {
  /**
   * Calculate comprehensive labor costs for all services
   */
  calculateLaborCosts(
    services: ServiceDuration[],
    buildingHeight: number = 2,
    experienceLevel: "entry" | "standard" | "experienced" = "standard",
  ): LaborCost[] {
    const costs: LaborCost[] = [];

    services.forEach((serviceDuration) => {
      const requirement = CREW_REQUIREMENTS.find(
        (r) => r.service === serviceDuration.service,
      );
      if (!requirement) return;

      const productivityFactors = this.calculateProductivityFactors(
        requirement,
        buildingHeight,
        serviceDuration.weatherImpact,
        experienceLevel,
      );

      requirement.roles.forEach(({ roleId, count, efficiency = 1.0 }) => {
        const role = LABOR_ROLES.find((r) => r.id === roleId);
        if (!role) return;

        const adjustedDuration =
          serviceDuration.finalDuration * productivityFactors.totalMultiplier;
        const totalHours =
          adjustedDuration * requirement.hoursPerDay * count * efficiency;

        // Calculate regular vs overtime hours
        const { regularHours, overtimeHours } = this.calculateHoursBreakdown(
          totalHours,
          serviceDuration.finalDuration,
        );

        // Calculate costs
        const baseCost = regularHours * role.hourlyRate;
        const overtimeCost = overtimeHours * role.overtimeRate;
        const benefitsCost =
          (baseCost + overtimeCost) * (role.benefitsRate / 100);
        const totalCost = baseCost + overtimeCost + benefitsCost;

        costs.push({
          service: serviceDuration.service,
          role: role.title,
          roleId: role.id,
          regularHours,
          overtimeHours,
          totalHours,
          hourlyRate: role.hourlyRate,
          overtimeRate: role.overtimeRate,
          benefitsRate: role.benefitsRate,
          baseCost,
          overtimeCost,
          benefitsCost,
          totalCost,
          workers: count,
          productivity: productivityFactors.totalMultiplier,
          notes: this.generateLaborNotes(
            role,
            requirement,
            productivityFactors,
            buildingHeight,
          ),
        });
      });
    });

    return costs;
  }

  /**
   * Calculate productivity adjustment factors
   */
  private calculateProductivityFactors(
    requirement: CrewRequirement,
    buildingHeight: number,
    weatherImpact: number,
    experienceLevel: string,
  ): {
    heightMultiplier: number;
    weatherMultiplier: number;
    complexityMultiplier: number;
    experienceMultiplier: number;
    totalMultiplier: number;
  } {
    // Height adjustment - more stories = slower work
    const heightMultiplier =
      buildingHeight > 3 ? 1 + (buildingHeight - 3) * 0.05 : 1.0;

    // Weather impact adjustment
    const weatherMultiplier =
      1 + weatherImpact * requirement.productivityFactors.weather;

    // Complexity adjustment
    const complexityMultipliers = {
      low: 0.95,
      medium: 1.0,
      high: 1.15,
    };
    const complexityMultiplier =
      complexityMultipliers[requirement.productivityFactors.complexity];

    // Experience adjustment
    const experienceMultipliers = {
      entry: 1.15, // slower for entry-level crews
      standard: 1.0, // baseline
      experienced: 0.9, // faster for experienced crews
    };
    const experienceMultiplier =
      experienceMultipliers[
        experienceLevel as keyof typeof experienceMultipliers
      ] || 1.0;

    const totalMultiplier =
      heightMultiplier *
      weatherMultiplier *
      complexityMultiplier *
      experienceMultiplier;

    return {
      heightMultiplier,
      weatherMultiplier,
      complexityMultiplier,
      experienceMultiplier,
      totalMultiplier,
    };
  }

  /**
   * Calculate regular vs overtime hours breakdown
   */
  private calculateHoursBreakdown(
    totalHours: number,
    duration: number,
  ): { regularHours: number; overtimeHours: number } {
    // Assume 40-hour work weeks
    const regularWeeklyHours = 40;
    const totalWeeks = Math.ceil(duration / 5);
    const maxRegularHours = totalWeeks * regularWeeklyHours;

    const regularHours = Math.min(totalHours, maxRegularHours);
    const overtimeHours = Math.max(0, totalHours - regularHours);

    return { regularHours, overtimeHours };
  }

  /**
   * Generate contextual notes for labor costs
   */
  private generateLaborNotes(
    role: LaborRole,
    requirement: CrewRequirement,
    factors: any,
    buildingHeight: number,
  ): string {
    const notes: string[] = [];

    if (role.requiredCertifications && role.requiredCertifications.length > 0) {
      notes.push(`Requires: ${role.requiredCertifications.join(", ")}`);
    }

    if (buildingHeight > 5) {
      notes.push("High-rise work - premium rates apply");
    }

    if (factors.weatherMultiplier > 1.1) {
      notes.push("Weather delays factored into schedule");
    }

    if (requirement.productivityFactors.complexity === "high") {
      notes.push("Complex work requiring specialized skills");
    }

    if (factors.totalMultiplier > 1.2) {
      notes.push("Significant productivity adjustments applied");
    }

    return notes.join("; ");
  }

  /**
   * Calculate total labor costs with markup
   */
  calculateTotalLaborCosts(laborCosts: LaborCost[]): {
    subtotal: number;
    markup: number;
    total: number;
    breakdown: {
      regular: number;
      overtime: number;
      benefits: number;
      byRole: Record<string, number>;
      byService: Record<string, number>;
    };
  } {
    const subtotal = laborCosts.reduce((sum, cost) => sum + cost.totalCost, 0);
    const markup = subtotal * 0.35; // 35% markup for labor
    const total = subtotal + markup;

    const regular = laborCosts.reduce((sum, cost) => sum + cost.baseCost, 0);
    const overtime = laborCosts.reduce(
      (sum, cost) => sum + cost.overtimeCost,
      0,
    );
    const benefits = laborCosts.reduce(
      (sum, cost) => sum + cost.benefitsCost,
      0,
    );

    const byRole = laborCosts.reduce(
      (acc, cost) => {
        acc[cost.role] = (acc[cost.role] || 0) + cost.totalCost;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byService = laborCosts.reduce(
      (acc, cost) => {
        acc[cost.service] = (acc[cost.service] || 0) + cost.totalCost;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      subtotal,
      markup,
      total,
      breakdown: {
        regular,
        overtime,
        benefits,
        byRole,
        byService,
      },
    };
  }

  /**
   * Get role by ID
   */
  getRoleById(id: string): LaborRole | undefined {
    return LABOR_ROLES.find((role) => role.id === id);
  }

  /**
   * Get crew requirements for a service
   */
  getCrewRequirement(service: string): CrewRequirement | undefined {
    return CREW_REQUIREMENTS.find((req) => req.service === service);
  }

  /**
   * Calculate minimum crew cost for a service
   */
  calculateMinimumCrewCost(service: string, duration: number): number {
    const requirement = this.getCrewRequirement(service);
    if (!requirement) return 0;

    const minimumRoles = requirement.roles.slice(0, requirement.minimumCrew);
    let totalCost = 0;

    minimumRoles.forEach(({ roleId, count }) => {
      const role = this.getRoleById(roleId);
      if (role) {
        const hours = duration * requirement.hoursPerDay * count;
        totalCost += hours * role.hourlyRate;
      }
    });

    return totalCost;
  }

  /**
   * Estimate labor hours for quick calculations
   */
  estimateLaborHours(
    services: string[],
    totalDuration: number,
  ): {
    totalHours: number;
    crewSize: number;
    averageRate: number;
  } {
    let totalHours = 0;
    let totalWorkers = 0;
    let weightedRate = 0;

    services.forEach((service) => {
      const requirement = this.getCrewRequirement(service);
      if (requirement) {
        const serviceHours = totalDuration * requirement.hoursPerDay;
        const serviceWorkers = requirement.roles.reduce(
          (sum, role) => sum + role.count,
          0,
        );

        totalHours += serviceHours * serviceWorkers;
        totalWorkers += serviceWorkers;

        // Calculate weighted average rate
        requirement.roles.forEach(({ roleId, count }) => {
          const role = this.getRoleById(roleId);
          if (role) {
            weightedRate += role.hourlyRate * count;
          }
        });
      }
    });

    const averageRate = totalWorkers > 0 ? weightedRate / totalWorkers : 0;

    return {
      totalHours,
      crewSize: Math.ceil(totalWorkers / services.length),
      averageRate,
    };
  }
}
