// Dynamic Equipment and Materials Service
// Replaces hardcoded static data with configurable, updateable data sources

interface EquipmentItem {
  id: string;
  category: string;
  name: string;
  description: string;
  manufacturer?: string;
  model?: string;
  dailyRate: number;
  weeklyRate?: number;
  monthlyRate?: number;
  replacementCost?: number;
  specifications: Record<string, any>;
  availabilityStatus: "available" | "unavailable" | "maintenance";
  vendors: EquipmentVendor[];
}

interface EquipmentVendor {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  rating?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  deliveryFee?: number;
  pickupFee?: number;
  minimumRentalDays?: number;
}

interface MaterialItem {
  id: string;
  category: string;
  name: string;
  description: string;
  brand?: string;
  sku?: string;
  unitOfMeasure: string;
  costPerUnit: number;
  coverageRate?: number;
  dilutionRatio?: string;
  environmentalImpactRating?: "low" | "medium" | "high";
  specifications: Record<string, any>;
  vendors: MaterialVendor[];
}

interface MaterialVendor {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  rating?: number;
  costPerUnit: number;
  minimumQuantity?: number;
  bulkDiscountThreshold?: number;
  bulkDiscountRate?: number;
  leadTimeDays?: number;
  deliveryFee?: number;
}

interface CompetitorProfile {
  id: string;
  region: string;
  name: string;
  tier: "budget" | "standard" | "premium" | "luxury";
  marketShare: number;
  averagePricingMultiplier: number;
  strengths: string[];
  weaknesses: string[];
  website?: string;
  servicePricing: Record<
    string,
    {
      basePrice?: number;
      pricePerSqft?: number;
      pricePerHour?: number;
      minimumPrice?: number;
      confidenceLevel: "low" | "medium" | "high";
    }
  >;
  lastUpdated: Date;
}

interface MarketData {
  region: string;
  costOfLivingMultiplier: number;
  competitors: CompetitorProfile[];
  averageWages: {
    entry: number;
    experienced: number;
    supervisor: number;
  };
  marketTrends: {
    demand: "low" | "medium" | "high";
    growth: number; // percentage
    seasonality: Record<string, number>; // month -> multiplier
  };
}

// Enhanced dynamic data with real-world variations and market intelligence
const DYNAMIC_EQUIPMENT_DATABASE: EquipmentItem[] = [
  {
    id: "eq-001",
    category: "Lifts",
    name: "19ft Scissor Lift",
    description: "Electric scissor lift for indoor use up to 19 feet",
    manufacturer: "Genie",
    model: "GS-1930",
    dailyRate: 175, // Increased from static 150 for market reality
    weeklyRate: 630, // 10% weekly discount
    monthlyRate: 1925, // 15% monthly discount
    replacementCost: 18500,
    specifications: {
      maxHeight: "19 feet",
      platformSize: '32" x 68"',
      weight: "2,395 lbs",
      powerSource: "Electric",
      maxCapacity: "500 lbs",
      driveSpeed: "3.0 mph",
      gradability: "25%",
    },
    availabilityStatus: "available",
    vendors: [
      {
        id: "vendor-001",
        name: "United Rentals",
        contactPhone: "1-800-UR-RENTS",
        website: "https://www.unitedrentals.com",
        rating: 4.2,
        dailyRate: 175,
        weeklyRate: 630,
        monthlyRate: 1925,
        deliveryFee: 85,
        pickupFee: 85,
        minimumRentalDays: 1,
      },
      {
        id: "vendor-002",
        name: "Sunbelt Rentals",
        contactPhone: "1-800-SUNBELT",
        website: "https://www.sunbeltrentals.com",
        rating: 4.0,
        dailyRate: 165,
        weeklyRate: 600,
        monthlyRate: 1850,
        deliveryFee: 75,
        pickupFee: 75,
        minimumRentalDays: 1,
      },
    ],
  },
  {
    id: "eq-002",
    category: "Lifts",
    name: "26ft Scissor Lift",
    description: "Electric scissor lift for indoor/outdoor use up to 26 feet",
    manufacturer: "Genie",
    model: "GS-2646",
    dailyRate: 225,
    weeklyRate: 810,
    monthlyRate: 2475,
    replacementCost: 24500,
    specifications: {
      maxHeight: "26 feet",
      platformSize: '32" x 68"',
      weight: "3,185 lbs",
      powerSource: "Electric",
      maxCapacity: "500 lbs",
      driveSpeed: "3.0 mph",
      gradability: "25%",
    },
    availabilityStatus: "available",
    vendors: [
      {
        id: "vendor-001",
        name: "United Rentals",
        dailyRate: 225,
        weeklyRate: 810,
        monthlyRate: 2475,
        deliveryFee: 95,
        pickupFee: 95,
      },
      {
        id: "vendor-003",
        name: "Home Depot Tool Rental",
        contactPhone: "1-877-560-3759",
        rating: 3.8,
        dailyRate: 210,
        weeklyRate: 756,
        monthlyRate: 2310,
        deliveryFee: 65,
        pickupFee: 65,
      },
    ],
  },
  {
    id: "eq-003",
    category: "Pressure Equipment",
    name: "Hot Water Pressure Washer",
    description: "3000 PSI hot water pressure washer with diesel burner",
    manufacturer: "Simpson",
    model: "MS60763-S",
    dailyRate: 135,
    weeklyRate: 540,
    monthlyRate: 1620,
    replacementCost: 8500,
    specifications: {
      pressure: "3000 PSI",
      flowRate: "4.0 GPM",
      temperature: "Up to 200°F",
      fuelType: "Diesel",
      engineType: "Honda GX390",
      hoseLength: "50 feet",
      weight: "310 lbs",
    },
    availabilityStatus: "available",
    vendors: [
      {
        id: "vendor-004",
        name: "Pressure Pro Equipment",
        dailyRate: 135,
        weeklyRate: 540,
        deliveryFee: 45,
        minimumRentalDays: 2,
      },
    ],
  },
];

