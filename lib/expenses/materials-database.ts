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
  category: 'chemical' | 'sealant' | 'restoration' | 'safety' | 'consumable';
  unit: 'gallon' | 'pound' | 'each' | 'bottle' | 'bucket' | 'linear_foot' | 'box';
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

export const MATERIALS_DATABASE: Material[] = [
  // Pressure Washing Chemicals
  {
    id: 'degreaser-heavy',
    name: 'Heavy Duty Degreaser',
    category: 'chemical',
    unit: 'gallon',
    unitCost: 45,
    coverage: 1000, // sq ft per gallon diluted
    dilutionRatio: 8, // 1:8 dilution
    shelfLife: 24,
    requiredFor: ['BWP', 'BWS', 'PWF', 'PWP'],
    vendors: [
      { vendorId: 'chemstation', unitCost: 45, minOrder: 5, available: true, leadTime: 2 },
      { vendorId: 'ecolab', unitCost: 48, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'zep', unitCost: 42, minOrder: 4, available: true, leadTime: 3 }
    ],
    description: 'Industrial strength degreaser for heavy soil removal',
    hazardous: true,
    alternatives: ['degreaser-medium', 'bio-degreaser']
  },
  {
    id: 'degreaser-medium',
    name: 'Medium Duty Degreaser',
    category: 'chemical',
    unit: 'gallon',
    unitCost: 32,
    coverage: 1200,
    dilutionRatio: 10,
    shelfLife: 18,
    requiredFor: ['BWP', 'BWS', 'PWF'],
    vendors: [
      { vendorId: 'simple-green', unitCost: 32, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'chemstation', unitCost: 35, minOrder: 4, available: true, leadTime: 2 }
    ],
    description: 'All-purpose degreaser for general cleaning'
  },
  {
    id: 'concrete-cleaner',
    name: 'Concrete & Masonry Cleaner',
    category: 'chemical',
    unit: 'gallon',
    unitCost: 35,
    coverage: 500,
    dilutionRatio: 4,
    shelfLife: 36,
    requiredFor: ['BWP', 'BWS', 'PWF', 'PWP', 'DC'],
    vendors: [
      { vendorId: 'prosoco', unitCost: 35, minOrder: 2, available: true, leadTime: 2 },
      { vendorId: 'chemstation', unitCost: 38, minOrder: 5, available: true, leadTime: 1 },
      { vendorId: 'surecrete', unitCost: 33, minOrder: 4, available: true, leadTime: 3 }
    ],
    description: 'Specialized cleaner for concrete and masonry surfaces',
    hazardous: true
  },
  {
    id: 'mold-mildew-remover',
    name: 'Mold & Mildew Remover',
    category: 'chemical',
    unit: 'gallon',
    unitCost: 28,
    coverage: 800,
    dilutionRatio: 3,
    shelfLife: 12,
    requiredFor: ['BWS', 'IW'],
    vendors: [
      { vendorId: 'concrobium', unitCost: 28, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'zep', unitCost: 30, minOrder: 6, available: true, leadTime: 2 }
    ],
    description: 'EPA-approved mold and mildew treatment',
    hazardous: true
  },
  
  // Sealing Materials
  {
    id: 'siloxane-sealer',
    name: 'Siloxane Water Repellent Sealer',
    category: 'sealant',
    unit: 'gallon',
    unitCost: 125,
    coverage: 150, // sq ft per gallon
    shelfLife: 60,
    requiredFor: ['BWS'],
    vendors: [
      { vendorId: 'prosoco', unitCost: 125, minOrder: 1, available: true, leadTime: 3 },
      { vendorId: 'sicor', unitCost: 118, minOrder: 4, available: true, leadTime: 5 },
      { vendorId: 'chemmaster', unitCost: 135, minOrder: 1, available: true, leadTime: 2 }
    ],
    description: 'Premium penetrating water repellent for masonry',
    alternatives: ['silane-sealer', 'acrylic-sealer']
  },
  {
    id: 'silane-sealer',
    name: 'Silane Water Repellent Sealer',
    category: 'sealant',
    unit: 'gallon',
    unitCost: 95,
    coverage: 120,
    shelfLife: 48,
    requiredFor: ['BWS'],
    vendors: [
      { vendorId: 'prosoco', unitCost: 95, minOrder: 1, available: true, leadTime: 2 },
      { vendorId: 'sicor', unitCost: 88, minOrder: 5, available: true, leadTime: 4 }
    ],
    description: 'Cost-effective water repellent for brick and stone'
  },
  {
    id: 'acrylic-sealer',
    name: 'Acrylic Concrete Sealer',
    category: 'sealant',
    unit: 'gallon',
    unitCost: 85,
    coverage: 200,
    shelfLife: 36,
    requiredFor: ['BWS', 'DC'],
    vendors: [
      { vendorId: 'seal-krete', unitCost: 85, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'behr', unitCost: 78, minOrder: 2, available: true, leadTime: 1 },
      { vendorId: 'sherwin', unitCost: 92, minOrder: 1, available: true, leadTime: 2 }
    ],
    description: 'Protective acrylic coating for concrete surfaces'
  },
  
  // Window Cleaning Materials
  {
    id: 'glass-cleaner-concentrate',
    name: 'Professional Glass Cleaner Concentrate',
    category: 'chemical',
    unit: 'gallon',
    unitCost: 25,
    coverage: 2000, // sq ft per gallon diluted
    dilutionRatio: 64, // 1:64 dilution (2oz per gallon)
    shelfLife: 24,
    requiredFor: ['WC'],
    vendors: [
      { vendorId: 'unger', unitCost: 25, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'ettore', unitCost: 28, minOrder: 4, available: true, leadTime: 2 },
      { vendorId: 'sorbo', unitCost: 22, minOrder: 6, available: true, leadTime: 3 }
    ],
    description: 'Premium streak-free window cleaning concentrate'
  },
  {
    id: 'squeegee-rubber',
    name: 'Squeegee Rubber (per 100ft roll)',
    category: 'consumable',
    unit: 'each',
    unitCost: 45,
    requiredFor: ['WC'],
    vendors: [
      { vendorId: 'ettore', unitCost: 45, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'unger', unitCost: 48, minOrder: 2, available: true, leadTime: 2 },
      { vendorId: 'pulex', unitCost: 42, minOrder: 1, available: true, leadTime: 1 }
    ],
    description: 'Professional grade squeegee rubber, soft grade'
  },
  {
    id: 'scrubber-sleeves',
    name: 'T-Bar Scrubber Sleeves (Pack of 12)',
    category: 'consumable',
    unit: 'box',
    unitCost: 35,
    requiredFor: ['WC'],
    vendors: [
      { vendorId: 'unger', unitCost: 35, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'ettore', unitCost: 38, minOrder: 2, available: true, leadTime: 1 }
    ],
    description: 'Microfiber scrubber sleeves for window washing'
  },
  
  // Glass Restoration Materials
  {
    id: 'cerium-oxide',
    name: 'Cerium Oxide Polishing Compound',
    category: 'restoration',
    unit: 'pound',
    unitCost: 65,
    coverage: 100, // sq ft per pound
    shelfLife: 60,
    requiredFor: ['GR'],
    vendors: [
      { vendorId: 'trinova', unitCost: 65, minOrder: 1, available: true, leadTime: 2 },
      { vendorId: 'glass-medic', unitCost: 72, minOrder: 5, available: true, leadTime: 3 },
      { vendorId: 'restoration', unitCost: 58, minOrder: 10, available: true, leadTime: 5 }
    ],
    description: 'Professional glass polishing compound for scratch removal'
  },
  {
    id: 'polishing-pads',
    name: 'Glass Polishing Pads (Set of 5)',
    category: 'restoration',
    unit: 'each',
    unitCost: 85,
    requiredFor: ['GR'],
    vendors: [
      { vendorId: 'trinova', unitCost: 85, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'glass-medic', unitCost: 92, minOrder: 2, available: true, leadTime: 2 }
    ],
    description: 'Various grit polishing pads for glass restoration'
  },
  {
    id: 'glass-restoration-kit',
    name: 'Complete Glass Restoration Kit',
    category: 'restoration',
    unit: 'each',
    unitCost: 250,
    coverage: 500,
    requiredFor: ['GR'],
    vendors: [
      { vendorId: 'glass-medic', unitCost: 250, minOrder: 1, available: true, leadTime: 3 },
      { vendorId: 'restoration', unitCost: 275, minOrder: 1, available: true, leadTime: 5 }
    ],
    description: 'Complete kit with compounds, pads, and tools'
  },
  
  // Hard Floor Scrubbing Materials
  {
    id: 'floor-degreaser',
    name: 'Commercial Floor Degreaser',
    category: 'chemical',
    unit: 'gallon',
    unitCost: 38,
    coverage: 2000,
    dilutionRatio: 16,
    shelfLife: 18,
    requiredFor: ['HFS'],
    vendors: [
      { vendorId: 'ecolab', unitCost: 38, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'diversey', unitCost: 42, minOrder: 4, available: true, leadTime: 2 },
      { vendorId: 'zep', unitCost: 35, minOrder: 6, available: true, leadTime: 2 }
    ],
    description: 'Heavy-duty floor cleaning concentrate'
  },
  {
    id: 'floor-stripper',
    name: 'Floor Finish Stripper',
    category: 'chemical',
    unit: 'gallon',
    unitCost: 45,
    coverage: 1000,
    dilutionRatio: 4,
    shelfLife: 24,
    requiredFor: ['HFS'],
    vendors: [
      { vendorId: 'ecolab', unitCost: 45, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'diversey', unitCost: 48, minOrder: 2, available: true, leadTime: 2 }
    ],
    description: 'Professional floor wax and finish remover',
    hazardous: true
  },
  {
    id: 'scrubber-pads',
    name: 'Floor Scrubber Pads (Pack of 5)',
    category: 'consumable',
    unit: 'box',
    unitCost: 42,
    requiredFor: ['HFS'],
    vendors: [
      { vendorId: '3m', unitCost: 42, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'clarke', unitCost: 38, minOrder: 2, available: true, leadTime: 2 }
    ],
    description: 'Heavy-duty scrubbing pads for floor machines'
  },
  
  // Parking Cleaning Materials
  {
    id: 'oil-stain-remover',
    name: 'Oil Stain Remover',
    category: 'chemical',
    unit: 'gallon',
    unitCost: 55,
    coverage: 300,
    dilutionRatio: 2,
    shelfLife: 12,
    requiredFor: ['PC', 'PWP'],
    vendors: [
      { vendorId: 'oil-eater', unitCost: 55, minOrder: 1, available: true, leadTime: 2 },
      { vendorId: 'zep', unitCost: 52, minOrder: 4, available: true, leadTime: 2 },
      { vendorId: 'chemstation', unitCost: 58, minOrder: 6, available: true, leadTime: 3 }
    ],
    description: 'Specialized oil and grease stain treatment'
  },
  {
    id: 'gum-remover',
    name: 'Chewing Gum Remover',
    category: 'chemical',
    unit: 'bottle',
    unitCost: 35,
    coverage: 500, // applications
    shelfLife: 24,
    requiredFor: ['PC'],
    vendors: [
      { vendorId: 'goo-gone', unitCost: 35, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'zep', unitCost: 38, minOrder: 6, available: true, leadTime: 2 }
    ],
    description: 'Freeze spray for gum removal'
  },
  
  // Interior Wall Cleaning Materials
  {
    id: 'wall-cleaner',
    name: 'Wall & Surface Cleaner',
    category: 'chemical',
    unit: 'gallon',
    unitCost: 28,
    coverage: 1500,
    dilutionRatio: 12,
    shelfLife: 18,
    requiredFor: ['IW'],
    vendors: [
      { vendorId: 'simple-green', unitCost: 28, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'krud-kutter', unitCost: 32, minOrder: 2, available: true, leadTime: 1 }
    ],
    description: 'Multi-surface cleaner for interior walls'
  },
  
  // Deck Cleaning Materials
  {
    id: 'deck-cleaner',
    name: 'Deck & Fence Cleaner',
    category: 'chemical',
    unit: 'gallon',
    unitCost: 42,
    coverage: 400,
    dilutionRatio: 3,
    shelfLife: 24,
    requiredFor: ['DC'],
    vendors: [
      { vendorId: 'olympic', unitCost: 42, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'behr', unitCost: 45, minOrder: 2, available: true, leadTime: 1 },
      { vendorId: 'cabot', unitCost: 38, minOrder: 4, available: true, leadTime: 2 }
    ],
    description: 'Wood cleaning and brightening solution'
  },
  {
    id: 'deck-brightener',
    name: 'Deck Brightener/Neutralizer',
    category: 'chemical',
    unit: 'gallon',
    unitCost: 38,
    coverage: 500,
    dilutionRatio: 4,
    shelfLife: 36,
    requiredFor: ['DC'],
    vendors: [
      { vendorId: 'olympic', unitCost: 38, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'cabot', unitCost: 35, minOrder: 3, available: true, leadTime: 2 }
    ],
    description: 'Oxalic acid based wood brightener'
  },
  
  // Safety Materials
  {
    id: 'caution-tape',
    name: 'Caution Tape (1000ft roll)',
    category: 'safety',
    unit: 'each',
    unitCost: 15,
    requiredFor: ['BWP', 'BWS', 'WC', 'GR', 'PWF', 'PWP', 'HFS', 'PC', 'DC'],
    vendors: [
      { vendorId: 'uline', unitCost: 15, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'grainger', unitCost: 18, minOrder: 6, available: true, leadTime: 1 }
    ],
    description: 'High visibility warning tape for work areas'
  },
  {
    id: 'drop-cloths',
    name: 'Heavy Duty Drop Cloths (12x15)',
    category: 'safety',
    unit: 'each',
    unitCost: 25,
    requiredFor: ['GR', 'HFS', 'IW'],
    vendors: [
      { vendorId: 'uline', unitCost: 25, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'home-depot', unitCost: 28, minOrder: 1, available: true, leadTime: 0 }
    ],
    description: 'Canvas drop cloths for surface protection'
  },
  {
    id: 'plastic-sheeting',
    name: 'Plastic Sheeting (6 mil, 20x100)',
    category: 'safety',
    unit: 'each',
    unitCost: 45,
    requiredFor: ['BWP', 'BWS', 'GR', 'DC'],
    vendors: [
      { vendorId: 'uline', unitCost: 45, minOrder: 1, available: true, leadTime: 1 },
      { vendorId: 'home-depot', unitCost: 52, minOrder: 1, available: true, leadTime: 0 }
    ],
    description: 'Heavy duty plastic for area protection'
  },
  
  // Consumables
  {
    id: 'rags-cotton',
    name: 'Cotton Cleaning Rags (50 lb box)',
    category: 'consumable',
    unit: 'box',
    unitCost: 85,
    requiredFor: ['WC', 'GR', 'IW', 'DC'],
    vendors: [
      { vendorId: 'textile-depot', unitCost: 85, minOrder: 1, available: true, leadTime: 2 },
      { vendorId: 'uline', unitCost: 92, minOrder: 1, available: true, leadTime: 1 }
    ],
    description: 'Industrial grade cotton cleaning rags'
  },
  {
    id: 'paper-towels',
    name: 'Paper Towels (12 roll case)',
    category: 'consumable',
    unit: 'box',
    unitCost: 45,
    requiredFor: ['WC', 'IW', 'HFS'],
    vendors: [
      { vendorId: 'costco', unitCost: 45, minOrder: 1, available: true, leadTime: 0 },
      { vendorId: 'grainger', unitCost: 52, minOrder: 1, available: true, leadTime: 1 }
    ],
    description: 'Commercial grade paper towels'
  }
];

