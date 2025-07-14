export interface VendorPricing {
  vendorId: string;
  dailyRate: number;
  weeklyRate?: number;
  monthlyRate?: number;
  available: boolean;
  leadTime?: number; // days
  deliveryCharge?: number;
  minRentalPeriod?: number; // days
}

export interface Equipment {
  id: string;
  name: string;
  category: 'lift' | 'cleaning' | 'safety' | 'power' | 'transport' | 'specialized';
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  requiredFor: string[]; // Service IDs
  heightRequirement?: number; // Minimum building height in stories
  specifications: {
    reach?: number;
    capacity?: number;
    powerRequirement?: string;
    dimensions?: string;
    weight?: number;
  };
  vendors: VendorPricing[];
  description?: string;
  alternatives?: string[]; // Alternative equipment IDs
}

export interface EquipmentSelection {
  equipment: Equipment;
  quantity: number;
  rentalPeriod: 'daily' | 'weekly' | 'monthly';
  rate: number;
  days: number;
  totalCost: number;
  vendor?: string;
  notes?: string;
}

export const EQUIPMENT_DATABASE: Equipment[] = [
  {
    id: 'boom-lift-40',
    name: '40ft Boom Lift',
    category: 'lift',
    dailyRate: 325,
    weeklyRate: 1300,
    monthlyRate: 3900,
    requiredFor: ['WC', 'GR', 'BWP', 'BWS'],
    heightRequirement: 3,
    specifications: {
      reach: 40,
      capacity: 500,
      powerRequirement: 'Electric/Diesel'
    },
    vendors: [
      { vendorId: 'sunbelt', dailyRate: 325, weeklyRate: 1300, monthlyRate: 3900, available: true, leadTime: 1 },
      { vendorId: 'united', dailyRate: 340, weeklyRate: 1360, monthlyRate: 4080, available: true, leadTime: 2 },
      { vendorId: 'home-depot', dailyRate: 355, weeklyRate: 1420, monthlyRate: 4260, available: true, leadTime: 1 }
    ],
    description: 'Articulating boom lift for exterior work up to 40 feet',
    alternatives: ['boom-lift-45', 'scissor-lift-32']
  },
  {
    id: 'boom-lift-60',
    name: '60ft Boom Lift',
    category: 'lift',
    dailyRate: 450,
    weeklyRate: 1800,
    monthlyRate: 5400,
    requiredFor: ['WC', 'GR', 'BWP', 'BWS', 'HBW'],
    heightRequirement: 5,
    specifications: {
      reach: 60,
      capacity: 500,
      powerRequirement: 'Diesel'
    },
    vendors: [
      { vendorId: 'sunbelt', dailyRate: 450, weeklyRate: 1800, monthlyRate: 5400, available: true, leadTime: 2 },
      { vendorId: 'united', dailyRate: 475, weeklyRate: 1900, monthlyRate: 5700, available: false, leadTime: 3 },
      { vendorId: 'ahern', dailyRate: 435, weeklyRate: 1740, monthlyRate: 5220, available: true, leadTime: 1 }
    ],
    description: 'Heavy-duty articulating boom lift for high-rise work',
    alternatives: ['boom-lift-80', 'spider-lift-65']
  },
  {
    id: 'boom-lift-80',
    name: '80ft Boom Lift',
    category: 'lift',
    dailyRate: 625,
    weeklyRate: 2500,
    monthlyRate: 7500,
    requiredFor: ['HBW'],
    heightRequirement: 7,
    specifications: {
      reach: 80,
      capacity: 500,
      powerRequirement: 'Diesel'
    },
    vendors: [
      { vendorId: 'sunbelt', dailyRate: 625, weeklyRate: 2500, monthlyRate: 7500, available: true, leadTime: 3 },
      { vendorId: 'ahern', dailyRate: 595, weeklyRate: 2380, monthlyRate: 7140, available: true, leadTime: 2 }
    ],
    description: 'Ultra-high reach boom lift for tall buildings'
  },
  {
    id: 'scissor-lift-26',
    name: '26ft Scissor Lift',
    category: 'lift',
    dailyRate: 185,
    weeklyRate: 740,
    monthlyRate: 2220,
    requiredFor: ['HFS', 'PC'],
    heightRequirement: 1,
    specifications: {
      reach: 26,
      capacity: 800,
      powerRequirement: 'Electric'
    },
    vendors: [
      { vendorId: 'sunbelt', dailyRate: 185, weeklyRate: 740, monthlyRate: 2220, available: true, leadTime: 1 },
      { vendorId: 'united', dailyRate: 195, weeklyRate: 780, monthlyRate: 2340, available: true, leadTime: 1 },
      { vendorId: 'home-depot', dailyRate: 199, weeklyRate: 796, monthlyRate: 2388, available: true, leadTime: 0 }
    ],
    description: 'Indoor/outdoor scissor lift for medium height work',
    alternatives: ['scissor-lift-32', 'boom-lift-40']
  },
  {
    id: 'scissor-lift-32',
    name: '32ft Scissor Lift',
    category: 'lift',
    dailyRate: 215,
    weeklyRate: 860,
    monthlyRate: 2580,
    requiredFor: ['HFS', 'PC', 'IW'],
    heightRequirement: 2,
    specifications: {
      reach: 32,
      capacity: 800,
      powerRequirement: 'Electric'
    },
    vendors: [
      { vendorId: 'sunbelt', dailyRate: 215, weeklyRate: 860, monthlyRate: 2580, available: true, leadTime: 1 },
      { vendorId: 'united', dailyRate: 225, weeklyRate: 900, monthlyRate: 2700, available: true, leadTime: 2 }
    ],
    description: 'Extended reach scissor lift for higher indoor work'
  },
  {
    id: 'pressure-washer-3500',
    name: '3500 PSI Pressure Washer',
    category: 'cleaning',
    dailyRate: 95,
    weeklyRate: 380,
    monthlyRate: 1140,
    requiredFor: ['PWF', 'PWP', 'DC'],
    specifications: {
      capacity: 3500,
      powerRequirement: 'Gas',
      dimensions: '36x24x30 inches'
    },
    vendors: [
      { vendorId: 'home-depot', dailyRate: 95, weeklyRate: 380, monthlyRate: 1140, available: true, leadTime: 0 },
      { vendorId: 'lowes', dailyRate: 89, weeklyRate: 356, monthlyRate: 1068, available: true, leadTime: 0 },
      { vendorId: 'united', dailyRate: 105, weeklyRate: 420, monthlyRate: 1260, available: true, leadTime: 1 }
    ],
    description: 'Mid-range pressure washer for general cleaning'
  },
  {
    id: 'pressure-washer-4000',
    name: '4000 PSI Pressure Washer',
    category: 'cleaning',
    dailyRate: 125,
    weeklyRate: 500,
    monthlyRate: 1500,
    requiredFor: ['BWP', 'PWF', 'PWP', 'DC'],
    specifications: {
      capacity: 4000,
      powerRequirement: 'Gas',
      dimensions: '38x26x32 inches'
    },
    vendors: [
      { vendorId: 'sunbelt', dailyRate: 125, weeklyRate: 500, monthlyRate: 1500, available: true, leadTime: 1 },
      { vendorId: 'home-depot', dailyRate: 135, weeklyRate: 540, monthlyRate: 1620, available: true, leadTime: 0 },
      { vendorId: 'united', dailyRate: 115, weeklyRate: 460, monthlyRate: 1380, available: true, leadTime: 1 }
    ],
    description: 'High-pressure washer for heavy-duty cleaning',
    alternatives: ['pressure-washer-3500', 'pressure-washer-5000']
  },
  {
    id: 'pressure-washer-5000',
    name: '5000 PSI Pressure Washer',
    category: 'cleaning',
    dailyRate: 165,
    weeklyRate: 660,
    monthlyRate: 1980,
    requiredFor: ['BWP', 'HBW'],
    specifications: {
      capacity: 5000,
      powerRequirement: 'Gas',
      dimensions: '42x28x34 inches'
    },
    vendors: [
      { vendorId: 'sunbelt', dailyRate: 165, weeklyRate: 660, monthlyRate: 1980, available: true, leadTime: 2 },
      { vendorId: 'ahern', dailyRate: 155, weeklyRate: 620, monthlyRate: 1860, available: true, leadTime: 1 }
    ],
    description: 'Commercial-grade pressure washer for tough jobs'
  },
  {
    id: 'water-tank-300',
    name: '300 Gal Water Tank & Trailer',
    category: 'transport',
    dailyRate: 65,
    weeklyRate: 260,
    monthlyRate: 780,
    requiredFor: ['BWP', 'BWS', 'PWF', 'PWP'],
    specifications: {
      capacity: 300,
      dimensions: '6x4x3 feet trailer'
    },
    vendors: [
      { vendorId: 'sunbelt', dailyRate: 65, weeklyRate: 260, monthlyRate: 780, available: true, leadTime: 1 },
      { vendorId: 'united', dailyRate: 75, weeklyRate: 300, monthlyRate: 900, available: true, leadTime: 2 }
    ],
    description: 'Portable water supply for pressure washing'
  },
  {
    id: 'water-tank-500',
    name: '500 Gal Water Tank & Trailer',
    category: 'transport',
    dailyRate: 85,
    weeklyRate: 340,
    monthlyRate: 1020,
    requiredFor: ['BWP', 'BWS', 'HBW'],
    specifications: {
      capacity: 500,
      dimensions: '8x5x4 feet trailer'
    },
    vendors: [
      { vendorId: 'sunbelt', dailyRate: 85, weeklyRate: 340, monthlyRate: 1020, available: true, leadTime: 1 },
      { vendorId: 'united', dailyRate: 95, weeklyRate: 380, monthlyRate: 1140, available: true, leadTime: 2 },
      { vendorId: 'ahern', dailyRate: 80, weeklyRate: 320, monthlyRate: 960, available: true, leadTime: 1 }
    ],
    description: 'Large capacity water supply for extended jobs'
  },
  {
    id: 'safety-harness-kit',
    name: 'Safety Harness Kit (4 person)',
    category: 'safety',
    dailyRate: 40,
    weeklyRate: 160,
    monthlyRate: 480,
    requiredFor: ['WC', 'GR', 'BWP', 'BWS', 'HBW'],
    heightRequirement: 3,
    specifications: {
      capacity: 4,
      powerRequirement: 'None'
    },
    vendors: [
      { vendorId: 'safety-supply', dailyRate: 40, weeklyRate: 160, monthlyRate: 480, available: true, leadTime: 0 },
      { vendorId: 'sunbelt', dailyRate: 45, weeklyRate: 180, monthlyRate: 540, available: true, leadTime: 1 },
      { vendorId: 'united', dailyRate: 42, weeklyRate: 168, monthlyRate: 504, available: true, leadTime: 1 }
    ],
    description: 'Complete fall protection system for elevated work'
  },
  {
    id: 'rope-access-system',
    name: 'Rope Access System',
    category: 'safety',
    dailyRate: 275,
    weeklyRate: 1100,
    monthlyRate: 3300,
    requiredFor: ['HBW'],
    heightRequirement: 8,
    specifications: {
      reach: 300,
      capacity: 2,
      powerRequirement: 'None'
    },
    vendors: [
      { vendorId: 'rope-specialists', dailyRate: 275, weeklyRate: 1100, monthlyRate: 3300, available: true, leadTime: 3 },
      { vendorId: 'access-solutions', dailyRate: 295, weeklyRate: 1180, monthlyRate: 3540, available: true, leadTime: 5 }
    ],
    description: 'Professional rope access equipment for extreme heights'
  },
  {
    id: 'generator-10kw',
    name: '10kW Generator',
    category: 'power',
    dailyRate: 85,
    weeklyRate: 340,
    monthlyRate: 1020,
    requiredFor: ['HFS', 'PC'],
    specifications: {
      capacity: 10000,
      powerRequirement: 'Diesel',
      dimensions: '48x30x30 inches'
    },
    vendors: [
      { vendorId: 'sunbelt', dailyRate: 85, weeklyRate: 340, monthlyRate: 1020, available: true, leadTime: 1 },
      { vendorId: 'united', dailyRate: 95, weeklyRate: 380, monthlyRate: 1140, available: true, leadTime: 1 },
      { vendorId: 'home-depot', dailyRate: 105, weeklyRate: 420, monthlyRate: 1260, available: true, leadTime: 0 }
    ],
    description: 'Portable power for electric equipment'
  },
  {
    id: 'generator-20kw',
    name: '20kW Generator',
    category: 'power',
    dailyRate: 150,
    weeklyRate: 600,
    monthlyRate: 1800,
    requiredFor: ['HFS', 'IW'],
    specifications: {
      capacity: 20000,
      powerRequirement: 'Diesel',
      dimensions: '60x36x36 inches'
    },
    vendors: [
      { vendorId: 'sunbelt', dailyRate: 150, weeklyRate: 600, monthlyRate: 1800, available: true, leadTime: 2 },
      { vendorId: 'united', dailyRate: 165, weeklyRate: 660, monthlyRate: 1980, available: true, leadTime: 2 },
      { vendorId: 'ahern', dailyRate: 140, weeklyRate: 560, monthlyRate: 1680, available: true, leadTime: 1 }
    ],
    description: 'Heavy-duty power generation for large equipment'
  },
  {
    id: 'floor-scrubber-20',
    name: '20" Walk-Behind Floor Scrubber',
    category: 'cleaning',
    dailyRate: 95,
    weeklyRate: 380,
    monthlyRate: 1140,
    requiredFor: ['HFS'],
    specifications: {
      capacity: 20,
      powerRequirement: 'Electric',
      dimensions: '50x20x40 inches'
    },
    vendors: [
      { vendorId: 'clarke', dailyRate: 95, weeklyRate: 380, monthlyRate: 1140, available: true, leadTime: 1 },
      { vendorId: 'tennant', dailyRate: 105, weeklyRate: 420, monthlyRate: 1260, available: true, leadTime: 2 },
      { vendorId: 'sunbelt', dailyRate: 110, weeklyRate: 440, monthlyRate: 1320, available: true, leadTime: 1 }
    ],
    description: 'Professional floor cleaning equipment'
  },
  {
    id: 'water-fed-pole-40',
    name: '40ft Water Fed Pole System',
    category: 'cleaning',
    dailyRate: 45,
    weeklyRate: 180,
    monthlyRate: 540,
    requiredFor: ['WC'],
    specifications: {
      reach: 40,
      powerRequirement: 'None',
      dimensions: 'Telescopic'
    },
    vendors: [
      { vendorId: 'window-supply', dailyRate: 45, weeklyRate: 180, monthlyRate: 540, available: true, leadTime: 1 },
      { vendorId: 'cleaning-depot', dailyRate: 50, weeklyRate: 200, monthlyRate: 600, available: true, leadTime: 0 }
    ],
    description: 'Pure water window cleaning system'
  },
  {
    id: 'vacuum-truck',
    name: 'Vacuum Truck Service',
    category: 'specialized',
    dailyRate: 850,
    weeklyRate: 4250,
    monthlyRate: 17000,
    requiredFor: ['PWP', 'DC'],
    specifications: {
      capacity: 2000,
      powerRequirement: 'Diesel',
      dimensions: 'Commercial truck'
    },
    vendors: [
      { vendorId: 'vac-services', dailyRate: 850, weeklyRate: 4250, monthlyRate: 17000, available: true, leadTime: 5 },
      { vendorId: 'industrial-clean', dailyRate: 895, weeklyRate: 4475, monthlyRate: 17900, available: true, leadTime: 7 }
    ],
    description: 'Industrial vacuum truck for waste water recovery'
  }
];