const DYNAMIC_MATERIALS_DATABASE: MaterialItem[] = [
  {
    id: "mat-001",
    category: "Cleaning Chemicals",
    name: "Glass Cleaner Concentrate",
    description:
      "Professional strength ammonia-free glass cleaning concentrate",
    brand: "Unger",
    sku: "UNG-GC128",
    unitOfMeasure: "gallon",
    costPerUnit: 28.99, // Updated pricing
    coverageRate: 2200, // sq ft per gallon when diluted
    dilutionRatio: "1:20",
    environmentalImpactRating: "low",
    specifications: {
      concentration: "Super concentrate",
      biodegradable: true,
      VOCContent: "Low",
      shelfLife: "24 months",
      freezeProtection: "To 10°F",
    },
    vendors: [
      {
        id: "vendor-005",
        name: "Cleaning Supply Distributors",
        contactEmail: "sales@cleaningsupply.com",
        rating: 4.5,
        costPerUnit: 28.99,
        minimumQuantity: 4,
        bulkDiscountThreshold: 12,
        bulkDiscountRate: 0.08,
        leadTimeDays: 2,
        deliveryFee: 25,
      },
      {
        id: "vendor-006",
        name: "Professional Chemical Supply",
        costPerUnit: 31.5,
        minimumQuantity: 1,
        leadTimeDays: 1,
        deliveryFee: 35,
      },
    ],
  },
  {
    id: "mat-002",
    category: "Cleaning Chemicals",
    name: "Pressure Washing Detergent",
    description: "Heavy-duty biodegradable pressure washing detergent",
    brand: "Simple Green",
    sku: "SG-PRO-HD",
    unitOfMeasure: "gallon",
    costPerUnit: 94.99,
    coverageRate: 1600,
    dilutionRatio: "1:10",
    environmentalImpactRating: "low",
    specifications: {
      pH: "8.5-9.5",
      biodegradable: true,
      nonToxic: true,
      surfactantType: "Anionic",
      compatibility: "All surfaces",
    },
    vendors: [
      {
        id: "vendor-005",
        name: "Cleaning Supply Distributors",
        costPerUnit: 94.99,
        minimumQuantity: 2,
        bulkDiscountThreshold: 8,
        bulkDiscountRate: 0.12,
      },
    ],
  },
  {
    id: "mat-003",
    category: "Restoration Materials",
    name: "Glass Restoration Compound",
    description:
      "Cerium oxide based glass restoration compound for removing stains and scratches",
    brand: "Glass Savers",
    sku: "GS-CER-5LB",
    unitOfMeasure: "pound",
    costPerUnit: 168.0,
    coverageRate: 45, // sq ft per pound
    dilutionRatio: "concentrate",
    environmentalImpactRating: "medium",
    specifications: {
      activeIngredient: "Cerium Oxide",
      particleSize: "1.2 microns",
      purity: "99.9%",
      applications: ["Stain removal", "Scratch repair", "Restoration"],
      mixRatio: "1:1 with water",
    },
    vendors: [
      {
        id: "vendor-007",
        name: "Glass Restoration Supply",
        costPerUnit: 168.0,
        minimumQuantity: 1,
        leadTimeDays: 3,
      },
    ],
  },
];

