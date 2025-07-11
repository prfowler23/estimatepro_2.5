import { BaseCalculator, CalculationInput, CalculationResult } from '../base-calculator'
import { 
  OTHER_RATES,
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

interface SoftWashingInput extends CalculationInput {
  facadeArea: number
  surfaceMaterial: 'vinyl' | 'stucco' | 'wood' | 'composite' | 'mixed'
  contaminationLevel: 'light' | 'moderate' | 'heavy'
  buildingHeightStories?: number
  numberOfDrops?: number
  includesRoof: boolean
  roofArea?: number
}

export class SoftWashingCalculator extends BaseCalculator<SoftWashingInput> {
  calculate(input: SoftWashingInput): CalculationResult {
    // Clear previous calculation state
    this.clearCalculationState()

    const { 
      facadeArea,
      surfaceMaterial,
      contaminationLevel,
      buildingHeightStories = 1,
      numberOfDrops = 1,
      includesRoof,
      roofArea = 0,
      location
    } = input

    // Get crew and shift settings
    const crewSize = this.getCrewSize(input)
    const shiftLength = this.getShiftLengthFromInput(input)

    // Validate inputs
    this.validateInput(input)
    
    if (facadeArea <= 0) {
      throw new Error('Facade area must be greater than 0')
    }

    if (includesRoof && roofArea <= 0) {
      throw new Error('Roof area must be greater than 0 when roof cleaning is included')
    }

    // Validate building measurements
    const measurementWarnings = validateBuildingMeasurements({
      facadeArea,
      heightStories: buildingHeightStories
    })
    measurementWarnings.forEach(warning => this.addWarning(warning))

    // Calculate facade price
    const facadeRate = this.getFacadeRate(surfaceMaterial, contaminationLevel)
    const facadePrice = facadeArea * facadeRate
    
    this.addBreakdown(
      'Facade Rate',
      `${surfaceMaterial} (${contaminationLevel} contamination)`,
      `$${facadeRate.toFixed(2)}/sq ft`
    )
    
    this.addBreakdown(
      'Facade Price',
      `${facadeArea} sq ft × $${facadeRate.toFixed(2)}`,
      this.formatCurrency(facadePrice)
    )

    // Calculate roof price if included
    let roofPrice = 0
    if (includesRoof && roofArea > 0) {
      const roofRate = this.getRoofRate(contaminationLevel)
      roofPrice = roofArea * roofRate
      
      this.addBreakdown(
        'Roof Rate',
        `${contaminationLevel} contamination`,
        `$${roofRate.toFixed(2)}/sq ft`
      )
      
      this.addBreakdown(
        'Roof Price',
        `${roofArea} sq ft × $${roofRate.toFixed(2)}`,
        this.formatCurrency(roofPrice)
      )
    }

    // Total base price
    const basePrice = facadePrice + roofPrice
    this.addBreakdown(
      'Total Base Price',
      includesRoof ? 'Facade + Roof' : 'Facade only',
      this.formatCurrency(basePrice)
    )

    // Calculate labor hours
    const facadeLaborHours = this.calculateFacadeLaborHours(facadeArea, surfaceMaterial, contaminationLevel, crewSize)
    const roofLaborHours = includesRoof ? this.calculateRoofLaborHours(roofArea, contaminationLevel, crewSize) : 0
    
    const laborHours = facadeLaborHours + roofLaborHours
    
    this.addBreakdown(
      'Labor Hours',
      includesRoof ? `Facade: ${facadeLaborHours.toFixed(1)}h, Roof: ${roofLaborHours.toFixed(1)}h` : `Facade: ${facadeLaborHours.toFixed(1)}h`,
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
      const equipmentType = getEquipmentForHeight(buildingHeightStories, 'SW')
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
    const finalPrice = this.calculateMinimumCharge('SW', roundedPrice)

    // Validations
    this.validateSetupTime(setupHours, laborHours)
    
    if (buildingHeightStories) {
      this.validateBuildingHeight(buildingHeightStories)
    }

    // Service-specific warnings
    if (contaminationLevel === 'heavy' && finalPrice < 800) {
      this.addWarning('Heavy contamination price seems low - verify measurements and scope')
    }

    if (surfaceMaterial === 'wood' && contaminationLevel === 'heavy') {
      this.addWarning('Heavy contamination on wood surfaces requires careful chemical selection')
    }

    if (includesRoof && buildingHeightStories > 3) {
      this.addWarning('Roof cleaning on tall buildings requires specialized safety equipment')
    }

    if (facadeArea > 15000) {
      this.addWarning('Large facade area - consider splitting into multiple phases')
    }

    if (projectDays > 5) {
      this.addWarning('Extended project duration - consider weather delays')
    }

    if (buildingHeightStories > 12) {
      this.addWarning('Very tall building - additional safety equipment may be required')
    }

    if (surfaceMaterial === 'stucco' && contaminationLevel === 'heavy') {
      this.addWarning('Heavy contamination on stucco may require multiple treatments')
    }

    if (includesRoof && roofArea > 8000) {
      this.addWarning('Large roof area - verify safe access and drainage considerations')
    }

    // Chemical safety warnings
    if (contaminationLevel === 'heavy' || surfaceMaterial === 'wood') {
      this.addWarning('Chemical selection critical - verify compatibility with surface material')
    }

    // Build and return result
    return this.buildCalculationResult(
      'Soft Washing',
      finalPrice,
      laborHours,
      setupHours,
      rigHours,
      crewSize,
      equipment
    )
  }

  private getFacadeRate(surfaceMaterial: string, contaminationLevel: string): number {
    const baseRate = OTHER_RATES.softWashing
    const materialMultipliers = {
      vinyl: 1.0,
      stucco: 1.2,
      wood: 1.3,
      composite: 1.1,
      mixed: 1.15
    }
    
    const contaminationMultipliers = {
      light: 1.0,
      moderate: 1.3,
      heavy: 1.6
    }
    
    const materialMultiplier = materialMultipliers[surfaceMaterial as keyof typeof materialMultipliers] || 1.0
    const contaminationMultiplier = contaminationMultipliers[contaminationLevel as keyof typeof contaminationMultipliers] || 1.0
    
    return baseRate * materialMultiplier * contaminationMultiplier
  }

  private getRoofRate(contaminationLevel: string): number {
    const baseRoofRate = 0.35 // Base roof rate
    const contaminationMultipliers = {
      light: 1.0,
      moderate: 1.4,
      heavy: 1.8
    }
    
    const contaminationMultiplier = contaminationMultipliers[contaminationLevel as keyof typeof contaminationMultipliers] || 1.0
    return baseRoofRate * contaminationMultiplier
  }

  private calculateFacadeLaborHours(area: number, surfaceMaterial: string, contaminationLevel: string, crewSize: number): number {
    const baseProductionRate = PRODUCTION_RATES.swFacade
    
    const materialEfficiency = {
      vinyl: 1.0,
      stucco: 0.8,
      wood: 0.7,
      composite: 0.9,
      mixed: 0.85
    }
    
    const contaminationEfficiency = {
      light: 1.0,
      moderate: 0.8,
      heavy: 0.6
    }
    
    const materialFactor = materialEfficiency[surfaceMaterial as keyof typeof materialEfficiency] || 1.0
    const contaminationFactor = contaminationEfficiency[contaminationLevel as keyof typeof contaminationEfficiency] || 1.0
    
    const adjustedProductionRate = baseProductionRate * materialFactor * contaminationFactor
    return area / (adjustedProductionRate * crewSize)
  }

  private calculateRoofLaborHours(area: number, contaminationLevel: string, crewSize: number): number {
    const baseRoofProductionRate = 800 // sq ft per hour per person
    
    const contaminationEfficiency = {
      light: 1.0,
      moderate: 0.8,
      heavy: 0.6
    }
    
    const contaminationFactor = contaminationEfficiency[contaminationLevel as keyof typeof contaminationEfficiency] || 1.0
    const adjustedProductionRate = baseRoofProductionRate * contaminationFactor
    
    return area / (adjustedProductionRate * crewSize)
  }

  // Helper method to calculate chemical requirements
  static calculateChemicalRequirements(
    facadeArea: number,
    roofArea: number,
    surfaceMaterial: string,
    contaminationLevel: string
  ): { 
    facadeChemicals: { detergent: number; bleach: number; neutralizer: number }; 
    roofChemicals: { detergent: number; bleach: number; neutralizer: number };
    totalCost: number 
  } {
    const chemicalRates = {
      detergent: { light: 0.005, moderate: 0.008, heavy: 0.012 }, // gallons per sq ft
      bleach: { light: 0.003, moderate: 0.006, heavy: 0.010 },
      neutralizer: { light: 0.002, moderate: 0.003, heavy: 0.005 }
    }
    
    const surfaceMultipliers = {
      vinyl: 1.0,
      stucco: 1.2,
      wood: 0.8, // Less bleach on wood
      composite: 1.0,
      mixed: 1.1
    }
    
    const multiplier = surfaceMultipliers[surfaceMaterial as keyof typeof surfaceMultipliers] || 1.0
    
    const facadeChemicals = {
      detergent: facadeArea * chemicalRates.detergent[contaminationLevel as keyof typeof chemicalRates.detergent] * multiplier,
      bleach: facadeArea * chemicalRates.bleach[contaminationLevel as keyof typeof chemicalRates.bleach] * multiplier,
      neutralizer: facadeArea * chemicalRates.neutralizer[contaminationLevel as keyof typeof chemicalRates.neutralizer] * multiplier
    }
    
    const roofChemicals = {
      detergent: roofArea * chemicalRates.detergent[contaminationLevel as keyof typeof chemicalRates.detergent] * 1.1,
      bleach: roofArea * chemicalRates.bleach[contaminationLevel as keyof typeof chemicalRates.bleach] * 1.1,
      neutralizer: roofArea * chemicalRates.neutralizer[contaminationLevel as keyof typeof chemicalRates.neutralizer] * 1.1
    }
    
    const costs = {
      detergent: 8.50, // per gallon
      bleach: 3.25,    // per gallon
      neutralizer: 12.00 // per gallon
    }
    
    const totalCost = 
      (facadeChemicals.detergent + roofChemicals.detergent) * costs.detergent +
      (facadeChemicals.bleach + roofChemicals.bleach) * costs.bleach +
      (facadeChemicals.neutralizer + roofChemicals.neutralizer) * costs.neutralizer
    
    return {
      facadeChemicals: {
        detergent: Math.ceil(facadeChemicals.detergent),
        bleach: Math.ceil(facadeChemicals.bleach),
        neutralizer: Math.ceil(facadeChemicals.neutralizer)
      },
      roofChemicals: {
        detergent: Math.ceil(roofChemicals.detergent),
        bleach: Math.ceil(roofChemicals.bleach),
        neutralizer: Math.ceil(roofChemicals.neutralizer)
      },
      totalCost
    }
  }

  // Helper method to validate environmental conditions
  static validateEnvironmentalConditions(
    temperature: number,
    humidity: number,
    windSpeed: number,
    precipitationChance: number
  ): string[] {
    const warnings: string[] = []
    
    if (temperature < 50 || temperature > 85) {
      warnings.push('Temperature outside optimal range (50-85°F) for soft washing')
    }
    
    if (humidity < 30) {
      warnings.push('Low humidity may cause chemicals to dry too quickly')
    }
    
    if (windSpeed > 12) {
      warnings.push('High wind speed may affect chemical application and safety')
    }
    
    if (precipitationChance > 25) {
      warnings.push('Precipitation risk - chemicals need time to work before rain')
    }
    
    return warnings
  }

  // Helper method to calculate dwell time requirements
  static calculateDwellTime(
    contaminationLevel: string,
    surfaceMaterial: string,
    temperature: number
  ): { dwellTime: number; rinseTime: number; totalTime: number } {
    const baseDwellTimes = {
      light: 5,     // minutes
      moderate: 10,
      heavy: 15
    }
    
    const materialAdjustments = {
      vinyl: 1.0,
      stucco: 1.2,
      wood: 0.8,
      composite: 1.0,
      mixed: 1.1
    }
    
    // Temperature affects dwell time
    const tempAdjustment = temperature > 80 ? 0.8 : temperature < 60 ? 1.2 : 1.0
    
    const dwellTime = baseDwellTimes[contaminationLevel as keyof typeof baseDwellTimes] * 
                     materialAdjustments[surfaceMaterial as keyof typeof materialAdjustments] * 
                     tempAdjustment
    
    const rinseTime = dwellTime * 0.3 // 30% of dwell time for rinsing
    
    return {
      dwellTime: Math.ceil(dwellTime),
      rinseTime: Math.ceil(rinseTime),
      totalTime: Math.ceil(dwellTime + rinseTime)
    }
  }

  // Helper method to assess contamination level
  static assessContaminationLevel(
    algaePresence: boolean,
    mildewPresence: boolean,
    stainSeverity: 'none' | 'light' | 'moderate' | 'heavy',
    lastCleaning: number // months ago
  ): { level: 'light' | 'moderate' | 'heavy'; factors: string[] } {
    const factors: string[] = []
    let level: 'light' | 'moderate' | 'heavy' = 'light'
    
    if (algaePresence) {
      factors.push('Algae growth present')
      level = 'moderate'
    }
    
    if (mildewPresence) {
      factors.push('Mildew/mold present')
      level = level === 'light' ? 'moderate' : 'heavy'
    }
    
    if (stainSeverity === 'heavy') {
      factors.push('Heavy staining')
      level = 'heavy'
    } else if (stainSeverity === 'moderate') {
      factors.push('Moderate staining')
      level = level === 'light' ? 'moderate' : level
    }
    
    if (lastCleaning > 24) {
      factors.push('No cleaning in 2+ years')
      level = level === 'light' ? 'moderate' : 'heavy'
    }
    
    return { level, factors }
  }

  // Helper method to calculate plant protection requirements
  static calculatePlantProtection(
    facadeArea: number,
    roofArea: number,
    landscapingDensity: 'none' | 'light' | 'moderate' | 'heavy'
  ): { protectionCost: number; rinseTime: number; recommendations: string[] } {
    const recommendations: string[] = []
    let protectionCost = 0
    let rinseTime = 0
    
    const totalArea = facadeArea + roofArea
    
    if (landscapingDensity === 'none') {
      return { protectionCost, rinseTime, recommendations }
    }
    
    const densityMultipliers = {
      light: 0.02,
      moderate: 0.04,
      heavy: 0.06
    }
    
    protectionCost = totalArea * densityMultipliers[landscapingDensity as keyof typeof densityMultipliers]
    rinseTime = totalArea / 500 // sq ft per minute rinsing rate
    
    recommendations.push('Pre-wet and post-rinse plants thoroughly')
    
    if (landscapingDensity === 'heavy') {
      recommendations.push('Consider using plant-safe chemicals')
      recommendations.push('May require multiple rinse cycles')
    }
    
    return { protectionCost, rinseTime, recommendations }
  }
}