export class EquipmentSelector {
  /**
   * Select required equipment based on services, duration, and building height
   */
  selectRequiredEquipment(
    services: string[],
    duration: number,
    buildingHeight: number
  ): EquipmentSelection[] {
    const selections: EquipmentSelection[] = [];
    
    // Filter equipment by service requirements and height
    const requiredEquipment = EQUIPMENT_DATABASE.filter(eq => 
      eq.requiredFor.some(service => services.includes(service)) &&
      (!eq.heightRequirement || buildingHeight >= eq.heightRequirement)
    );
    
    // Group by category to avoid duplicates, selecting best option per category
    const byCategory = new Map<string, Equipment>();
    
    requiredEquipment.forEach(eq => {
      const existing = byCategory.get(eq.category);
      if (!existing) {
        byCategory.set(eq.category, eq);
      } else {
        // For lift equipment, prefer higher reach if building is tall enough
        if (eq.category === 'lift' && eq.specifications.reach && existing.specifications.reach) {
          if (buildingHeight >= 5 && eq.specifications.reach > existing.specifications.reach) {
            byCategory.set(eq.category, eq);
          }
        }
        // For other categories, prefer lower cost
        else if (eq.dailyRate < existing.dailyRate) {
          byCategory.set(eq.category, eq);
        }
      }
    });
    
    // Calculate optimal rental period and costs
    byCategory.forEach(equipment => {
      const rentalDays = Math.ceil(duration * 1.1); // Add 10% buffer
      const { period, rate, totalCost } = this.calculateOptimalRental(equipment, rentalDays);
      const bestVendor = this.selectBestVendor(equipment);
      
      selections.push({
        equipment,
        quantity: 1,
        rentalPeriod: period,
        rate,
        days: rentalDays,
        totalCost,
        vendor: bestVendor?.vendorId,
        notes: this.generateEquipmentNotes(equipment, buildingHeight, services)
      });
    });
    
    return selections;
  }
  