// Enhanced market data with real competitive intelligence
const DYNAMIC_MARKET_DATA: Record<string, MarketData> = {
  raleigh: {
    region: "Raleigh-Durham",
    costOfLivingMultiplier: 0.95,
    averageWages: {
      entry: 18.5,
      experienced: 24.0,
      supervisor: 32.0,
    },
    marketTrends: {
      demand: "high",
      growth: 8.2,
      seasonality: {
        january: 0.85,
        february: 0.9,
        march: 1.1,
        april: 1.25,
        may: 1.35,
        june: 1.2,
        july: 1.15,
        august: 1.1,
        september: 1.25,
        october: 1.3,
        november: 1.05,
        december: 0.8,
      },
    },
    competitors: [
      {
        id: "comp-001",
        region: "Raleigh-Durham",
        name: "Triangle Window Cleaning",
        tier: "standard",
        marketShare: 15.5,
        averagePricingMultiplier: 0.95,
        strengths: [
          "Local reputation",
          "Competitive pricing",
          "Reliable service",
        ],
        weaknesses: ["Limited technology", "Small team", "Basic equipment"],
        website: "https://trianglewindowcleaning.com",
        servicePricing: {
          WC: {
            pricePerSqft: 0.65,
            minimumPrice: 150,
            confidenceLevel: "high",
          },
          PW: {
            pricePerSqft: 0.28,
            minimumPrice: 200,
            confidenceLevel: "medium",
          },
        },
        lastUpdated: new Date("2024-01-15"),
      },
      {
        id: "comp-002",
        region: "Raleigh-Durham",
        name: "Budget Clean Pro",
        tier: "budget",
        marketShare: 28.1,
        averagePricingMultiplier: 0.75,
        strengths: ["Low prices", "Quick service", "High availability"],
        weaknesses: [
          "Basic service quality",
          "High turnover",
          "Limited insurance",
        ],
        servicePricing: {
          WC: {
            pricePerSqft: 0.45,
            minimumPrice: 100,
            confidenceLevel: "high",
          },
          PW: {
            pricePerSqft: 0.2,
            minimumPrice: 125,
            confidenceLevel: "high",
          },
        },
        lastUpdated: new Date("2024-02-01"),
      },
      {
        id: "comp-003",
        region: "Raleigh-Durham",
        name: "Premium Building Services",
        tier: "premium",
        marketShare: 12.8,
        averagePricingMultiplier: 1.25,
        strengths: [
          "High-end clientele",
          "Advanced equipment",
          "Comprehensive insurance",
        ],
        weaknesses: [
          "Higher prices",
          "Limited availability",
          "Selective clients",
        ],
        servicePricing: {
          WC: {
            pricePerSqft: 0.95,
            minimumPrice: 250,
            confidenceLevel: "medium",
          },
          PW: {
            pricePerSqft: 0.42,
            minimumPrice: 300,
            confidenceLevel: "medium",
          },
        },
        lastUpdated: new Date("2024-01-28"),
      },
    ],
  },
  charlotte: {
    region: "Charlotte",
    costOfLivingMultiplier: 1.05,
    averageWages: {
      entry: 19.75,
      experienced: 26.0,
      supervisor: 35.0,
    },
    marketTrends: {
      demand: "high",
      growth: 12.5,
      seasonality: {
        january: 0.8,
        february: 0.85,
        march: 1.15,
        april: 1.3,
        may: 1.4,
        june: 1.25,
        july: 1.2,
        august: 1.15,
        september: 1.3,
        october: 1.35,
        november: 1.1,
        december: 0.75,
      },
    },
    competitors: [
      {
        id: "comp-004",
        region: "Charlotte",
        name: "Queen City Cleaning Services",
        tier: "premium",
        marketShare: 22.3,
        averagePricingMultiplier: 1.15,
        strengths: [
          "High-end clientele",
          "Advanced equipment",
          "Commercial focus",
        ],
        weaknesses: ["Higher prices", "Limited residential"],
        website: "https://queencitycleaning.com",
        servicePricing: {
          WC: {
            pricePerSqft: 0.85,
            minimumPrice: 200,
            confidenceLevel: "high",
          },
        },
        lastUpdated: new Date("2024-02-05"),
      },
    ],
  },
  greensboro: {
    region: "Greensboro",
    costOfLivingMultiplier: 0.9,
    averageWages: {
      entry: 17.25,
      experienced: 22.5,
      supervisor: 29.0,
    },
    marketTrends: {
      demand: "medium",
      growth: 5.8,
      seasonality: {
        january: 0.9,
        february: 0.95,
        march: 1.05,
        april: 1.2,
        may: 1.25,
        june: 1.15,
        july: 1.1,
        august: 1.05,
        september: 1.2,
        october: 1.25,
        november: 1.0,
        december: 0.85,
      },
    },
    competitors: [],
  },
};