export class MaterialCalculator {
  /**
   * Calculate required materials based on services and measurements
   */
  calculateRequiredMaterials(
    services: string[],
    measurements: MeasurementEntry[]
  ): MaterialRequirement[] {
    const requirements: MaterialRequirement[] = [];
    
    services.forEach(service => {
      const materials = MATERIALS_DATABASE.filter(m => 
        m.requiredFor.includes(service)
      );
      
      materials.forEach(material => {
        const baseQuantity = this.calculateQuantity(material, service, measurements);
        if (baseQuantity > 0) {
          const waste = this.getWastePercentage(material, service);
          const adjustedQuantity = Math.ceil(baseQuantity * (1 + waste / 100));
          const coverage = this.calculateCoverage(material, service, measurements);
          
          requirements.push({
            material,
            quantity: baseQuantity,
            adjustedQuantity,
            service,
            totalCost: adjustedQuantity * material.unitCost,
            coverage,
            waste,
            notes: this.generateMaterialNotes(material, service, adjustedQuantity)
          });
        }
      });
    });
    
    // Consolidate duplicate materials across services
    return this.consolidateMaterials(requirements);
  }
  
  /**
   * Calculate base quantity needed for a material
   */
  private calculateQuantity(
    material: Material,
    service: string,
    measurements: MeasurementEntry[]
  ): number {
    if (!material.coverage) {
      // Non-coverage based materials (tools, safety items, consumables)
      return this.getFixedQuantity(material, service);
    }
    
    let totalArea = 0;
    
    switch (service) {
      case 'BWP':
      case 'BWS':
        totalArea = measurements
          .filter(m => m.category.startsWith('facade_') || m.category === 'flat_surface')
          .reduce((sum, m) => sum + m.total, 0);
        break;
        
      case 'WC':
      case 'GR':
        totalArea = measurements
          .filter(m => m.category === 'glass_windows')
          .reduce((sum, m) => sum + m.total, 0);
        break;
        
      case 'PWF':
      case 'PWP':
      case 'PC':
        totalArea = measurements
          .filter(m => m.category === 'flat_surface')
          .reduce((sum, m) => sum + m.total, 0);
        break;
        
      case 'HFS':
        totalArea = measurements
          .filter(m => m.category === 'interior_floor')
          .reduce((sum, m) => sum + m.total, 0);
        break;
        
      case 'IW':
        totalArea = measurements
          .filter(m => m.category === 'interior_wall')
          .reduce((sum, m) => sum + m.total, 0);
        break;
        
      case 'DC':
        totalArea = measurements
          .filter(m => m.category === 'deck_surface')
          .reduce((sum, m) => sum + m.total, 0);
        break;
    }
    
    // Apply dilution ratio if applicable
    let effectiveCoverage = material.coverage;
    if (material.dilutionRatio) {
      effectiveCoverage = material.coverage * material.dilutionRatio;
    }
    
    return totalArea / effectiveCoverage;
  }
  