  /**
   * Calculate the most cost-effective rental period
   */
  private calculateOptimalRental(
    equipment: Equipment,
    days: number
  ): { period: 'daily' | 'weekly' | 'monthly'; rate: number; totalCost: number } {
    const dailyCost = days * equipment.dailyRate;
    const weeks = Math.ceil(days / 7);
    const weeklyCost = weeks * equipment.weeklyRate;
    const months = Math.ceil(days / 30);
    const monthlyCost = months * equipment.monthlyRate;
    
    // Choose the most economical option
    if (monthlyCost <= weeklyCost && monthlyCost <= dailyCost && days >= 20) {
      return { period: 'monthly', rate: equipment.monthlyRate, totalCost: monthlyCost };
    } else if (weeklyCost <= dailyCost && days >= 5) {
      return { period: 'weekly', rate: equipment.weeklyRate, totalCost: weeklyCost };
    } else {
      return { period: 'daily', rate: equipment.dailyRate, totalCost: dailyCost };
    }
  }
  
  /**
   * Select the best vendor based on availability, price, and lead time
   */
  private selectBestVendor(equipment: Equipment): VendorPricing | undefined {
    const availableVendors = equipment.vendors.filter(v => v.available);
    
    if (availableVendors.length === 0) return undefined;
    
    // Score vendors: lower is better
    const scoredVendors = availableVendors.map(vendor => ({
      vendor,
      score: vendor.dailyRate + (vendor.leadTime || 0) * 10 // Penalize lead time
    }));
    
    scoredVendors.sort((a, b) => a.score - b.score);
    return scoredVendors[0]?.vendor;
  }
  
