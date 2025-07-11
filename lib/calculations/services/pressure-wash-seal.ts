import { BaseCalculator, CalculationInput, CalculationResult } from '../base-calculator'
import { 
  PWS_RATES,
  PRODUCTION_RATES,
  EQUIPMENT_TYPES,
  RIG_TIME
} from '../constants'
import { 
  getEquipmentForHeight,
  calculateEquipmentCost,
  roundToNearest,
  validateBuildingMeasurements
} from '../utils'

interface PressureWashSealInput extends CalculationInput {
  area: number
  surfaceMaterial: 'brick' | 'concrete' | 'mixed'
  sealerType: 'standard' | 'premium'
  numberOfCoats: number
  buildingHeightStories?: number
  numberOfDrops?: number
}

export class PressureWashSealCalculator extends BaseCalculator<PressureWashSealInput> {
  calculate(input: PressureWashSealInput): CalculationResult {
    // Clear previous calculation state
    this.clearCalculationState()

    const { 
      area, 
      surfaceMaterial,
      sealerType,
      numberOfCoats,
      buildingHeightStories = 1,
      numberOfDrops = 1,
      location
    } = input

    // Get crew and shift settings
    const crewSize = this.getCrewSize(input)
    const shiftLength = this.getShiftLengthFromInput(input)

    // Validate inputs
    this.validateInput(input)
    
    if (area <= 0) {
      throw new Error('Area must be greater than 0')
    }

    if (numberOfCoats < 1) {
      throw new Error('Number of coats must be at least 1')
    }

    // Validate building measurements
    const measurementWarnings = validateBuildingMeasurements({
      facadeArea: area,
      heightStories: buildingHeightStories
    })
    measurementWarnings.forEach(warning => this.addWarning(warning))

    // Get base rate
    const baseRate = PWS_RATES[sealerType === 'premium' ? 'premiumSealer' : 'standardSealer']
    this.addBreakdown(
      'Base Rate',
      `${sealerType} sealer`,
      `$${baseRate}/sq ft`
    )

    // Apply coat multiplier
    const rateWithCoats = baseRate * (1 + (numberOfCoats - 1) * 0.3)
    if (numberOfCoats > 1) {
      this.addBreakdown(
        'Multi-coat Adjustment',
        `${numberOfCoats} coats × 30% increase per additional coat`,
        `$${rateWithCoats.toFixed(2)}/sq ft`
      )
    }

    // Calculate base price
    const basePrice = area * rateWithCoats
    this.addBreakdown(
      'Base Price',
      `${area} sq ft × $${rateWithCoats.toFixed(2)}`,
      this.formatCurrency(basePrice)
    )

    // Calculate labor hours based on surface material
    const productionRate = this.getProductionRate(surfaceMaterial)
    const laborHours = area / (productionRate * crewSize)
    
    this.addBreakdown(
      'Labor Hours',
      `${area} sq ft ÷ (${productionRate} sq ft/hr × ${crewSize} crew) + coating time`,
      `${laborHours.toFixed(2)} hours`
    )

    // Setup time
    const setupHours = this.calculateSetupTime(laborHours)
    this.addBreakdown(
      'Setup Time',
      `${laborHours.toFixed(2)} hours × 25%`,
      `${setupHours.toFixed(2)} hours`
    )

    // Rig time (if building > 1 story)
    let rigHours = 0
    if (buildingHeightStories > 1) {
      rigHours = numberOfDrops * RIG_TIME.boomLift
      this.addBreakdown(
        'Rig Time',
        `${numberOfDrops} drops × ${RIG_TIME.boomLift} hours`,
        `${rigHours.toFixed(2)} hours`
      )
    }

    // Total hours
    const totalHours = laborHours + setupHours + rigHours
    this.addBreakdown(
      'Total Hours',
      'Labor + Setup + Rig',
      `${totalHours.toFixed(2)} hours`
    )

    // Project days
    const projectDays = this.calculateProjectDays(totalHours, crewSize, shiftLength)

    // Equipment if needed
    let equipment = undefined
    if (buildingHeightStories > 1) {
      const equipmentType = getEquipmentForHeight(buildingHeightStories, 'PWS')
      const equipmentCost = calculateEquipmentCost(equipmentType, projectDays)
      equipment = {
        type: equipmentType,
        days: projectDays,
        cost: equipmentCost,
      }
      this.addBreakdown(
        'Equipment Cost',
        `${equipmentType} for ${projectDays} days`,
        this.formatCurrency(equipmentCost)
      )
    }

    // Round final price
    const roundedPrice = roundToNearest(basePrice)
    if (roundedPrice !== basePrice) {
      this.addBreakdown(
        'Final Price (Rounded)',
        'Rounded to nearest $50',
        this.formatCurrency(roundedPrice)
      )
    }

    // Apply minimum charge
    const finalPrice = this.calculateMinimumCharge('PWS', roundedPrice)

    // Validations
    this.validateSetupTime(setupHours, laborHours)
    
    if (buildingHeightStories) {
      this.validateBuildingHeight(buildingHeightStories)
    }

    // Service-specific warnings
    if (sealerType === 'premium' && finalPrice < 800) {
      this.addWarning('Premium sealer price seems low - verify measurements')
    }

    if (numberOfCoats > 2) {
      this.addWarning(`${numberOfCoats} coats may require extended cure time between applications`)
    }

    if (surfaceMaterial === 'mixed' && area > 3000) {
      this.addWarning('Mixed surface type on large area - consider separate pricing for brick vs concrete sections')
    }

    if (area > 10000) {
      this.addWarning('Large area - consider splitting into multiple phases')
    }

    if (projectDays > 7) {
      this.addWarning('Extended project duration - consider weather delays and cure time')
    }

    if (buildingHeightStories > 12) {
      this.addWarning('Very tall building - additional safety equipment may be required')
    }

    // Material coverage warnings
    if (surfaceMaterial === 'concrete' && numberOfCoats === 1) {
      this.addWarning('Concrete surfaces may benefit from additional coats for optimal protection')
    }

    // Build and return result
    return this.buildCalculationResult(
      'Pressure Wash & Seal',
      finalPrice,
      laborHours,
      setupHours,
      rigHours,
      crewSize,
      equipment
    )
  }