  /**
   * Get fixed quantity for non-coverage materials
   */
  private getFixedQuantity(material: Material, service: string): number {
    // Base quantities for consumables and safety items
    const fixedQuantities: Record<string, Record<string, number>> = {
      'caution-tape': { 'default': 1 },
      'drop-cloths': { 'GR': 2, 'IW': 1, 'HFS': 1 },
      'plastic-sheeting': { 'BWP': 1, 'BWS': 1, 'GR': 1, 'DC': 1 },
      'squeegee-rubber': { 'WC': 1 },
      'scrubber-sleeves': { 'WC': 1 },
      'polishing-pads': { 'GR': 1 },
      'scrubber-pads': { 'HFS': 1 },
      'rags-cotton': { 'default': 1 },
      'paper-towels': { 'default': 1 },
      'gum-remover': { 'PC': 2 }
    };
    
    const materialQuantities = fixedQuantities[material.id];
    if (!materialQuantities) return 1;
    
    return materialQuantities[service] || materialQuantities['default'] || 1;
  }
  
  /**
   * Calculate waste percentage based on material type and service
   */
  private getWastePercentage(material: Material, service: string): number {
    const wasteByCategory: Record<string, number> = {
      'chemical': 10, // 10% waste for chemicals
      'sealant': 5,   // 5% waste for sealants
      'restoration': 15, // 15% waste for restoration materials
      'safety': 0,    // No waste for safety items
      'consumable': 20 // 20% waste for consumables
    };
    
    return wasteByCategory[material.category] || 10;
  }
  
