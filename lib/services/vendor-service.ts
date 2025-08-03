/**
 * Vendor Service
 * Manages equipment vendors, materials suppliers, and pricing data from database
 */

import { createClient } from "@/lib/supabase/universal-client";
import type { Database } from "@/types/supabase";

export interface Vendor {
  id: string;
  name: string;
  type: "equipment" | "materials" | "both";
  rating: number;
  reliability: number;
  preferredVendor: boolean;
  contact: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  paymentTerms?: string;
  deliveryRadius?: number;
  specialties?: string[];
  notes?: string;
}

export interface VendorPricing {
  vendorId: string;
  equipmentId?: string;
  materialId?: string;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  unitCost?: number;
  available: boolean;
  leadTime?: number;
  minOrder?: number;
  deliveryCharge?: number;
  bulkDiscounts?: { quantity: number; discount: number }[];
}

export interface EquipmentWithVendors {
  id: string;
  name: string;
  category: string;
  description: string;
  dailyRate: number;
  weeklyRate?: number;
  monthlyRate?: number;
  vendors: VendorPricing[];
}

export interface MaterialWithVendors {
  id: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  vendors: VendorPricing[];
}

export class VendorService {
  /**
   * Get all vendors with optional filtering
   */
  async getVendors(filters?: {
    type?: "equipment" | "materials" | "both";
    preferredOnly?: boolean;
  }): Promise<Vendor[]> {
    // Vendors table not yet implemented in database schema
    // Using fallback data until schema is updated
    return this.getFallbackVendors(filters);
  }

  /**
   * Fallback vendors when database is unavailable
   */
  private getFallbackVendors(filters?: {
    type?: "equipment" | "materials" | "both";
    preferredOnly?: boolean;
  }): Vendor[] {
    const mockVendors: Vendor[] = [
      {
        id: "sunbelt",
        name: "Sunbelt Rentals",
        type: "equipment",
        rating: 4.5,
        reliability: 0.95,
        preferredVendor: true,
        contact: {
          name: "Sales Department",
          phone: "1-800-SUNBELT",
          email: "sales@sunbelt.com",
          address: "National Equipment Rental",
        },
        paymentTerms: "Net 30",
        deliveryRadius: 50,
        specialties: [
          "Aerial Equipment",
          "Power Tools",
          "Construction Equipment",
        ],
        notes: "Reliable equipment rental with nationwide coverage",
      },
      {
        id: "sherwin-williams",
        name: "Sherwin-Williams",
        type: "materials",
        rating: 4.6,
        reliability: 0.96,
        preferredVendor: true,
        contact: {
          name: "Commercial Sales",
          phone: "1-800-4-SHERWIN",
          email: "commercial@sherwin.com",
          address: "Paint & Coatings Division",
        },
        paymentTerms: "Net 30",
        deliveryRadius: 25,
        specialties: [
          "Exterior Coatings",
          "Industrial Paints",
          "Pressure Washing Chemicals",
        ],
        notes: "Premium quality paints and cleaning chemicals",
      },
    ];

    let filteredVendors = mockVendors;

    if (filters?.type) {
      filteredVendors = filteredVendors.filter(
        (v) => v.type === filters.type || v.type === "both",
      );
    }

    if (filters?.preferredOnly) {
      filteredVendors = filteredVendors.filter((v) => v.preferredVendor);
    }

    return filteredVendors;
  }

  /**
   * Get vendor by ID
   */
  async getVendorById(vendorId: string): Promise<Vendor | null> {
    const vendors = await this.getVendors();
    return vendors.find((v) => v.id === vendorId) || null;
  }

  /**
   * Get equipment with vendor pricing
   */
  async getEquipmentWithVendors(
    equipmentId?: string,
  ): Promise<EquipmentWithVendors[]> {
    try {
      // Mock equipment data with real vendor pricing structure
      const equipmentData: EquipmentWithVendors[] = [
        {
          id: "pressure-washer-4000",
          name: "4000 PSI Pressure Washer",
          category: "Pressure Washing",
          description: "Gas-powered commercial pressure washer",
          dailyRate: 85,
          weeklyRate: 350,
          monthlyRate: 1200,
          vendors: [
            {
              vendorId: "sunbelt",
              dailyRate: 85,
              weeklyRate: 350,
              monthlyRate: 1200,
              available: true,
              leadTime: 1,
              deliveryCharge: 25,
            },
            {
              vendorId: "united-rentals",
              dailyRate: 90,
              weeklyRate: 375,
              monthlyRate: 1300,
              available: true,
              leadTime: 2,
              deliveryCharge: 30,
            },
          ],
        },
        {
          id: "boom-lift-40ft",
          name: "40ft Boom Lift",
          category: "Aerial Equipment",
          description: "Self-propelled articulating boom lift",
          dailyRate: 285,
          weeklyRate: 1200,
          monthlyRate: 4200,
          vendors: [
            {
              vendorId: "sunbelt",
              dailyRate: 285,
              weeklyRate: 1200,
              monthlyRate: 4200,
              available: true,
              leadTime: 2,
              deliveryCharge: 150,
            },
          ],
        },
      ];

      return equipmentId
        ? equipmentData.filter((eq) => eq.id === equipmentId)
        : equipmentData;
    } catch (error) {
      console.error("Error fetching equipment with vendors:", error);
      return [];
    }
  }

