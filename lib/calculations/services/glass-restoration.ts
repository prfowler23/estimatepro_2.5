import { BaseCalculator, CalculationInput, CalculationResult } from '../base-calculator'
import { 
  SERVICE_RATES, 
  SURFACE, 
  TIME_PER_UNIT, 
  EQUIPMENT_TYPES,
  RIG_TIME,
  EQUIPMENT_RATES
} from '../constants'
import { 
  roundToNearest,
  calculateEquipmentCost,
  validateBuildingMeasurements 
} from '../utils'

interface GlassRestorationInput extends CalculationInput {
  glassArea: number
  facadeArea?: number
  numberOfDrops: number
  buildingHeightStories?: number
}

export class GlassRestorationCalculator extends BaseCalculator<GlassRestorationInput> {
  calculate(input: GlassRestorationInput): CalculationResult {
    // Clear previous calculation state
    this.clearCalculationState()

    const { 
      glassArea, 
      facadeArea, 
      numberOfDrops,
      buildingHeightStories = 1,
      location
    } = input

    // Get crew and shift settings
    const crewSize = this.getCrewSize(input)
    const shiftLength = this.getShiftLengthFromInput(input)

    // Validate inputs
    this.validateInput(input)
    
    if (glassArea <= 0) {
      throw new Error('Glass area must be greater than 0')
    }

    if (numberOfDrops < 1) {
      throw new Error('Number of drops must be at least 1')
    }

    // Validate building measurements
    const measurementWarnings = validateBuildingMeasurements({
      glassArea,
      facadeArea,
      heightStories: buildingHeightStories
    })
    measurementWarnings.forEach(warning => this.addWarning(warning))

    // Calculate number of windows
    const windows = Math.ceil(glassArea / SURFACE.standardWindowSize)
    this.addBreakdown(
      'Windows Calculation',
      `${glassArea} sq ft ÷ ${SURFACE.standardWindowSize} sq ft per window`,
      `${windows} windows`
    )

    // Base price calculation
    const basePrice = windows * SERVICE_RATES.glassRestoration
    this.addBreakdown(
      'Base Price',
      `${windows} windows × $${SERVICE_RATES.glassRestoration} per window`,
      this.formatCurrency(basePrice)
    )

    // Labor hours calculation
    const laborHours = windows * TIME_PER_UNIT.glassRestoration
    this.addBreakdown(
      'Labor Hours',
      `${windows} windows × ${TIME_PER_UNIT.glassRestoration} hours per window`,
      `${laborHours} hours`
    )

    // Setup time calculation (special for GR)
    const setupHours = this.calculateSetupTime(laborHours, false)
    this.addBreakdown(
      'Setup Time',
      `${laborHours} labor hours × 25% setup`,
      `${setupHours} hours`
    )

    // Glass Restoration ALWAYS uses scaffold regardless of building height
    const equipmentType = EQUIPMENT_TYPES.SCAFFOLD
    
    // Rig time calculation
    const rigHours = this.calculateRigTime(equipmentType, numberOfDrops)
    this.addBreakdown(
      'Rig Time',
      `${numberOfDrops} drops × ${RIG_TIME.scaffold} hours per drop`,
      `${rigHours} hours`
    )

    // Calculate total hours
    const totalHours = laborHours + setupHours + rigHours

    // Calculate project days
    const projectDays = this.calculateProjectDays(totalHours, crewSize, shiftLength)

    // Calculate equipment cost
    const equipmentCost = calculateEquipmentCost(equipmentType, projectDays)
    const equipment = {
      type: equipmentType,
      days: projectDays,
      cost: equipmentCost
    }

    this.addBreakdown(
      'Equipment Cost',
      `${equipmentType} for ${projectDays} days`,
      this.formatCurrency(equipmentCost)
    )

    // Apply minimum charge
    const finalPrice = this.calculateMinimumCharge('GR', basePrice)

    // Validate glass to facade ratio
    if (facadeArea) {
      this.validateGlassToFacadeRatio(glassArea, facadeArea)
    }

    // Validate price per window
    this.validatePricePerWindow(finalPrice, windows)

    // Validate setup time percentage
    this.validateSetupTime(setupHours, laborHours)

    // Validate building height
    if (buildingHeightStories) {
      this.validateBuildingHeight(buildingHeightStories)
    }

    // Add specific Glass Restoration warnings
    if (windows > 500) {
      this.addWarning('Large window count - consider splitting into multiple phases')
    }

    if (numberOfDrops > 6) {
      this.addWarning('High number of drops - verify scaffold rigging requirements')
    }

    if (projectDays > 30) {
      this.addWarning('Project duration exceeds 30 days - consider weather delays')
    }

    // Build and return result
    return this.buildCalculationResult(
      'Glass Restoration',
      finalPrice,
      laborHours,
      setupHours,
      rigHours,
      crewSize,
      equipment
    )
  }

  // Helper method to estimate drops based on building size
  static estimateDrops(glassArea: number, buildingHeightStories: number): number {
    // Base drops on glass area and height
    const baseDrops = Math.ceil(glassArea / 2000) // 1 drop per 2000 sq ft
    const heightMultiplier = buildingHeightStories <= 10 ? 1 : 1.5
    
    return Math.max(1, Math.ceil(baseDrops * heightMultiplier))
  }

  // Helper method to validate weather conditions for GR
  static validateWeatherConditions(temperature: number, precipitationChance: number): string[] {
    const warnings: string[] = []
    
    if (temperature < 35) {
      warnings.push('Temperature below 35°F - Glass Restoration not recommended')
    }
    
    if (precipitationChance > 30) {
      warnings.push('High precipitation chance - consider weather delays')
    }
    
    return warnings
  }

  // Helper method to calculate efficiency gains when combined with other services
  static calculateCombinedEfficiency(
    servicesIncluded: string[],
    totalGlassArea: number
  ): { efficiency: number; savings: number } {
    let efficiency = 1.0
    let savings = 0
    
    // Frame Restoration combination
    if (servicesIncluded.includes('FR')) {
      efficiency *= 0.85 // 15% efficiency gain
      savings += totalGlassArea * 0.50 // $0.50 per sq ft savings
    }
    
    // Final Clean combination
    if (servicesIncluded.includes('FC')) {
      efficiency *= 0.90 // 10% efficiency gain
      savings += totalGlassArea * 0.25 // $0.25 per sq ft savings
    }
    
    return { efficiency, savings }
  }
}