  /**
   * Calculate actual coverage for a material/service combination
   */
  private calculateCoverage(
    material: Material,
    service: string,
    measurements: MeasurementEntry[]
  ): number {
    if (!material.coverage) return 0;
    
    let effectiveCoverage = material.coverage;
    if (material.dilutionRatio) {
      effectiveCoverage = material.coverage * material.dilutionRatio;
    }
    
    return effectiveCoverage;
  }
  
  /**
   * Generate contextual notes for material usage
   */
  private generateMaterialNotes(
    material: Material,
    service: string,
    quantity: number
  ): string {
    const notes: string[] = [];
    
    if (material.dilutionRatio) {
      notes.push(`Dilute 1:${material.dilutionRatio} with water`);
    }
    
    if (material.hazardous) {
      notes.push('Hazardous material - proper safety equipment required');
    }
    
    if (material.shelfLife && material.shelfLife < 24) {
      notes.push(`${material.shelfLife} month shelf life - order fresh`);
    }
    
    if (quantity > 10 && material.category === 'chemical') {
      notes.push('Large quantity - consider bulk pricing');
    }
    
    const bestVendor = this.selectBestVendor(material, quantity);
    if (bestVendor?.minOrder && quantity < bestVendor.minOrder) {
      notes.push(`Minimum order: ${bestVendor.minOrder} ${material.unit}s`);
    }
    
    return notes.join('; ');
  }
  
