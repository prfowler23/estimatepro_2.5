import { BaseCalculator, CalculationInput, CalculationResult } from '../base-calculator'
import { 
  SERVICE_RATES,
  SURFACE,
  EQUIPMENT_TYPES
} from '../constants'
import { 
  roundToNearest,
  validateBuildingMeasurements
} from '../utils'

interface ParkingDeckInput extends CalculationInput {
  numberOfSpaces?: number
  totalArea?: number
  deckLevel: 'ground' | 'elevated' | 'underground'
  serviceType: 'sweep_only' | 'wash_only' | 'sweep_and_wash'
  hasOilStains: boolean
  drainageComplexity: 'simple' | 'complex'
}

export class ParkingDeckCalculator extends BaseCalculator<ParkingDeckInput> {
  calculate(input: ParkingDeckInput): CalculationResult {
    // Clear previous calculation state
    this.clearCalculationState()

    const { 
      numberOfSpaces,
      totalArea,
      deckLevel,
      serviceType,
      hasOilStains,
      drainageComplexity,
      location
    } = input

    // Get crew and shift settings
    const crewSize = this.getCrewSize(input)
    const shiftLength = this.getShiftLengthFromInput(input)

    // Validate inputs
    this.validateInput(input)
    
    if (!numberOfSpaces && !totalArea) {
      throw new Error('Either number of spaces or total area must be provided')
    }

    // Calculate spaces if not provided
    let spaces = numberOfSpaces
    if (!spaces && totalArea) {
      spaces = Math.floor(totalArea / SURFACE.standardParkingSpace)
      this.addBreakdown(
        'Calculated Spaces',
        `${totalArea} sq ft ÷ ${SURFACE.standardParkingSpace} sq ft per space`,
        `${spaces} spaces`
      )
    }

    // Validate measurements
    if (totalArea) {
      const measurementWarnings = validateBuildingMeasurements({
        facadeArea: totalArea
      })
      measurementWarnings.forEach(warning => this.addWarning(warning))
    }

    // Get base rate for location
    const locationRates = SERVICE_RATES.parkingDeck[location]
    const baseRate = this.getServiceRate(serviceType, locationRates)
    
    this.addBreakdown(
      'Base Rate',
      `${serviceType.replace('_', ' ')} service in ${location}`,
      `$${baseRate}/space`
    )

    // Calculate base price
    let basePrice = spaces! * baseRate
    this.addBreakdown(
      'Base Price',
      `${spaces} spaces × $${baseRate}`,
      this.formatCurrency(basePrice)
    )

    // Level adjustments
    if (deckLevel === 'underground') {
      const undergroundSurcharge = basePrice * 0.15 // 15% increase
      basePrice += undergroundSurcharge
      this.addBreakdown(
        'Underground Surcharge',
        'Base price × 15%',
        this.formatCurrency(undergroundSurcharge)
      )
    } else if (deckLevel === 'elevated') {
      const elevatedSurcharge = basePrice * 0.10 // 10% increase
      basePrice += elevatedSurcharge
      this.addBreakdown(
        'Elevated Deck Surcharge',
        'Base price × 10%',
        this.formatCurrency(elevatedSurcharge)
      )
    }

    // Oil stain treatment
    if (hasOilStains) {
      const oilTreatment = spaces! * 2 // $2 per space
      basePrice += oilTreatment
      this.addBreakdown(
        'Oil Stain Treatment',
        `${spaces} spaces × $2`,
        this.formatCurrency(oilTreatment)
      )
    }

    // Drainage complexity
    if (drainageComplexity === 'complex') {
      const drainageSurcharge = basePrice * 0.08 // 8% increase
      basePrice += drainageSurcharge
      this.addBreakdown(
        'Complex Drainage Surcharge',
        'Base price × 8%',
        this.formatCurrency(drainageSurcharge)
      )
    }

    // Calculate labor hours based on service type
    const laborHours = this.calculateLaborHours(spaces!, serviceType, hasOilStains, crewSize)
    this.addBreakdown(
      'Labor Hours',
      `${spaces} spaces, ${serviceType} service${hasOilStains ? ' with oil treatment' : ''}`,
      `${laborHours.toFixed(1)} hours`
    )

    // Setup time
    const setupHours = this.calculateSetupTime(laborHours)
    this.addBreakdown(
      'Setup Time',
      `${laborHours.toFixed(1)} hours × 25%`,
      `${setupHours.toFixed(1)} hours`
    )

    // Total hours (no rig time for parking decks)
    const totalHours = laborHours + setupHours
    this.addBreakdown(
      'Total Hours',
      'Labor + Setup',
      `${totalHours.toFixed(1)} hours`
    )

    // Project days
    const projectDays = this.calculateProjectDays(totalHours, crewSize, shiftLength)

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
    const finalPrice = this.calculateMinimumCharge('PD', roundedPrice)

    // Validations
    this.validateSetupTime(setupHours, laborHours)

    // Service-specific warnings
    if (spaces! > 500) {
      this.addWarning('Large parking deck - consider scheduling during off-peak hours')
    }

    if (deckLevel === 'underground' && serviceType.includes('wash')) {
      this.addWarning('Underground washing requires special ventilation considerations')
    }

    if (hasOilStains && serviceType === 'sweep_only') {
      this.addWarning('Oil stains typically require washing service for effective removal')
    }

    if (drainageComplexity === 'complex' && serviceType.includes('wash')) {
      this.addWarning('Complex drainage may require additional containment measures')
    }

    if (spaces! > 1000) {
      this.addWarning('Very large parking deck - consider splitting into multiple phases')
    }

    if (deckLevel === 'elevated' && serviceType.includes('wash')) {
      this.addWarning('Elevated deck washing requires runoff management')
    }

    if (projectDays > 3) {
      this.addWarning('Extended project duration - coordinate with facility management')
    }

    // Efficiency warnings
    if (spaces! < 50 && serviceType === 'sweep_and_wash') {
      this.addWarning('Small deck with full service - verify cost efficiency')
    }

    // Build and return result
    return this.buildCalculationResult(
      'Parking Deck',
      finalPrice,
      laborHours,
      setupHours,
      0, // No rig time for parking decks
      crewSize,
      undefined // Ground level work, no equipment
    )
  }