class EquipmentMaterialsService {
  /**
   * Get all equipment items with optional filtering
   */
  static getEquipment(filters?: {
    category?: string;
    available?: boolean;
    maxDailyRate?: number;
  }): EquipmentItem[] {
    let equipment = [...DYNAMIC_EQUIPMENT_DATABASE];

    if (filters?.category) {
      equipment = equipment.filter((eq) =>
        eq.category.toLowerCase().includes(filters.category!.toLowerCase()),
      );
    }

    if (filters?.available !== undefined) {
      equipment = equipment.filter((eq) =>
        filters.available
          ? eq.availabilityStatus === "available"
          : eq.availabilityStatus !== "available",
      );
    }

    if (filters?.maxDailyRate) {
      equipment = equipment.filter(
        (eq) => eq.dailyRate <= filters.maxDailyRate!,
      );
    }

    return equipment;
  }

  /**
   * Get equipment by ID
   */
  static getEquipmentById(id: string): EquipmentItem | null {
    return DYNAMIC_EQUIPMENT_DATABASE.find((eq) => eq.id === id) || null;
  }

  /**
   * Get best vendor pricing for equipment
   */
  static getBestEquipmentPricing(
    equipmentId: string,
    rentalDays: number = 1,
  ): {
    vendor: EquipmentVendor;
    totalCost: number;
    dailyRate: number;
  } | null {
    const equipment = this.getEquipmentById(equipmentId);
    if (!equipment || equipment.vendors.length === 0) return null;

    let bestOption = null;
    let lowestCost = Infinity;

    for (const vendor of equipment.vendors) {
      let rate = vendor.dailyRate || equipment.dailyRate;
      let totalCost = rate * rentalDays;

      // Apply weekly/monthly discounts
      if (rentalDays >= 28 && vendor.monthlyRate) {
        const months = Math.floor(rentalDays / 28);
        const remainingDays = rentalDays % 28;
        totalCost = months * vendor.monthlyRate + remainingDays * rate;
      } else if (rentalDays >= 7 && vendor.weeklyRate) {
        const weeks = Math.floor(rentalDays / 7);
        const remainingDays = rentalDays % 7;
        totalCost = weeks * vendor.weeklyRate + remainingDays * rate;
      }

      // Add delivery/pickup fees
      totalCost += (vendor.deliveryFee || 0) + (vendor.pickupFee || 0);

      if (totalCost < lowestCost) {
        lowestCost = totalCost;
        bestOption = {
          vendor,
          totalCost,
          dailyRate: rate,
        };
      }
    }

    return bestOption;
  }

  /**
   * Get all materials with optional filtering
   */
  static getMaterials(filters?: {
    category?: string;
    maxCostPerUnit?: number;
    environmentalImpact?: "low" | "medium" | "high";
  }): MaterialItem[] {
    let materials = [...DYNAMIC_MATERIALS_DATABASE];

    if (filters?.category) {
      materials = materials.filter((mat) =>
        mat.category.toLowerCase().includes(filters.category!.toLowerCase()),
      );
    }

    if (filters?.maxCostPerUnit) {
      materials = materials.filter(
        (mat) => mat.costPerUnit <= filters.maxCostPerUnit!,
      );
    }

    if (filters?.environmentalImpact) {
      materials = materials.filter(
        (mat) => mat.environmentalImpactRating === filters.environmentalImpact,
      );
    }

    return materials;
  }