  /**
   * Generate contextual notes for equipment selection
   */
  private generateEquipmentNotes(
    equipment: Equipment,
    buildingHeight: number,
    services: string[]
  ): string {
    const notes: string[] = [];
    
    if (equipment.heightRequirement && buildingHeight >= equipment.heightRequirement) {
      notes.push(`Required for ${buildingHeight}-story building`);
    }
    
    if (equipment.category === 'lift' && buildingHeight >= 6) {
      notes.push('High-rise equipment - allow extra lead time');
    }
    
    if (equipment.specifications.powerRequirement === 'Diesel') {
      notes.push('Fuel costs additional');
    }
    
    if (services.includes('HBW') || services.includes('BWP')) {
      notes.push('Weather-dependent - may need coverage for delays');
    }
    
    const bestVendor = this.selectBestVendor(equipment);
    if (bestVendor?.leadTime && bestVendor.leadTime > 2) {
      notes.push(`${bestVendor.leadTime} day lead time required`);
    }
    
    return notes.join('; ');
  }
  
  /**
   * Get equipment by ID
   */
  getEquipmentById(id: string): Equipment | undefined {
    return EQUIPMENT_DATABASE.find(eq => eq.id === id);
  }
  
  /**
   * Get equipment alternatives
   */
  getEquipmentAlternatives(equipmentId: string): Equipment[] {
    const equipment = this.getEquipmentById(equipmentId);
    if (!equipment?.alternatives) return [];
    
    return equipment.alternatives
      .map(id => this.getEquipmentById(id))
      .filter((eq): eq is Equipment => eq !== undefined);
  }
  
