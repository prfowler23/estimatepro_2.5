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

interface HighDustingInput extends CalculationInput {
  area: number
  surfaceComplexity: 'simple' | 'moderate' | 'complex'
  buildingHeightStories?: number
  numberOfDrops?: number
  includesFans: boolean
  includesFixtures: boolean
}

export class HighDustingCalculator extends BaseCalculator<HighDustingInput> {
  calculate(input: HighDustingInput): CalculationResult {
    // Clear previous calculation state
    this.clearCalculationState()

    const { 
      area,
      surfaceComplexity,
      buildingHeightStories = 1,
      numberOfDrops = 1,
      includesFans,
      includesFixtures,
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

    // Validate building measurements
    const measurementWarnings = validateBuildingMeasurements({
      facadeArea: area,
      heightStories: buildingHeightStories
    })
    measurementWarnings.forEach(warning => this.addWarning(warning))

    // Calculate rate based on complexity
    const baseRate = this.getComplexityRate(surfaceComplexity)
    this.addBreakdown(
      'Base Rate',
      `${surfaceComplexity} complexity`,
      `$${baseRate}/sq ft`
    )

    // Calculate base price
    let basePrice = area * baseRate
    this.addBreakdown(
      'Base Area Price',
      `${area} sq ft × $${baseRate}`,
      this.formatCurrency(basePrice)
    )

    // Additional charges for fans and fixtures
    if (includesFans) {
      const fanCharge = area * 0.10 // Additional $0.10/sq ft for fans
      basePrice += fanCharge
      this.addBreakdown(
        'Fan Cleaning Surcharge',
        `${area} sq ft × $0.10`,
        this.formatCurrency(fanCharge)
      )
    }

    if (includesFixtures) {
      const fixtureCharge = area * 0.15 // Additional $0.15/sq ft for fixtures
      basePrice += fixtureCharge
      this.addBreakdown(
        'Fixture Cleaning Surcharge',
        `${area} sq ft × $0.15`,
        this.formatCurrency(fixtureCharge)
      )
    }

    // Calculate labor hours
    const productionRate = this.getProductionRate(surfaceComplexity)
    const laborHours = area / (productionRate * crewSize)
    this.addBreakdown(
      'Labor Hours',
      `${area} sq ft ÷ (${productionRate} sq ft/hr × ${crewSize} crew)`,
      `${laborHours.toFixed(2)} hours`
    )

    // Setup time
    const setupHours = this.calculateSetupTime(laborHours)
    this.addBreakdown(
      'Setup Time',
      `${laborHours.toFixed(2)} hours × 25%`,
      `${setupHours.toFixed(2)} hours`
    )

    // Rig time
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

    // Equipment
    let equipment = undefined
    if (buildingHeightStories > 1) {
      const equipmentType = getEquipmentForHeight(buildingHeightStories, 'HD')
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
    const finalPrice = this.calculateMinimumCharge('HD', roundedPrice)

    // Validations
    this.validateSetupTime(setupHours, laborHours)
    
    if (buildingHeightStories) {
      this.validateBuildingHeight(buildingHeightStories)
    }

    // Service-specific warnings
    if (surfaceComplexity === 'complex' && !includesFixtures) {
      this.addWarning('Complex surfaces typically include fixture cleaning')
    }

    if (area > 20000) {
      this.addWarning('Large area - consider scheduling during off-hours')
    }

    if (includesFans && buildingHeightStories > 10) {
      this.addWarning('High-rise fan cleaning requires specialized equipment and safety measures')
    }

    if (surfaceComplexity === 'complex' && projectDays > 5) {
      this.addWarning('Complex high dusting over multiple days - coordinate with building operations')
    }

    if (buildingHeightStories > 15) {
      this.addWarning('Very tall building - additional safety equipment may be required')
    }

    if (includesFans && includesFixtures && area > 10000) {
      this.addWarning('Large area with fans and fixtures - consider phased approach')
    }

    // Efficiency warnings
    if (surfaceComplexity === 'simple' && (includesFans || includesFixtures)) {
      this.addWarning('Simple surfaces with fans/fixtures may not be truly "simple" - verify complexity')
    }

    // Build and return result
    return this.buildCalculationResult(
      'High Dusting',
      finalPrice,
      laborHours,
      setupHours,
      rigHours,
      crewSize,
      equipment
    )
  }

  private getComplexityRate(complexity: string): number {
    switch (complexity) {
      case 'simple':
        return OTHER_RATES.highDusting.min
      case 'complex':
        return OTHER_RATES.highDusting.max
      default: // moderate
        return (OTHER_RATES.highDusting.min + OTHER_RATES.highDusting.max) / 2
    }
  }

  private getProductionRate(complexity: string): number {
    const baseRate = PRODUCTION_RATES.highDusting
    switch (complexity) {
      case 'simple':
        return baseRate * 1.2
      case 'complex':
        return baseRate * 0.8
      default: // moderate
        return baseRate
    }
  }

  // Helper method to assess surface complexity
  static assessSurfaceComplexity(
    ceilingHeight: number,
    hasDecorative: boolean,
    hasVents: boolean,
    hasLighting: boolean,
    hasStructuralElements: boolean
  ): { complexity: 'simple' | 'moderate' | 'complex'; factors: string[] } {
    const factors: string[] = []
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple'
    
    if (ceilingHeight > 15) {
      factors.push('High ceiling (>15 ft)')
      complexity = 'moderate'
    }
    
    if (hasDecorative) {
      factors.push('Decorative elements')
      complexity = complexity === 'simple' ? 'moderate' : 'complex'
    }
    
    if (hasVents) {
      factors.push('HVAC vents')
      complexity = complexity === 'simple' ? 'moderate' : 'complex'
    }
    
    if (hasLighting) {
      factors.push('Light fixtures')
      complexity = complexity === 'simple' ? 'moderate' : 'complex'
    }
    
    if (hasStructuralElements) {
      factors.push('Structural elements (beams, columns)')
      complexity = 'complex'
    }
    
    return { complexity, factors }
  }

  // Helper method to calculate specialized equipment needs
  static calculateSpecializedEquipment(
    area: number,
    buildingHeight: number,
    includesFans: boolean,
    includesFixtures: boolean
  ): { equipment: string[]; additionalCost: number; recommendations: string[] } {
    const equipment: string[] = []
    const recommendations: string[] = []
    let additionalCost = 0
    
    if (buildingHeight > 20) {
      equipment.push('High-reach boom lift')
      additionalCost += 200 // per day premium
      recommendations.push('High-rise work requires specialized equipment')
    }
    
    if (includesFans) {
      equipment.push('Fan cleaning tools')
      additionalCost += 50
      recommendations.push('Fan cleaning requires specialized brushes and tools')
    }
    
    if (includesFixtures && area > 10000) {
      equipment.push('Fixture cleaning kit')
      additionalCost += 75
      recommendations.push('Large fixture cleaning requires comprehensive tool kit')
    }
    
    if (buildingHeight > 15 && (includesFans || includesFixtures)) {
      equipment.push('Safety harness system')
      additionalCost += 100
      recommendations.push('High-rise detail work requires enhanced safety equipment')
    }
    
    return { equipment, additionalCost, recommendations }
  }

  // Helper method to calculate dust load assessment
  static calculateDustLoadAssessment(
    buildingType: 'office' | 'retail' | 'industrial' | 'healthcare',
    lastCleaning: number, // months ago
    hvacMaintenance: 'poor' | 'average' | 'excellent'
  ): { dustLoad: 'light' | 'moderate' | 'heavy'; timeMultiplier: number; recommendations: string[] } {
    const recommendations: string[] = []
    let dustLoad: 'light' | 'moderate' | 'heavy' = 'light'
    let timeMultiplier = 1.0
    
    // Building type assessment
    if (buildingType === 'industrial') {
      dustLoad = 'heavy'
      timeMultiplier = 1.5
      recommendations.push('Industrial environments require heavy-duty cleaning')
    } else if (buildingType === 'retail') {
      dustLoad = 'moderate'
      timeMultiplier = 1.2
      recommendations.push('Retail environments have moderate dust accumulation')
    }
    
    // Last cleaning assessment
    if (lastCleaning > 12) {
      dustLoad = dustLoad === 'light' ? 'moderate' : 'heavy'
      timeMultiplier *= 1.3
      recommendations.push('Long intervals between cleanings increase dust load')
    }
    
    // HVAC maintenance assessment
    if (hvacMaintenance === 'poor') {
      dustLoad = dustLoad === 'light' ? 'moderate' : 'heavy'
      timeMultiplier *= 1.2
      recommendations.push('Poor HVAC maintenance increases dust accumulation')
    }
    
    return { dustLoad, timeMultiplier, recommendations }
  }

  // Helper method to calculate scheduling constraints
  static calculateSchedulingConstraints(
    buildingType: 'office' | 'retail' | 'industrial' | 'healthcare',
    area: number,
    workHours: 'business' | 'after-hours' | 'weekend'
  ): { constraints: string[]; efficiency: number; recommendations: string[] } {
    const constraints: string[] = []
    const recommendations: string[] = []
    let efficiency = 1.0
    
    if (buildingType === 'healthcare') {
      constraints.push('Infection control protocols')
      efficiency *= 0.8
      recommendations.push('Healthcare facilities require specialized cleaning protocols')
    }
    
    if (buildingType === 'office' && workHours === 'business') {
      constraints.push('Minimize disruption to occupants')
      efficiency *= 0.9
      recommendations.push('Business hours work requires coordination with occupants')
    }
    
    if (workHours === 'after-hours') {
      constraints.push('Limited building access')
      efficiency *= 0.95
      recommendations.push('After-hours work may require security coordination')
    }
    
    if (area > 15000 && workHours === 'weekend') {
      constraints.push('Extended weekend work')
      recommendations.push('Large weekend projects may require overtime rates')
    }
    
    return { constraints, efficiency, recommendations }
  }

  // Helper method to calculate material usage
  static calculateMaterialUsage(
    area: number,
    surfaceComplexity: 'simple' | 'moderate' | 'complex',
    dustLoad: 'light' | 'moderate' | 'heavy'
  ): { cleaningSupplies: number; disposables: number; totalCost: number } {
    const baseSupplyRate = 0.02 // $0.02 per sq ft base
    const complexityMultipliers = { simple: 1.0, moderate: 1.3, complex: 1.6 }
    const dustMultipliers = { light: 1.0, moderate: 1.2, heavy: 1.5 }
    
    const supplyCost = area * baseSupplyRate * complexityMultipliers[surfaceComplexity] * dustMultipliers[dustLoad]
    const disposableCost = area * 0.01 * dustMultipliers[dustLoad] // Disposable cloths, filters
    
    return {
      cleaningSupplies: supplyCost,
      disposables: disposableCost,
      totalCost: supplyCost + disposableCost
    }
  }
}