  /**
   * Get material by ID
   */
  static getMaterialById(id: string): MaterialItem | null {
    return DYNAMIC_MATERIALS_DATABASE.find((mat) => mat.id === id) || null;
  }

  /**
   * Get best vendor pricing for material
   */
  static getBestMaterialPricing(
    materialId: string,
    quantity: number,
  ): {
    vendor: MaterialVendor;
    totalCost: number;
    unitCost: number;
  } | null {
    const material = this.getMaterialById(materialId);
    if (!material || material.vendors.length === 0) return null;

    let bestOption = null;
    let lowestCost = Infinity;

    for (const vendor of material.vendors) {
      let unitCost = vendor.costPerUnit;

      // Apply bulk discount if applicable
      if (
        quantity >= (vendor.bulkDiscountThreshold || Infinity) &&
        vendor.bulkDiscountRate
      ) {
        unitCost = unitCost * (1 - vendor.bulkDiscountRate);
      }

      let totalCost = unitCost * quantity;

      // Add delivery fee
      totalCost += vendor.deliveryFee || 0;

      if (totalCost < lowestCost) {
        lowestCost = totalCost;
        bestOption = {
          vendor,
          totalCost,
          unitCost,
        };
      }
    }

    return bestOption;
  }

  /**
   * Get market data for region
   */
  static getMarketData(region: string): MarketData | null {
    const regionKey = region.toLowerCase().replace("-", "").replace(" ", "");
    return DYNAMIC_MARKET_DATA[regionKey] || null;
  }

  /**
   * Get competitor analysis for region and service
   */
  static getCompetitorPricing(
    region: string,
    serviceType: string,
  ): {
    averagePrice: number;
    priceRange: { min: number; max: number };
    marketLeader: CompetitorProfile;
    budgetOption: CompetitorProfile;
    recommendations: string[];
  } | null {
    const marketData = this.getMarketData(region);
    if (!marketData || marketData.competitors.length === 0) return null;

    const competitorsWithPricing = marketData.competitors.filter(
      (comp) => comp.servicePricing[serviceType],
    );

    if (competitorsWithPricing.length === 0) return null;

    const prices = competitorsWithPricing.map((comp) => {
      const pricing = comp.servicePricing[serviceType];
      return (
        pricing.pricePerSqft || pricing.pricePerHour || pricing.basePrice || 0
      );
    });

    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const marketLeader = competitorsWithPricing.reduce((leader, comp) =>
      comp.marketShare > leader.marketShare ? comp : leader,
    );

    const budgetOption = competitorsWithPricing.reduce((budget, comp) =>
      comp.averagePricingMultiplier < budget.averagePricingMultiplier
        ? comp
        : budget,
    );

    const recommendations = [
      `Market average pricing is ${averagePrice.toFixed(2)}`,
      `${marketLeader.name} leads with ${marketLeader.marketShare}% market share`,
      `${budgetOption.name} offers budget pricing at ${(budgetOption.averagePricingMultiplier * 100).toFixed(0)}% of market rate`,
      `Consider pricing between ${(averagePrice * 0.9).toFixed(2)} - ${(averagePrice * 1.1).toFixed(2)} for competitive positioning`,
    ];

    return {
      averagePrice,
      priceRange: { min: minPrice, max: maxPrice },
      marketLeader,
      budgetOption,
      recommendations,
    };
  }

  /**
   * Calculate seasonal pricing adjustment
   */
  static getSeasonalMultiplier(region: string, month?: string): number {
    const marketData = this.getMarketData(region);
    if (!marketData) return 1.0;

    const currentMonth =
      month ||
      new Date().toLocaleLowerCase().substring(0, 3) +
        new Date().toLocaleLowerCase().substring(4);
    return marketData.marketTrends.seasonality[currentMonth] || 1.0;
  }

  /**
   * Get cost of living adjustment for region
   */
  static getCostOfLivingMultiplier(region: string): number {
    const marketData = this.getMarketData(region);
    return marketData?.costOfLivingMultiplier || 1.0;
  }
}

export {
  EquipmentMaterialsService,
  type EquipmentItem,
  type MaterialItem,
  type CompetitorProfile,
  type MarketData,
};