  private getProductionRate(surfaceMaterial: string): number {
    switch (surfaceMaterial) {
      case 'brick':
        return PRODUCTION_RATES.pwsBrick
      case 'concrete':
        return PRODUCTION_RATES.pwsConcrete
      case 'mixed':
        return (PRODUCTION_RATES.pwsBrick + PRODUCTION_RATES.pwsConcrete) / 2
      default:
        return PRODUCTION_RATES.pwsBrick
    }
  }

  // Helper method to calculate sealer coverage
  static calculateSealerCoverage(
    area: number,
    sealerType: string,
    numberOfCoats: number,
    surfaceMaterial: string
  ): { gallons: number; cost: number } {
    const coverageRates = {
      standard: { brick: 150, concrete: 120 },
      premium: { brick: 180, concrete: 140 }
    }
    
    const coverage = coverageRates[sealerType as keyof typeof coverageRates][surfaceMaterial as keyof typeof coverageRates.standard]
    const gallonsNeeded = (area * numberOfCoats) / coverage
    
    const gallonCost = sealerType === 'premium' ? 45 : 35
    
    return {
      gallons: Math.ceil(gallonsNeeded),
      cost: Math.ceil(gallonsNeeded) * gallonCost
    }
  }

  // Helper method to estimate drying time
  static calculateDryingTime(
    area: number,
    numberOfCoats: number,
    temperature: number,
    humidity: number
  ): { hoursPerCoat: number; totalHours: number } {
    let baseHours = 4 // standard drying time
    
    if (temperature < 50) baseHours += 2
    if (humidity > 70) baseHours += 1
    
    const hoursPerCoat = baseHours
    const totalHours = hoursPerCoat * numberOfCoats
    
    return { hoursPerCoat, totalHours }
  }

  // Helper method to validate weather conditions
  static validateWeatherConditions(
    temperature: number,
    humidity: number,
    windSpeed: number,
    precipitationChance: number
  ): string[] {
    const warnings: string[] = []
    
    if (temperature < 45 || temperature > 85) {
      warnings.push('Temperature outside optimal range (45-85°F) for sealer application')
    }
    
    if (humidity > 80) {
      warnings.push('High humidity may extend drying time')
    }
    
    if (windSpeed > 10) {
      warnings.push('High wind speed may affect sealer application quality')
    }
    
    if (precipitationChance > 20) {
      warnings.push('Precipitation risk - sealer requires 4-6 hours dry time')
    }
    
    return warnings
  }

  // Helper method to calculate equipment efficiency
  static calculateEquipmentEfficiency(
    area: number,
    buildingHeight: number,
    accessMethod: string
  ): { efficiency: number; recommendation: string } {
    if (accessMethod === 'Ground' && buildingHeight <= 2) {
      return {
        efficiency: 1.2, // 20% efficiency gain
        recommendation: 'Ground-level work - optimal efficiency'
      }
    }
    
    if (accessMethod === 'Boom Lift' && buildingHeight <= 8) {
      return {
        efficiency: 1.0,
        recommendation: 'Standard boom lift efficiency'
      }
    }
    
    if (accessMethod === 'RDS' && buildingHeight > 8) {
      return {
        efficiency: 0.85, // 15% efficiency loss
        recommendation: 'High-rise work - reduced efficiency but necessary'
      }
    }
    
    return {
      efficiency: 1.0,
      recommendation: 'Standard efficiency expected'
    }
  }

  // Helper method to calculate material waste
  static calculateMaterialWaste(
    area: number,
    surfaceMaterial: string,
    applicationMethod: string
  ): { wastePercentage: number; additionalGallons: number } {
    let wastePercentage = 0.1 // 10% base waste
    
    if (surfaceMaterial === 'concrete') {
      wastePercentage += 0.05 // More porous, more waste
    }
    
    if (applicationMethod === 'spray') {
      wastePercentage += 0.05 // Spray application has more waste
    }
    
    const additionalGallons = (area / 150) * wastePercentage
    
    return { wastePercentage, additionalGallons }
  }
}