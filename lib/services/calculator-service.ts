// Calculator service layer for all service calculations

import { 
  ServiceCalculationResult, 
  ServiceFormData, 
  ServiceType, 
  ServiceBreakdownItem,
  RiskFactor,
  MaterialItem
} from '@/lib/types/estimate-types';
import { safeNumber, safeString, withDefaultArray, isNotNull } from '@/lib/utils/null-safety';

export interface CalculationParams {
  serviceType: ServiceType;
  formData: ServiceFormData;
  buildingContext?: {
    stories: number;
    heightFeet?: number;
    buildingType?: string;
    accessDifficulty?: 'easy' | 'moderate' | 'difficult';
  };
  marketFactors?: {
    laborRate?: number;
    materialMarkup?: number;
    equipmentRates?: Record<string, number>;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class CalculatorService {
  // Base rates and factors
  private static readonly BASE_LABOR_RATE = 35; // per hour
  private static readonly BASE_MATERIAL_MARKUP = 1.3; // 30% markup
  private static readonly CREW_SIZES = {
    'window-cleaning': 2,
    'pressure-washing': 2,
    'soft-washing': 2,
    'biofilm-removal': 2,
    'glass-restoration': 1,
    'frame-restoration': 1,
    'high-dusting': 3,
    'final-clean': 4,
    'granite-reconditioning': 2,
    'pressure-wash-seal': 3,
    'parking-deck': 4
  };

  private static readonly PRODUCTION_RATES = {
    'window-cleaning': 150, // sqft per hour
    'pressure-washing': 800, // sqft per hour
    'soft-washing': 600, // sqft per hour
    'biofilm-removal': 200, // sqft per hour
    'glass-restoration': 50, // sqft per hour
    'frame-restoration': 30, // sqft per hour
    'high-dusting': 1200, // sqft per hour
    'final-clean': 2000, // sqft per hour
    'granite-reconditioning': 100, // sqft per hour
    'pressure-wash-seal': 400, // sqft per hour
    'parking-deck': 1500 // sqft per hour
  };

  // Main calculation method
  static calculateService(params: CalculationParams): ServiceCalculationResult {
    const { serviceType, formData, buildingContext, marketFactors } = params;
    
    // Validate inputs
    const validation = this.validateInputs(params);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Calculate base metrics
    const area = this.calculateArea(formData);
    const laborHours = this.calculateLaborHours(serviceType, area, formData, buildingContext);
    const materialCosts = this.calculateMaterialCosts(serviceType, area, formData, marketFactors);
    const equipmentCosts = this.calculateEquipmentCosts(serviceType, area, formData, buildingContext);
    const setupHours = this.calculateSetupHours(serviceType, buildingContext);
    const rigHours = this.calculateRigHours(serviceType, buildingContext);
    
    // Calculate totals
    const totalHours = laborHours + setupHours + rigHours;
    const crewSize = this.getCrewSize(serviceType, buildingContext);
    const laborCost = totalHours * crewSize * (marketFactors?.laborRate || this.BASE_LABOR_RATE);
    const basePrice = laborCost + materialCosts + equipmentCosts;

    // Generate breakdown
    const breakdown = this.generateBreakdown(
      serviceType,
      area,
      laborHours,
      crewSize,
      laborCost,
      materialCosts,
      equipmentCosts,
      marketFactors?.laborRate || this.BASE_LABOR_RATE
    );

    // Assess risks
    const riskFactors = this.assessRiskFactors(serviceType, formData, buildingContext);
    
    // Generate warnings
    const warnings = this.generateWarnings(serviceType, formData, buildingContext);

    // Get materials list
    const materials = this.getMaterialsList(serviceType, area, formData);

    // Equipment details
    const equipment = equipmentCosts > 0 ? {
      type: this.getEquipmentType(serviceType),
      days: this.getEquipmentDays(serviceType, totalHours),
      cost: equipmentCosts
    } : undefined;

    return {
      area,
      basePrice,
      laborHours,
      setupHours,
      rigHours,
      totalHours,
      crewSize,
      equipment,
      breakdown,
      warnings,
      materials,
      riskFactors
    };
  }

  // Batch calculation for multiple services
  static calculateMultipleServices(calculations: CalculationParams[]): ServiceCalculationResult[] {
    return calculations.map(params => this.calculateService(params));
  }

  // Validation methods
  static validateInputs(params: CalculationParams): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Service type validation
    if (!params.serviceType) {
      errors.push('Service type is required');
    }

    // Form data validation
    if (!params.formData) {
      errors.push('Form data is required');
    } else {
      const formValidation = this.validateFormData(params.serviceType, params.formData);
      errors.push(...formValidation.errors);
      warnings.push(...formValidation.warnings);
    }

    // Building context validation
    if (params.buildingContext) {
      if (safeNumber(params.buildingContext.stories) < 1) {
        errors.push('Building stories must be at least 1');
      }
      if (safeNumber(params.buildingContext.stories) > 50) {
        warnings.push('Extremely tall building may require specialized equipment');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static validateFormData(serviceType: ServiceType, formData: ServiceFormData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Common validations
    if (safeNumber(formData.area) <= 0) {
      errors.push('Area must be greater than 0');
    }
    
    if (safeNumber(formData.buildingHeight) <= 0) {
      warnings.push('Building height should be specified for accurate pricing');
    }

    // Service-specific validations
    switch (serviceType) {
      case 'window-cleaning':
        // No specific validations needed for window cleaning beyond base validations
        break;
      
      case 'pressure-washing':
        const pwFormData = formData as any; // Type assertion since we know this is pressure-washing
        if (pwFormData.surfaceType && !['concrete', 'brick', 'stone', 'wood', 'metal'].includes(pwFormData.surfaceType)) {
          warnings.push('Unusual surface type may require special considerations');
        }
        if (pwFormData.pressure && safeNumber(pwFormData.pressure) > 4000) {
          warnings.push('High pressure may damage some surfaces');
        }
        break;
      
      case 'glass-restoration':
        const grFormData = formData as any; // Type assertion since we know this is glass-restoration
        if (grFormData.damageLevel && !['light', 'moderate', 'heavy'].includes(grFormData.damageLevel)) {
          errors.push('Damage level must be specified');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Calculation methods
  private static calculateArea(formData: ServiceFormData): number {
    // Use the area directly from form data
    return safeNumber(formData.area);
  }

  private static calculateLaborHours(
    serviceType: ServiceType,
    area: number,
    formData: ServiceFormData,
    buildingContext?: CalculationParams['buildingContext']
  ): number {
    const productionRate = this.PRODUCTION_RATES[serviceType];
    let baseHours = area / productionRate;

    // Apply difficulty factors
    if (buildingContext?.accessDifficulty === 'moderate') {
      baseHours *= 1.3;
    } else if (buildingContext?.accessDifficulty === 'difficult') {
      baseHours *= 1.8;
    }

    // Apply height factors
    if (buildingContext?.stories && buildingContext.stories > 3) {
      baseHours *= 1 + (buildingContext.stories - 3) * 0.1;
    }

    // Service-specific adjustments
    switch (serviceType) {
      case 'window-cleaning':
        // Calculate based on area since windowCount is not available
        const windowArea = area / 20; // Assume 20 sq ft per window
        const windowFactor = windowArea / 50; // Base 50 windows
        baseHours *= Math.max(windowFactor, 0.5);
        break;
      
      case 'glass-restoration':
        const grFormData2 = formData as any; // Type assertion
        if (grFormData2.damageLevel === 'moderate') {
          baseHours *= 1.5;
        } else if (grFormData2.damageLevel === 'heavy') {
          baseHours *= 2.5;
        }
        break;
      
      case 'biofilm-removal':
        baseHours *= 1.8; // More intensive process
        break;
    }

    return Math.max(baseHours, 0.5); // Minimum 0.5 hours
  }

  private static calculateMaterialCosts(
    serviceType: ServiceType,
    area: number,
    formData: ServiceFormData,
    marketFactors?: CalculationParams['marketFactors']
  ): number {
    const markup = marketFactors?.materialMarkup || this.BASE_MATERIAL_MARKUP;
    let baseCost = 0;

    // Material costs per square foot
    const materialRates = {
      'window-cleaning': 0.15,
      'pressure-washing': 0.08,
      'soft-washing': 0.12,
      'biofilm-removal': 0.25,
      'glass-restoration': 2.50,
      'frame-restoration': 1.80,
      'high-dusting': 0.05,
      'final-clean': 0.10,
      'granite-reconditioning': 0.45,
      'pressure-wash-seal': 0.35,
      'parking-deck': 0.12
    };

    baseCost = area * materialRates[serviceType];

    // Service-specific adjustments
    switch (serviceType) {
      case 'pressure-washing':
        const pwFormData2 = formData as any; // Type assertion
        if (pwFormData2.requiresSealing) {
          baseCost += area * 0.20; // Sealer cost
        }
        break;
      
      case 'glass-restoration':
        const grFormData3 = formData as any; // Type assertion
        if (grFormData3.damageLevel === 'heavy') {
          baseCost *= 1.8; // More materials needed
        }
        break;
    }

    return baseCost * markup;
  }

  private static calculateEquipmentCosts(
    serviceType: ServiceType,
    area: number,
    formData: ServiceFormData,
    buildingContext?: CalculationParams['buildingContext']
  ): number {
    let cost = 0;

    // Equipment requirements by service
    switch (serviceType) {
      case 'pressure-washing':
      case 'soft-washing':
        cost += 150; // Pressure washer rental
        if (buildingContext?.stories && buildingContext.stories > 2) {
          cost += 200; // Lift or scaffolding
        }
        break;
      
      case 'high-dusting':
        cost += 300; // Specialized equipment
        break;
      
      case 'parking-deck':
        cost += 400; // Heavy-duty equipment
        break;
      
      case 'glass-restoration':
      case 'frame-restoration':
        cost += 100; // Specialized tools
        break;
    }

    // Height-based equipment costs
    if (buildingContext?.stories && buildingContext.stories > 5) {
      cost += 500; // Specialized access equipment
    }

    return cost;
  }

  private static calculateSetupHours(
    serviceType: ServiceType,
    buildingContext?: CalculationParams['buildingContext']
  ): number {
    let setupHours = 0.5; // Base setup time

    // Service-specific setup
    switch (serviceType) {
      case 'pressure-washing':
      case 'soft-washing':
        setupHours = 1.0;
        break;
      
      case 'high-dusting':
        setupHours = 1.5;
        break;
      
      case 'parking-deck':
        setupHours = 2.0;
        break;
    }

    // Height adjustment
    if (buildingContext?.stories && buildingContext.stories > 3) {
      setupHours *= 1.3;
    }

    return setupHours;
  }

  private static calculateRigHours(
    serviceType: ServiceType,
    buildingContext?: CalculationParams['buildingContext']
  ): number {
    let rigHours = 0.25; // Base rig time

    // Service-specific rig time
    switch (serviceType) {
      case 'pressure-washing':
      case 'soft-washing':
        rigHours = 0.5;
        break;
      
      case 'high-dusting':
        rigHours = 0.75;
        break;
      
      case 'parking-deck':
        rigHours = 1.0;
        break;
    }

    // Height adjustment
    if (buildingContext?.stories && buildingContext.stories > 3) {
      rigHours *= 1.2;
    }

    return rigHours;
  }

  private static getCrewSize(
    serviceType: ServiceType,
    buildingContext?: CalculationParams['buildingContext']
  ): number {
    let crewSize = this.CREW_SIZES[serviceType];

    // Adjust for building complexity
    if (buildingContext?.stories && buildingContext.stories > 10) {
      crewSize += 1;
    }

    return crewSize;
  }

  // Helper methods
  private static generateBreakdown(
    serviceType: ServiceType,
    area: number,
    laborHours: number,
    crewSize: number,
    laborCost: number,
    materialCosts: number,
    equipmentCosts: number,
    laborRate: number
  ): ServiceBreakdownItem[] {
    const breakdown: ServiceBreakdownItem[] = [];

    // Labor breakdown
    breakdown.push({
      category: 'labor',
      description: `${laborHours.toFixed(1)} hours × ${crewSize} crew × $${laborRate}/hour`,
      quantity: laborHours * crewSize,
      unitPrice: laborRate,
      total: laborCost
    });

    // Materials breakdown
    if (materialCosts > 0) {
      breakdown.push({
        category: 'materials',
        description: `Materials for ${area.toFixed(0)} sq ft`,
        quantity: area,
        unitPrice: materialCosts / area,
        total: materialCosts
      });
    }

    // Equipment breakdown
    if (equipmentCosts > 0) {
      breakdown.push({
        category: 'equipment',
        description: 'Equipment rental and setup',
        quantity: 1,
        unitPrice: equipmentCosts,
        total: equipmentCosts
      });
    }

    return breakdown;
  }

  private static assessRiskFactors(
    serviceType: ServiceType,
    formData: ServiceFormData,
    buildingContext?: CalculationParams['buildingContext']
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];

    // Height risks
    if (buildingContext?.stories && buildingContext.stories > 5) {
      risks.push({
        type: 'height',
        description: 'High-rise work requires specialized safety equipment',
        level: buildingContext.stories > 15 ? 'high' : 'medium',
        multiplier: buildingContext.stories > 15 ? 1.25 : 1.15
      });
    }

    // Access risks
    if (buildingContext?.accessDifficulty === 'difficult') {
      risks.push({
        factor: 'Access',
        description: 'Difficult access may require additional time and equipment',
        severity: 'medium',
        impact: 'Schedule and cost'
      });
    }

    // Service-specific risks
    switch (serviceType) {
      case 'glass-restoration':
        if (formData.damageLevel === 'heavy') {
          risks.push({
            factor: 'Glass Damage',
            description: 'Extensive damage may require replacement rather than restoration',
            severity: 'high',
            impact: 'Scope and cost'
          });
        }
        break;
      
      case 'pressure-washing':
        if (formData.pressure && safeNumber(formData.pressure) > 3000) {
          risks.push({
            factor: 'High Pressure',
            description: 'High pressure may damage building surfaces',
            severity: 'medium',
            impact: 'Quality and liability'
          });
        }
        break;
    }

    return risks;
  }

  private static generateWarnings(
    serviceType: ServiceType,
    formData: ServiceFormData,
    buildingContext?: CalculationParams['buildingContext']
  ): string[] {
    const warnings: string[] = [];

    // Common warnings
    if (buildingContext?.stories && buildingContext.stories > 20) {
      warnings.push('High-rise building may require special permits');
    }

    // Service-specific warnings
    switch (serviceType) {
      case 'window-cleaning':
        if (buildingContext?.stories && buildingContext.stories > 10) {
          warnings.push('High-rise window cleaning requires certified technicians');
        }
        break;
      
      case 'biofilm-removal':
        warnings.push('Biofilm removal requires specialized chemicals and handling');
        break;
      
      case 'glass-restoration':
        warnings.push('Results may vary based on glass condition and type');
        break;
    }

    return warnings;
  }

  private static getMaterialsList(
    serviceType: ServiceType,
    area: number,
    formData: ServiceFormData
  ): MaterialItem[] {
    const materials: MaterialItem[] = [];

    // Service-specific materials
    switch (serviceType) {
      case 'window-cleaning':
        materials.push(
          { name: 'Window cleaning solution', quantity: Math.ceil(area / 1000), unit: 'gallon' },
          { name: 'Squeegees', quantity: 2, unit: 'each' },
          { name: 'Cleaning cloths', quantity: 10, unit: 'each' }
        );
        break;
      
      case 'pressure-washing':
        materials.push(
          { name: 'Pressure washing detergent', quantity: Math.ceil(area / 500), unit: 'gallon' },
          { name: 'Surface cleaner', quantity: 1, unit: 'each' }
        );
        if (formData.requiresSealing) {
          materials.push(
            { name: 'Surface sealer', quantity: Math.ceil(area / 400), unit: 'gallon' }
          );
        }
        break;
      
      case 'glass-restoration':
        materials.push(
          { name: 'Glass polish compound', quantity: Math.ceil(area / 100), unit: 'bottle' },
          { name: 'Polishing pads', quantity: 5, unit: 'each' },
          { name: 'Protective film', quantity: Math.ceil(area / 50), unit: 'roll' }
        );
        break;
    }

    return materials;
  }

  private static getEquipmentType(serviceType: ServiceType): string {
    const equipmentTypes = {
      'window-cleaning': 'cleaning',
      'pressure-washing': 'pressure',
      'soft-washing': 'pressure',
      'biofilm-removal': 'specialized',
      'glass-restoration': 'restoration',
      'frame-restoration': 'restoration',
      'high-dusting': 'access',
      'final-clean': 'cleaning',
      'granite-reconditioning': 'specialized',
      'pressure-wash-seal': 'pressure',
      'parking-deck': 'heavy-duty'
    };

    return equipmentTypes[serviceType];
  }

  private static getEquipmentDays(serviceType: ServiceType, totalHours: number): number {
    // Most equipment is rented by the day
    const hoursPerDay = 8;
    return Math.ceil(totalHours / hoursPerDay);
  }

  // Utility methods
  static getServiceDisplayName(serviceType: ServiceType): string {
    const displayNames: Record<ServiceType, string> = {
      'window-cleaning': 'Window Cleaning',
      'pressure-washing': 'Pressure Washing',
      'soft-washing': 'Soft Washing',
      'biofilm-removal': 'Biofilm Removal',
      'glass-restoration': 'Glass Restoration',
      'frame-restoration': 'Frame Restoration',
      'high-dusting': 'High Dusting',
      'final-clean': 'Final Clean',
      'granite-reconditioning': 'Granite Reconditioning',
      'pressure-wash-seal': 'Pressure Wash & Seal',
      'parking-deck': 'Parking Deck Cleaning'
    };

    return displayNames[serviceType] || serviceType;
  }

  static getServiceDescription(serviceType: ServiceType): string {
    const descriptions: Record<ServiceType, string> = {
      'window-cleaning': 'Professional interior and exterior window cleaning',
      'pressure-washing': 'High-pressure cleaning for building exteriors',
      'soft-washing': 'Low-pressure cleaning with specialized detergents',
      'biofilm-removal': 'Specialized removal of biofilm and organic buildup',
      'glass-restoration': 'Restoration of damaged or etched glass surfaces',
      'frame-restoration': 'Cleaning and restoration of window frames',
      'high-dusting': 'Cleaning of high and hard-to-reach areas',
      'final-clean': 'Comprehensive post-construction cleaning',
      'granite-reconditioning': 'Restoration and sealing of granite surfaces',
      'pressure-wash-seal': 'Pressure washing followed by protective sealing',
      'parking-deck': 'Heavy-duty cleaning of parking structures'
    };

    return descriptions[serviceType] || 'Professional cleaning service';
  }
}

export default CalculatorService;