  /**
   * Search equipment by category or service
   */
  searchEquipment(criteria: {
    category?: string;
    service?: string;
    maxDailyRate?: number;
    heightRequirement?: number;
  }): Equipment[] {
    return EQUIPMENT_DATABASE.filter(eq => {
      if (criteria.category && eq.category !== criteria.category) return false;
      if (criteria.service && !eq.requiredFor.includes(criteria.service)) return false;
      if (criteria.maxDailyRate && eq.dailyRate > criteria.maxDailyRate) return false;
      if (criteria.heightRequirement && eq.heightRequirement && eq.heightRequirement > criteria.heightRequirement) return false;
      return true;
    });
  }
  
  /**
   * Calculate total equipment cost for a project
   */
  calculateTotalEquipmentCost(selections: EquipmentSelection[]): {
    subtotal: number;
    markup: number;
    total: number;
    breakdown: Record<string, number>;
  } {
    const subtotal = selections.reduce((sum, selection) => sum + selection.totalCost, 0);
    const markup = subtotal * 0.15; // 15% markup
    const total = subtotal + markup;
    
    const breakdown = selections.reduce((acc, selection) => {
      acc[selection.equipment.category] = (acc[selection.equipment.category] || 0) + selection.totalCost;
      return acc;
    }, {} as Record<string, number>);
    
    return { subtotal, markup, total, breakdown };
  }
}