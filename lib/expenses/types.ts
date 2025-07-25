export interface VendorPricing {
  vendorId: string;
  unitCost: number;
  minOrder?: number;
  bulkDiscounts?: { quantity: number; discount: number }[];
  leadTime?: number;
  available: boolean;
}

export interface Material {
  id: string;
  name: string;
  category: "chemical" | "sealant" | "restoration" | "safety" | "consumable";
  unit:
    | "gallon"
    | "pound"
    | "each"
    | "bottle"
    | "bucket"
    | "linear_foot"
    | "box";
  unitCost: number;
  coverage?: number; // sq ft per unit (or linear ft for frame materials)
  dilutionRatio?: number; // for concentrates (1:10 means 1 part concentrate to 10 parts water)
  shelfLife?: number; // months
  requiredFor: string[];
  vendors: VendorPricing[];
  description?: string;
  hazardous?: boolean;
  alternatives?: string[];
}

export interface MeasurementEntry {
  id: string;
  category: string;
  subcategory: string;
  width: number;
  height: number;
  depth?: number;
  quantity: number;
  total: number;
  unit: string;
}

export interface MaterialRequirement {
  material: Material;
  quantity: number;
  service: string;
  totalCost: number;
  coverage: number;
  waste: number; // percentage
  adjustedQuantity: number;
  vendor?: string;
  notes?: string;
}