  private getServiceRate(serviceType: string, locationRates: { min: number; max: number }): number {
    switch (serviceType) {
      case 'sweep_only':
        return locationRates.min
      case 'sweep_and_wash':
        return locationRates.max
      default: // wash_only
        return (locationRates.min + locationRates.max) / 2
    }
  }

  private calculateLaborHours(spaces: number, serviceType: string, hasOilStains: boolean, crewSize: number): number {
    let baseHours = 0
    
    switch (serviceType) {
      case 'sweep_only':
        baseHours = spaces * 0.02 // 0.02 hours per space
        break
      case 'wash_only':
        baseHours = spaces * 0.05 // 0.05 hours per space
        break
      case 'sweep_and_wash':
        baseHours = spaces * 0.07 // 0.07 hours per space
        break
    }
    
    if (hasOilStains) {
      baseHours *= 1.3 // 30% more time for oil treatment
    }
    
    return baseHours
  }

  // Helper method to calculate space optimization
  static calculateSpaceOptimization(
    totalArea: number,
    currentSpaces: number,
    aisleWidth: number,
    spaceWidth: number,
    spaceDepth: number
  ): { efficiency: number; potentialSpaces: number; recommendation: string } {
    const standardSpaceSize = SURFACE.standardParkingSpace
    const actualSpaceSize = spaceWidth * spaceDepth
    
    // Calculate efficiency based on space utilization
    const usedArea = currentSpaces * actualSpaceSize
    const efficiency = usedArea / totalArea
    
    // Calculate potential spaces with standard dimensions
    const potentialSpaces = Math.floor(totalArea * 0.8 / standardSpaceSize) // 80% utilization typical
    
    let recommendation = 'Current layout appears optimal'
    if (potentialSpaces > currentSpaces * 1.1) {
      recommendation = 'Layout optimization could increase capacity'
    } else if (efficiency < 0.6) {
      recommendation = 'Consider redesigning for better space utilization'
    }
    
    return { efficiency, potentialSpaces, recommendation }
  }

  // Helper method to calculate cleaning frequency recommendations
  static calculateCleaningFrequency(
    usage: 'light' | 'moderate' | 'heavy',
    location: 'indoor' | 'outdoor',
    weatherExposure: boolean
  ): { frequency: string; reasoning: string[] } {
    const reasoning: string[] = []
    let frequency = 'monthly'
    
    if (usage === 'heavy') {
      frequency = 'weekly'
      reasoning.push('Heavy usage requires frequent cleaning')
    } else if (usage === 'moderate') {
      frequency = 'bi-weekly'
      reasoning.push('Moderate usage benefits from bi-weekly cleaning')
    }
    
    if (location === 'outdoor') {
      if (frequency === 'monthly') frequency = 'bi-weekly'
      reasoning.push('Outdoor exposure increases cleaning needs')
    }
    
    if (weatherExposure) {
      if (frequency === 'monthly') frequency = 'bi-weekly'
      reasoning.push('Weather exposure accelerates soiling')
    }
    
    return { frequency, reasoning }
  }

