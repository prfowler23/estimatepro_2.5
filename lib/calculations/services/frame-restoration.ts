import { BaseCalculator, CalculationInput, CalculationResult } from '../base-calculator'
import { 
  SERVICE_RATES,
  TIME_PER_UNIT,
  EQUIPMENT_TYPES,
  RIG_TIME
} from '../constants'
import { 
  calculateEquipmentCost,
  roundToNearest,
  validateBuildingMeasurements
} from '../utils'

interface FrameRestorationInput extends CalculationInput {
  numberOfFrames: number
  frameCondition: 'good' | 'fair' | 'poor'
  requiresGlassRestoration: boolean
  buildingHeightStories?: number
  numberOfDrops?: number
}

export class FrameRestorationCalculator extends BaseCalculator<FrameRestorationInput> {
  calculate(input: FrameRestorationInput): CalculationResult {
    // Clear previous calculation state
    this.clearCalculationState()

    const { 
      numberOfFrames,
      frameCondition,
      requiresGlassRestoration,
      buildingHeightStories = 1,
      numberOfDrops = 1,
      location
    } = input

    // Get crew and shift settings
    const crewSize = this.getCrewSize(input)
    const shiftLength = this.getShiftLengthFromInput(input)

    // Validate inputs
    this.validateInput(input)
    
    if (numberOfFrames <= 0) {
      throw new Error('Number of frames must be greater than 0')
    }

    // Validate building measurements
    const measurementWarnings = validateBuildingMeasurements({
      heightStories: buildingHeightStories
    })
    measurementWarnings.forEach(warning => this.addWarning(warning))

    // Base price
    const basePrice = numberOfFrames * SERVICE_RATES.frameRestoration
    this.addBreakdown(
      'Base Price',
      `${numberOfFrames} frames × $${SERVICE_RATES.frameRestoration} per frame`,
      this.formatCurrency(basePrice)
    )

    // Time per frame based on condition
    let timePerFrame = TIME_PER_UNIT.frameRestoration
    let conditionMultiplier = 1.0
    
    if (frameCondition === 'poor') {
      conditionMultiplier = 1.5
      timePerFrame *= conditionMultiplier
    } else if (frameCondition === 'fair') {
      conditionMultiplier = 1.2
      timePerFrame *= conditionMultiplier
    }

    this.addBreakdown(
      'Condition Adjustment',
      `${frameCondition} condition × ${conditionMultiplier}`,
      `${timePerFrame.toFixed(3)} hrs/frame`
    )

    // Labor hours
    const laborHours = numberOfFrames * timePerFrame
    this.addBreakdown(
      'Labor Hours',
      `${numberOfFrames} frames × ${timePerFrame.toFixed(3)} hrs/frame`,
      `${laborHours.toFixed(2)} hours`
    )

    // Setup time (special for FR)
    const setupHours = this.calculateSetupTime(laborHours, true)
    this.addBreakdown(
      'Setup Time (Special)',
      `2 × (${laborHours.toFixed(2)} ÷ ${shiftLength})`,
      `${setupHours.toFixed(2)} hours`
    )

    // Rig time (shares with GR if done together)
    let rigHours = 0
    if (requiresGlassRestoration) {
      rigHours = numberOfDrops * RIG_TIME.scaffold
      this.addBreakdown(
        'Rig Time',
        'Shared with Glass Restoration (scaffold)',
        `${rigHours.toFixed(2)} hours`
      )
    } else {
      rigHours = 0.5 // Minimal standalone setup
      this.addBreakdown(
        'Rig Time',
        'Standalone setup',
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

    // Equipment (shares scaffold with GR if applicable)
    let equipment = undefined
    if (requiresGlassRestoration) {
      equipment = {
        type: EQUIPMENT_TYPES.SCAFFOLD,
        days: 0, // Shared with GR, no additional cost
        cost: 0,
      }
      this.addBreakdown(
        'Equipment Cost',
        'Scaffold shared with Glass Restoration',
        '$0 (included in GR)'
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
    const finalPrice = this.calculateMinimumCharge('FR', roundedPrice)

    // Validations
    this.validateSetupTime(setupHours, laborHours)
    
    if (buildingHeightStories) {
      this.validateBuildingHeight(buildingHeightStories)
    }

    // Service-specific warnings
    if (!requiresGlassRestoration) {
      this.addWarning('Frame restoration typically performed with glass restoration for efficiency')
    }

    if (frameCondition === 'poor' && numberOfFrames > 100) {
      this.addWarning('Large number of frames in poor condition - consider phased approach')
    }

    if (numberOfFrames > 500) {
      this.addWarning('Very large frame count - consider splitting into multiple phases')
    }

    if (frameCondition === 'poor' && finalPrice < 1000) {
      this.addWarning('Price seems low for poor condition frames - verify scope')
    }

    if (projectDays > 20) {
      this.addWarning('Extended project duration - consider weather delays')
    }

    if (buildingHeightStories > 15) {
      this.addWarning('Very tall building - additional safety measures may be required')
    }

    // Combination efficiency warnings
    if (requiresGlassRestoration && numberOfFrames < 50) {
      this.addWarning('Small frame count with GR - verify cost efficiency')
    }

    // Build and return result
    return this.buildCalculationResult(
      'Frame Restoration',
      finalPrice,
      laborHours,
      setupHours,
      rigHours,
      crewSize,
      equipment
    )
  }

  // Helper method to calculate frame condition assessment
  static assessFrameCondition(
    frameAge: number,
    lastMaintenance: number,
    environmentalExposure: 'low' | 'medium' | 'high'
  ): { condition: 'good' | 'fair' | 'poor'; recommendations: string[] } {
    const recommendations: string[] = []
    let condition: 'good' | 'fair' | 'poor' = 'good'
    
    // Age assessment
    if (frameAge > 20) {
      condition = 'fair'
      recommendations.push('Frames over 20 years old require careful inspection')
    }
    
    if (frameAge > 30) {
      condition = 'poor'
      recommendations.push('Frames over 30 years old may need significant restoration')
    }
    
    // Maintenance history
    if (lastMaintenance > 10) {
      condition = condition === 'good' ? 'fair' : 'poor'
      recommendations.push('Frames not maintained in 10+ years require additional work')
    }
    
    // Environmental exposure
    if (environmentalExposure === 'high') {
      condition = condition === 'good' ? 'fair' : 'poor'
      recommendations.push('High environmental exposure accelerates frame deterioration')
    }
    
    return { condition, recommendations }
  }

  // Helper method to calculate material requirements
  static calculateMaterialRequirements(
    numberOfFrames: number,
    frameCondition: 'good' | 'fair' | 'poor',
    frameSize: 'small' | 'medium' | 'large'
  ): { primer: number; paint: number; sealant: number; totalCost: number } {
    const baseRequirements = {
      small: { primer: 0.1, paint: 0.15, sealant: 0.05 },
      medium: { primer: 0.15, paint: 0.2, sealant: 0.08 },
      large: { primer: 0.2, paint: 0.25, sealant: 0.1 }
    }
    
    const conditionMultipliers = {
      good: 1.0,
      fair: 1.3,
      poor: 1.6
    }
    
    const base = baseRequirements[frameSize]
    const multiplier = conditionMultipliers[frameCondition]
    
    const primer = numberOfFrames * base.primer * multiplier
    const paint = numberOfFrames * base.paint * multiplier
    const sealant = numberOfFrames * base.sealant * multiplier
    
    const costs = {
      primer: primer * 25, // $25 per gallon
      paint: paint * 35,   // $35 per gallon
      sealant: sealant * 45 // $45 per gallon
    }
    
    return {
      primer: Math.ceil(primer),
      paint: Math.ceil(paint),
      sealant: Math.ceil(sealant),
      totalCost: costs.primer + costs.paint + costs.sealant
    }
  }

  // Helper method to calculate restoration timeline
  static calculateRestorationTimeline(
    numberOfFrames: number,
    frameCondition: 'good' | 'fair' | 'poor',
    crewSize: number,
    weatherConstraints: boolean
  ): { 
    prepDays: number; 
    paintingDays: number; 
    cureTime: number; 
    totalDays: number;
    recommendations: string[]
  } {
    const baseTimePerFrame = TIME_PER_UNIT.frameRestoration
    const conditionMultipliers = { good: 1.0, fair: 1.2, poor: 1.5 }
    
    const adjustedTime = baseTimePerFrame * conditionMultipliers[frameCondition]
    const totalHours = numberOfFrames * adjustedTime
    
    const hoursPerDay = crewSize * 8
    const workingDays = Math.ceil(totalHours / hoursPerDay)
    
    const prepDays = Math.ceil(workingDays * 0.3) // 30% prep time
    const paintingDays = Math.ceil(workingDays * 0.7) // 70% painting time
    const cureTime = 2 // 2 days cure time
    
    let totalDays = prepDays + paintingDays + cureTime
    
    const recommendations: string[] = []
    
    if (weatherConstraints) {
      totalDays = Math.ceil(totalDays * 1.3) // 30% weather buffer
      recommendations.push('Weather delays factored into timeline')
    }
    
    if (frameCondition === 'poor') {
      recommendations.push('Poor condition frames may require additional prep time')
    }
    
    if (numberOfFrames > 200) {
      recommendations.push('Large frame count - consider multiple crews')
    }
    
    return {
      prepDays,
      paintingDays,
      cureTime,
      totalDays,
      recommendations
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
    
    if (temperature < 50 || temperature > 90) {
      warnings.push('Temperature outside optimal range (50-90°F) for frame restoration')
    }
    
    if (humidity > 85) {
      warnings.push('High humidity may extend paint cure time')
    }
    
    if (windSpeed > 15) {
      warnings.push('High wind speed may affect paint application quality')
    }
    
    if (precipitationChance > 30) {
      warnings.push('Precipitation risk - frame restoration requires dry conditions')
    }
    
    return warnings
  }

  // Helper method to calculate efficiency gains with glass restoration
  static calculateCombinedEfficiency(
    numberOfFrames: number,
    glassArea: number,
    sharedScaffoldDays: number
  ): { 
    efficiency: number; 
    savings: number; 
    recommendation: string 
  } {
    const standaloneFrameCost = numberOfFrames * 5 // $5 setup cost per frame
    const sharedSetupCost = Math.min(standaloneFrameCost, sharedScaffoldDays * 100)
    
    const savings = standaloneFrameCost - sharedSetupCost
    const efficiency = 1 + (savings / (numberOfFrames * SERVICE_RATES.frameRestoration))
    
    let recommendation = 'Standard efficiency'
    if (efficiency > 1.15) {
      recommendation = 'High efficiency - excellent combination'
    } else if (efficiency > 1.05) {
      recommendation = 'Good efficiency - recommended combination'
    }
    
    return {
      efficiency,
      savings,
      recommendation
    }
  }
}