  /**
   * Consolidate duplicate materials across services
   */
  private consolidateMaterials(requirements: MaterialRequirement[]): MaterialRequirement[] {
    const consolidated = new Map<string, MaterialRequirement>();
    
    requirements.forEach(req => {
      const existing = consolidated.get(req.material.id);
      if (existing) {
        // Combine quantities and costs
        existing.quantity += req.quantity;
        existing.adjustedQuantity += req.adjustedQuantity;
        existing.totalCost += req.totalCost;
        existing.service += `, ${req.service}`;
      } else {
        consolidated.set(req.material.id, { ...req });
      }
    });
    
    return Array.from(consolidated.values());
  }
  
  /**
   * Select best vendor based on quantity and pricing
   */
  private selectBestVendor(material: Material, quantity: number): VendorPricing | undefined {
    const availableVendors = material.vendors.filter(v => v.available);
    if (availableVendors.length === 0) return undefined;
    
    // Calculate effective cost including bulk discounts
    const vendorCosts = availableVendors.map(vendor => {
      let effectiveCost = vendor.unitCost;
      
      if (vendor.bulkDiscounts) {
        for (const discount of vendor.bulkDiscounts) {
          if (quantity >= discount.quantity) {
            effectiveCost = vendor.unitCost * (1 - discount.discount / 100);
          }
        }
      }
      
      return { vendor, effectiveCost };
    });
    
    vendorCosts.sort((a, b) => a.effectiveCost - b.effectiveCost);
    return vendorCosts[0]?.vendor;
  }
  