  // Helper method to calculate material requirements
  static calculateMaterialRequirements(
    spaces: number,
    serviceType: string,
    hasOilStains: boolean,
    deckLevel: string
  ): { 
    sweepingSupplies: number;
    washingSupplies: number;
    oilTreatment: number;
    totalCost: number;
    recommendations: string[]
  } {
    const recommendations: string[] = []
    let sweepingSupplies = 0
    let washingSupplies = 0
    let oilTreatment = 0
    
    if (serviceType.includes('sweep')) {
      sweepingSupplies = spaces * 0.05 // $0.05 per space for sweeping supplies
    }
    
    if (serviceType.includes('wash')) {
      washingSupplies = spaces * 0.15 // $0.15 per space for washing supplies
      
      if (deckLevel === 'underground') {
        washingSupplies *= 1.2 // 20% more for ventilation considerations
        recommendations.push('Underground washing requires additional ventilation')
      }
    }
    
    if (hasOilStains) {
      oilTreatment = spaces * 0.50 // $0.50 per space for oil treatment
      recommendations.push('Oil stain treatment requires specialized chemicals')
    }
    
    const totalCost = sweepingSupplies + washingSupplies + oilTreatment
    
    return {
      sweepingSupplies,
      washingSupplies,
      oilTreatment,
      totalCost,
      recommendations
    }
  }

  // Helper method to calculate environmental impact
  static calculateEnvironmentalImpact(
    spaces: number,
    serviceType: string,
    drainageComplexity: string,
    hasOilStains: boolean
  ): { 
    waterUsage: number;
    chemicalUsage: number;
    wasteGenerated: number;
    environmentalScore: number;
    recommendations: string[]
  } {
    const recommendations: string[] = []
    let waterUsage = 0
    let chemicalUsage = 0
    let wasteGenerated = 0
    
    if (serviceType.includes('wash')) {
      waterUsage = spaces * 15 // 15 gallons per space
      chemicalUsage = spaces * 0.1 // 0.1 gallons per space
      
      if (drainageComplexity === 'complex') {
        recommendations.push('Complex drainage requires runoff management')
      }
    }
    
    if (serviceType.includes('sweep')) {
      wasteGenerated = spaces * 0.5 // 0.5 lbs per space
    }
    
    if (hasOilStains) {
      chemicalUsage += spaces * 0.05 // Additional chemicals for oil treatment
      recommendations.push('Oil treatment chemicals require proper disposal')
    }
    
    // Calculate environmental score (lower is better)
    const environmentalScore = (waterUsage * 0.1) + (chemicalUsage * 2) + (wasteGenerated * 0.5)
    
    if (environmentalScore > 100) {
      recommendations.push('Consider eco-friendly cleaning alternatives')
    }
    
    return {
      waterUsage,
      chemicalUsage,
      wasteGenerated,
      environmentalScore,
      recommendations
    }
  }

  // Helper method to calculate traffic management requirements
  static calculateTrafficManagement(
    spaces: number,
    serviceType: string,
    workingHours: 'business' | 'after-hours' | 'overnight'
  ): { 
    closureTime: number;
    stagingRequired: boolean;
    signageRequired: boolean;
    recommendations: string[]
  } {
    const recommendations: string[] = []
    let closureTime = 0
    let stagingRequired = false
    let signageRequired = true
    
    // Base closure time calculation
    if (serviceType === 'sweep_only') {
      closureTime = spaces * 0.5 // 0.5 minutes per space
    } else if (serviceType === 'wash_only') {
      closureTime = spaces * 2 // 2 minutes per space
    } else {
      closureTime = spaces * 2.5 // 2.5 minutes per space
    }
    
    // Convert to hours
    closureTime = closureTime / 60
    
    if (spaces > 200) {
      stagingRequired = true
      recommendations.push('Large deck requires staged cleaning approach')
    }
    
    if (workingHours === 'business') {
      recommendations.push('Business hours work requires coordination with users')
      if (spaces > 100) {
        recommendations.push('Consider partial closures to maintain access')
      }
    }
    
    if (workingHours === 'after-hours' || workingHours === 'overnight') {
      recommendations.push('After-hours work allows for full deck access')
    }
    
    return {
      closureTime,
      stagingRequired,
      signageRequired,
      recommendations
    }
  }
}