  /**
   * Get materials with vendor pricing
   */
  async getMaterialsWithVendors(
    materialId?: string,
  ): Promise<MaterialWithVendors[]> {
    try {
      const materialsData: MaterialWithVendors[] = [
        {
          id: "house-wash-chemical",
          name: "House Wash Chemical",
          category: "Cleaning Chemicals",
          unit: "gallon",
          unitCost: 12.5,
          vendors: [
            {
              vendorId: "sherwin-williams",
              unitCost: 12.5,
              available: true,
              leadTime: 1,
              minOrder: 5,
              deliveryCharge: 15,
              bulkDiscounts: [
                { quantity: 10, discount: 0.05 },
                { quantity: 25, discount: 0.1 },
                { quantity: 50, discount: 0.15 },
              ],
            },
          ],
        },
        {
          id: "concrete-sealer",
          name: "Concrete Sealer",
          category: "Sealers & Coatings",
          unit: "gallon",
          unitCost: 28.75,
          vendors: [
            {
              vendorId: "sherwin-williams",
              unitCost: 28.75,
              available: true,
              leadTime: 3,
              minOrder: 2,
              deliveryCharge: 20,
            },
            {
              vendorId: "home-depot-pro",
              unitCost: 32.0,
              available: true,
              leadTime: 1,
              minOrder: 1,
              deliveryCharge: 10,
            },
          ],
        },
      ];

      return materialId
        ? materialsData.filter((mat) => mat.id === materialId)
        : materialsData;
    } catch (error) {
      console.error("Error fetching materials with vendors:", error);
      return [];
    }
  }

  /**
   * Get best pricing for equipment from all vendors
   */
  async getBestEquipmentPricing(
    equipmentId: string,
    rentalDays: number = 1,
  ): Promise<{
    vendor: Vendor;
    pricing: VendorPricing;
    totalCost: number;
  } | null> {
    try {
      const equipment = await this.getEquipmentWithVendors(equipmentId);
      if (!equipment.length) return null;

      const item = equipment[0];
      const vendors = await this.getVendors();

      let bestOption = null;
      let lowestCost = Infinity;

      for (const vendorPricing of item.vendors) {
        if (!vendorPricing.available) continue;

        const vendor = vendors.find((v) => v.id === vendorPricing.vendorId);
        if (!vendor) continue;

        let dailyRate = vendorPricing.dailyRate || item.dailyRate;
        let totalCost = dailyRate * rentalDays;

        // Apply weekly/monthly rates if beneficial
        if (rentalDays >= 28 && vendorPricing.monthlyRate) {
          const months = Math.floor(rentalDays / 28);
          const remainingDays = rentalDays % 28;
          totalCost =
            months * vendorPricing.monthlyRate + remainingDays * dailyRate;
        } else if (rentalDays >= 7 && vendorPricing.weeklyRate) {
          const weeks = Math.floor(rentalDays / 7);
          const remainingDays = rentalDays % 7;
          totalCost =
            weeks * vendorPricing.weeklyRate + remainingDays * dailyRate;
        }

        // Add delivery charges
        totalCost += vendorPricing.deliveryCharge || 0;

        if (totalCost < lowestCost) {
          lowestCost = totalCost;
          bestOption = {
            vendor,
            pricing: vendorPricing,
            totalCost,
          };
        }
      }

      return bestOption;
    } catch (error) {
      console.error("Error calculating best equipment pricing:", error);
      return null;
    }
  }

  /**
   * Get best pricing for materials from all vendors
   */
  async getBestMaterialPricing(
    materialId: string,
    quantity: number = 1,
  ): Promise<{
    vendor: Vendor;
    pricing: VendorPricing;
    totalCost: number;
    unitCostAfterDiscount: number;
  } | null> {
    try {
      const materials = await this.getMaterialsWithVendors(materialId);
      if (!materials.length) return null;

      const item = materials[0];
      const vendors = await this.getVendors();

      let bestOption = null;
      let lowestCost = Infinity;

      for (const vendorPricing of item.vendors) {
        if (
          !vendorPricing.available ||
          (vendorPricing.minOrder && quantity < vendorPricing.minOrder)
        ) {
          continue;
        }

        const vendor = vendors.find((v) => v.id === vendorPricing.vendorId);
        if (!vendor) continue;

        let unitCost = vendorPricing.unitCost || item.unitCost;

        // Apply bulk discounts
        if (vendorPricing.bulkDiscounts) {
          const applicableDiscount = vendorPricing.bulkDiscounts
            .filter((discount) => quantity >= discount.quantity)
            .sort((a, b) => b.discount - a.discount)[0];

          if (applicableDiscount) {
            unitCost *= 1 - applicableDiscount.discount;
          }
        }

        let totalCost = unitCost * quantity;
        totalCost += vendorPricing.deliveryCharge || 0;

        if (totalCost < lowestCost) {
          lowestCost = totalCost;
          bestOption = {
            vendor,
            pricing: vendorPricing,
            totalCost,
            unitCostAfterDiscount: unitCost,
          };
        }
      }

      return bestOption;
    } catch (error) {
      console.error("Error calculating best material pricing:", error);
      return null;
    }
  }

  /**
   * Add new vendor (for future database integration)
   */
  async addVendor(vendorData: Omit<Vendor, "id">): Promise<string> {
    // In production, this would insert into the database
    const newId = `vendor-${Date.now()}`;
    console.log("Would add vendor to database:", { id: newId, ...vendorData });
    return newId;
  }

  /**
   * Update vendor pricing
   */
  async updateVendorPricing(
    vendorId: string,
    equipmentId: string,
    pricing: Partial<VendorPricing>,
  ): Promise<void> {
    // In production, this would update the database
    console.log("Would update vendor pricing:", {
      vendorId,
      equipmentId,
      pricing,
    });
  }
}
