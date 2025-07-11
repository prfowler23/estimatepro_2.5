import { BaseCalculator, CalculationInput, CalculationResult } from '../base-calculator'
import { 
  LOCATION_RATES, 
  SURFACE, 
  TIME_PER_UNIT,
  EQUIPMENT_TYPES,
  RIG_TIME
} from '../constants'
import { 
  getEquipmentForHeight,
  calculateEquipmentCost,
  roundToNearest,
  validateBuildingMeasurements
} from '../utils'

interface WindowCleaningInput extends CalculationInput {
  glassArea: number
  buildingHeightStories?: number
  numberOfDrops?: number
  hasRoofAnchors?: boolean
}

export class WindowCleaningCalculator extends BaseCalculator<WindowCleaningInput> {
  calculate(input: WindowCleaningInput): CalculationResult {
    // Clear previous calculation state
    this.clearCalculationState()

    const { 
      glassArea, 
      buildingHeightStories = 1,
      numberOfDrops = 1,
      hasRoofAnchors = false,
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

    // Validate building measurements
    const measurementWarnings = validateBuildingMeasurements({
      glassArea,
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

    // Determine access method and equipment
    const accessMethod = this.determineAccessMethod(buildingHeightStories, hasRoofAnchors)
    this.addBreakdown(
      'Access Method',
      `${buildingHeightStories} stories building`,
      accessMethod
    )

    // Labor hours calculation
    const laborHours = windows * TIME_PER_UNIT.windowCleaning
    this.addBreakdown(
      'Labor Hours',
      `${windows} windows × ${TIME_PER_UNIT.windowCleaning} hours per window`,
      `${laborHours.toFixed(2)} hours`
    )

    // Setup time
    const setupHours = this.calculateSetupTime(laborHours)
    this.addBreakdown(
      'Setup Time',
      `${laborHours.toFixed(2)} hours × 25%`,
      `${setupHours.toFixed(2)} hours`
    )

    // Rig time based on access method
    let rigHours = 0
    if (buildingHeightStories > 1) {
      if (accessMethod.includes('RDS')) {
        rigHours = numberOfDrops * RIG_TIME.rds
      } else {
        rigHours = numberOfDrops * RIG_TIME.boomLift
      }
      this.addBreakdown(
        'Rig Time',
        `${numberOfDrops} drops × ${accessMethod.includes('RDS') ? RIG_TIME.rds : RIG_TIME.boomLift} hours`,
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

    // Get hourly rate for location
    const hourlyRate = LOCATION_RATES.windowCleaning[location]
    this.addBreakdown(
      'Hourly Rate',
      `${location} location`,
      `$${hourlyRate}/hour`
    )

    // Calculate price
    const basePrice = totalHours * hourlyRate
    this.addBreakdown(
      'Base Price',
      `${totalHours.toFixed(2)} hours × $${hourlyRate}/hour`,
      this.formatCurrency(basePrice)
    )

    // Project days
    const projectDays = this.calculateProjectDays(totalHours, crewSize, shiftLength)

    // Equipment cost (if needed)
    let equipment = undefined
    if (buildingHeightStories > 1 && !accessMethod.includes('RDS')) {
      const equipmentType = getEquipmentForHeight(buildingHeightStories, 'WC')
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
    const finalPrice = this.calculateMinimumCharge('WC', roundedPrice)

    // Validations
    this.validatePricePerWindow(finalPrice, windows)
    this.validateSetupTime(setupHours, laborHours)
    
    if (buildingHeightStories) {
      this.validateBuildingHeight(buildingHeightStories)
    }

    // Service-specific warnings
    if (buildingHeightStories > 10 && !hasRoofAnchors) {
      this.addWarning('High-rise building - RDS requires verified roof anchors')
    }

    if (accessMethod.includes('RDS') && !hasRoofAnchors) {
      this.addWarning('RDS access requires roof anchor verification before proceeding')
    }

    if (windows > 200) {
      this.addWarning('Large window count - consider splitting into multiple service visits')
    }

    if (buildingHeightStories > 20) {
      this.addWarning('Very tall building - additional safety measures may be required')
    }

    if (projectDays > 5) {
      this.addWarning('Extended project duration - consider weather impact')
    }

    // Build and return result
    return this.buildCalculationResult(
      'Window Cleaning',
      finalPrice,
      laborHours,
      setupHours,
      rigHours,
      crewSize,
      equipment
    )
  }

  private determineAccessMethod(heightStories: number, hasRoofAnchors: boolean): string {
    if (heightStories <= 1) return 'Ground Level'
    if (heightStories <= 4) return 'Scissor Lift'
    if (heightStories <= 9) return 'Boom Lift'
    if (heightStories <= 15 && hasRoofAnchors) return 'RDS (Rope Descent System)'
    if (heightStories > 15) return 'RDS Required (Roof Anchors Needed)'
    return 'High-reach Boom Lift'
  }

  // Helper method to calculate frequency-based pricing
  static calculateFrequencyPricing(
    basePrice: number,
    frequency: 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'oneTime'
  ): number {
    const discounts = {
      monthly: 0.90,    // 10% discount
      quarterly: 0.95,  // 5% discount
      biannual: 0.97,   // 3% discount
      annual: 0.85,     // 15% discount
      oneTime: 1.0      // No discount
    }
    
    return basePrice * discounts[frequency]
  }

  // Helper method to estimate drops based on building perimeter
  static estimateDropsFromPerimeter(
    glassArea: number,
    buildingHeightStories: number,
    avgStoryHeight: number = 12
  ): number {
    const totalHeight = buildingHeightStories * avgStoryHeight
    const avgGlassWidth = glassArea / totalHeight
    
    // Estimate drops based on building width (1 drop per 100 ft of width)
    const estimatedDrops = Math.max(1, Math.ceil(avgGlassWidth / 100))
    
    return estimatedDrops
  }

  // Helper method to validate weather conditions
  static validateWeatherConditions(
    temperature: number,
    windSpeed: number,
    precipitationChance: number
  ): string[] {
    const warnings: string[] = []
    
    if (temperature < 32) {
      warnings.push('Freezing temperature - window cleaning not recommended')
    }
    
    if (windSpeed > 25) {
      warnings.push('High wind speed - unsafe for elevated work')
    }
    
    if (precipitationChance > 50) {
      warnings.push('High precipitation chance - consider rescheduling')
    }
    
    return warnings
  }

  // Helper method to calculate seasonal pricing adjustments
  static calculateSeasonalAdjustment(
    basePrice: number,
    month: number
  ): number {
    // Winter months (Dec, Jan, Feb) - 10% increase
    if (month === 12 || month === 1 || month === 2) {
      return basePrice * 1.10
    }
    
    // Spring/Summer months (Mar-Aug) - standard pricing
    if (month >= 3 && month <= 8) {
      return basePrice
    }
    
    // Fall months (Sep-Nov) - 5% increase
    return basePrice * 1.05
  }
}