  /**
   * Get material by ID
   */
  getMaterialById(id: string): Material | undefined {
    return MATERIALS_DATABASE.find(m => m.id === id);
  }
  
  /**
   * Search materials by criteria
   */
  searchMaterials(criteria: {
    category?: string;
    service?: string;
    maxCost?: number;
    hazardous?: boolean;
  }): Material[] {
    return MATERIALS_DATABASE.filter(material => {
      if (criteria.category && material.category !== criteria.category) return false;
      if (criteria.service && !material.requiredFor.includes(criteria.service)) return false;
      if (criteria.maxCost && material.unitCost > criteria.maxCost) return false;
      if (criteria.hazardous !== undefined && material.hazardous !== criteria.hazardous) return false;
      return true;
    });
  }
  
  /**
   * Calculate total material costs with markup
   */
  calculateTotalMaterialCosts(requirements: MaterialRequirement[]): {
    subtotal: number;
    markup: number;
    total: number;
    breakdown: Record<string, number>;
  } {
    const subtotal = requirements.reduce((sum, req) => sum + req.totalCost, 0);
    const markup = subtotal * 0.20; // 20% markup for materials
    const total = subtotal + markup;
    
    const breakdown = requirements.reduce((acc, req) => {
      acc[req.material.category] = (acc[req.material.category] || 0) + req.totalCost;
      return acc;
    }, {} as Record<string, number>);
    
    return { subtotal, markup, total, breakdown };
  }
}