import { BaseCalculator, CalculationInput, CalculationResult } from '../base-calculator'
import { 
  SERVICE_RATES,
  EQUIPMENT_TYPES
} from '../constants'
import { 
  roundToNearest,
  validateBuildingMeasurements
} from '../utils'

interface GraniteReconditioningInput extends CalculationInput {
  area: number
  graniteCondition: 'good' | 'fair' | 'poor'
  serviceLevel: 'clean_only' | 'clean_and_seal' | 'restore_and_seal'
  includesPolishing: boolean
  edgeWork: boolean
  edgeLinearFeet?: number
}

export class GraniteReconditioningCalculator extends BaseCalculator<GraniteReconditioningInput> {
  calculate(input: GraniteReconditioningInput): CalculationResult {
    // Clear previous calculation state
    this.clearCalculationState()

    const { 
      area,
      graniteCondition,
      serviceLevel,
      includesPolishing,
      edgeWork,
      edgeLinearFeet = 0,
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

    if (edgeWork && edgeLinearFeet <= 0) {
      throw new Error('Edge linear feet must be greater than 0 when edge work is included')
    }

    // Validate building measurements
    const measurementWarnings = validateBuildingMeasurements({
      facadeArea: area
    })
    measurementWarnings.forEach(warning => this.addWarning(warning))

    // Get base rate
    const baseRate = this.getServiceRate(serviceLevel, graniteCondition)
    this.addBreakdown(
      'Base Rate',
      `${serviceLevel.replace('_', ' ')}, ${graniteCondition} condition`,
      `$${baseRate}/sq ft`
    )

    // Calculate base price
    let basePrice = area * baseRate
    this.addBreakdown(
      'Base Price',
      `${area} sq ft × $${baseRate}`,
      this.formatCurrency(basePrice)
    )

    // Polishing surcharge
    if (includesPolishing) {
      const polishingSurcharge = area * 0.25 // $0.25 per sq ft
      basePrice += polishingSurcharge
      this.addBreakdown(
        'Polishing Surcharge',
        `${area} sq ft × $0.25`,
        this.formatCurrency(polishingSurcharge)
      )
    }

    // Edge work
    if (edgeWork && edgeLinearFeet > 0) {
      const edgeRate = 3.50 // $3.50 per linear foot
      const edgePrice = edgeLinearFeet * edgeRate
      basePrice += edgePrice
      this.addBreakdown(
        'Edge Work',
        `${edgeLinearFeet} linear ft × $${edgeRate}`,
        this.formatCurrency(edgePrice)
      )
    }

    // Calculate labor hours
    const laborHours = this.calculateLaborHours(area, serviceLevel, graniteCondition, includesPolishing, crewSize)
    this.addBreakdown(
      'Labor Hours',
      `${area} sq ft, ${serviceLevel} service`,
      `${laborHours.toFixed(1)} hours`
    )

    // Edge work labor
    let edgeLaborHours = 0
    if (edgeWork && edgeLinearFeet > 0) {
      edgeLaborHours = edgeLinearFeet * 0.1 // 0.1 hours per linear foot
      this.addBreakdown(
        'Edge Work Labor',
        `${edgeLinearFeet} linear ft × 0.1 hrs`,
        `${edgeLaborHours.toFixed(1)} hours`
      )
    }

    const totalLaborHours = laborHours + edgeLaborHours
    if (edgeLaborHours > 0) {
      this.addBreakdown(
        'Total Labor Hours',
        'Surface + Edge work',
        `${totalLaborHours.toFixed(1)} hours`
      )
    }

    // Setup time
    const setupHours = this.calculateSetupTime(totalLaborHours)
    this.addBreakdown(
      'Setup Time',
      `${totalLaborHours.toFixed(1)} hours × 25%`,
      `${setupHours.toFixed(1)} hours`
    )

    // Total hours (ground level work, no rig time)
    const totalHours = totalLaborHours + setupHours
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
    const finalPrice = this.calculateMinimumCharge('GRC', roundedPrice)

    // Validations
    this.validateSetupTime(setupHours, totalLaborHours)

    // Service-specific warnings
    if (graniteCondition === 'poor' && serviceLevel === 'clean_only') {
      this.addWarning('Poor condition granite typically requires restoration, not just cleaning')
    }

    if (area > 1000) {
      this.addWarning('Large area - consider phased approach to minimize business disruption')
    }

    if (includesPolishing && graniteCondition === 'poor') {
      this.addWarning('Polishing may not be effective on poor condition granite without restoration')
    }

    if (serviceLevel === 'restore_and_seal' && finalPrice < 1000) {
      this.addWarning('Restoration price seems low - verify scope and measurements')
    }

    if (edgeWork && edgeLinearFeet > 200) {
      this.addWarning('Extensive edge work - consider specialized equipment')
    }

    if (projectDays > 5) {
      this.addWarning('Extended project duration - coordinate with facility operations')
    }

    if (graniteCondition === 'good' && serviceLevel === 'restore_and_seal') {
      this.addWarning('Full restoration may not be necessary for good condition granite')
    }

    // Material warnings
    if (includesPolishing && area > 500) {
      this.addWarning('Large polishing area - verify diamond pad availability')
    }

    if (serviceLevel.includes('seal') && graniteCondition === 'poor') {
      this.addWarning('Poor condition granite may require multiple sealer applications')
    }

    // Build and return result
    return this.buildCalculationResult(
      'Granite Reconditioning',
      finalPrice,
      totalLaborHours,
      setupHours,
      0, // Ground level work, no rig time
      crewSize,
      undefined // Ground level work, no equipment
    )
  }

  private getServiceRate(serviceLevel: string, condition: string): number {
    let rate = SERVICE_RATES.graniteReconditioning
    
    // Service level adjustments
    switch (serviceLevel) {
      case 'clean_only':
        rate *= 0.6 // 60% of base rate
        break
      case 'clean_and_seal':
        rate *= 1.0 // Base rate
        break
      case 'restore_and_seal':
        rate *= 1.4 // 140% of base rate
        break
    }
    
    // Condition adjustments
    switch (condition) {
      case 'poor':
        rate *= 1.2 // 20% more time
        break
      case 'fair':
        rate *= 1.0 // Standard time
        break
      case 'good':
        rate *= 0.9 // 10% less time
        break
    }
    
    return Number(rate.toFixed(2))
  }

  private calculateLaborHours(area: number, serviceLevel: string, condition: string, includesPolishing: boolean, crewSize: number): number {
    let baseHoursPerSqFt = 0.04 // 0.04 hours per sq ft base
    
    // Service level adjustments
    switch (serviceLevel) {
      case 'clean_only':
        baseHoursPerSqFt *= 0.6
        break
      case 'clean_and_seal':
        baseHoursPerSqFt *= 1.0
        break
      case 'restore_and_seal':
        baseHoursPerSqFt *= 1.8
        break
    }
    
    // Condition adjustments
    switch (condition) {
      case 'poor':
        baseHoursPerSqFt *= 1.3
        break
      case 'fair':
        baseHoursPerSqFt *= 1.0
        break
      case 'good':
        baseHoursPerSqFt *= 0.8
        break
    }
    
    let laborHours = area * baseHoursPerSqFt
    
    if (includesPolishing) {
      laborHours *= 1.2 // 20% more time for polishing
    }
    
    return laborHours
  }

  // Helper method to assess granite condition
  static assessGraniteCondition(
    ageYears: number,
    lastMaintenance: number,
    staining: 'none' | 'light' | 'moderate' | 'heavy',
    etching: 'none' | 'light' | 'moderate' | 'heavy',
    scratches: 'none' | 'light' | 'moderate' | 'heavy'
  ): { condition: 'good' | 'fair' | 'poor'; factors: string[] } {
    const factors: string[] = []
    let condition: 'good' | 'fair' | 'poor' = 'good'
    
    if (ageYears > 10) {
      factors.push('Granite over 10 years old')
      condition = 'fair'
    }
    
    if (lastMaintenance > 24) {
      factors.push('No maintenance in 2+ years')
      condition = condition === 'good' ? 'fair' : 'poor'
    }
    
    if (staining === 'heavy' || etching === 'heavy' || scratches === 'heavy') {
      factors.push('Heavy damage present')
      condition = 'poor'
    } else if (staining === 'moderate' || etching === 'moderate' || scratches === 'moderate') {
      factors.push('Moderate damage present')
      condition = condition === 'good' ? 'fair' : condition
    }
    
    return { condition, factors }
  }

  // Helper method to calculate material requirements
  static calculateMaterialRequirements(
    area: number,
    serviceLevel: string,
    graniteCondition: string,
    includesPolishing: boolean,
    edgeLinearFeet: number
  ): { 
    cleaner: number;
    sealer: number;
    polishingCompound: number;
    diamondPads: number;
    totalCost: number;
    recommendations: string[]
  } {
    const recommendations: string[] = []
    let cleaner = 0
    let sealer = 0
    let polishingCompound = 0
    let diamondPads = 0
    
    // Cleaner requirements
    if (serviceLevel !== 'clean_only') {
      const cleanerRate = graniteCondition === 'poor' ? 0.02 : 0.01 // gallons per sq ft
      cleaner = area * cleanerRate
    }
    
    // Sealer requirements
    if (serviceLevel.includes('seal')) {
      const sealerRate = graniteCondition === 'poor' ? 0.008 : 0.006 // gallons per sq ft
      sealer = area * sealerRate
      
      if (graniteCondition === 'poor') {
        recommendations.push('Poor condition granite may require multiple sealer coats')
      }
    }
    
    // Polishing compound
    if (includesPolishing) {
      polishingCompound = area * 0.001 // gallons per sq ft
      diamondPads = Math.ceil(area / 500) // 1 pad per 500 sq ft
      
      recommendations.push('Polishing requires diamond pads and specialized equipment')
    }
    
    // Edge work materials
    if (edgeLinearFeet > 0) {
      cleaner += edgeLinearFeet * 0.001 // Additional cleaner for edges
      sealer += edgeLinearFeet * 0.001 // Additional sealer for edges
      
      if (edgeLinearFeet > 100) {
        recommendations.push('Extensive edge work requires specialized tools')
      }
    }
    
    // Calculate costs
    const costs = {
      cleaner: cleaner * 18.50,      // $18.50 per gallon
      sealer: sealer * 45.00,        // $45.00 per gallon
      polishingCompound: polishingCompound * 35.00, // $35.00 per gallon
      diamondPads: diamondPads * 25.00 // $25.00 per pad
    }
    
    const totalCost = costs.cleaner + costs.sealer + costs.polishingCompound + costs.diamondPads
    
    return {
      cleaner: Math.ceil(cleaner),
      sealer: Math.ceil(sealer),
      polishingCompound: Math.ceil(polishingCompound),
      diamondPads,
      totalCost,
      recommendations
    }
  }

  // Helper method to calculate restoration timeline
  static calculateRestorationTimeline(
    area: number,
    serviceLevel: string,
    graniteCondition: string,
    includesPolishing: boolean,
    crewSize: number
  ): { 
    cleaningDays: number;
    restorationDays: number;
    sealingDays: number;
    cureTime: number;
    totalDays: number;
    recommendations: string[]
  } {
    const recommendations: string[] = []
    let cleaningDays = 0
    let restorationDays = 0
    let sealingDays = 0
    let cureTime = 1 // 1 day cure time for sealer
    
    const hoursPerDay = crewSize * 8
    
    // Cleaning phase
    if (serviceLevel !== 'clean_only') {
      const cleaningHours = area * 0.02 // 0.02 hours per sq ft
      cleaningDays = Math.ceil(cleaningHours / hoursPerDay)
    }
    
    // Restoration phase
    if (serviceLevel === 'restore_and_seal') {
      const restorationMultiplier = graniteCondition === 'poor' ? 1.5 : 1.0
      const restorationHours = area * 0.03 * restorationMultiplier
      restorationDays = Math.ceil(restorationHours / hoursPerDay)
      
      if (includesPolishing) {
        const polishingHours = area * 0.015
        restorationDays += Math.ceil(polishingHours / hoursPerDay)
      }
    }
    
    // Sealing phase
    if (serviceLevel.includes('seal')) {
      const sealingHours = area * 0.01
      sealingDays = Math.ceil(sealingHours / hoursPerDay)
    }
    
    const totalDays = cleaningDays + restorationDays + sealingDays + cureTime
    
    // Recommendations
    if (serviceLevel === 'restore_and_seal') {
      recommendations.push('Restoration work should be done in controlled environment')
    }
    
    if (includesPolishing) {
      recommendations.push('Polishing generates dust - ensure proper ventilation')
    }
    
    if (area > 500) {
      recommendations.push('Large area - consider working in sections')
    }
    
    if (graniteCondition === 'poor') {
      recommendations.push('Poor condition granite may require extended timeline')
    }
    
    return {
      cleaningDays,
      restorationDays,
      sealingDays,
      cureTime,
      totalDays,
      recommendations
    }
  }

  // Helper method to calculate maintenance schedule
  static calculateMaintenanceSchedule(
    area: number,
    usage: 'light' | 'moderate' | 'heavy',
    environment: 'indoor' | 'outdoor',
    serviceLevel: string
  ): { 
    cleaningFrequency: string;
    sealingFrequency: string;
    polishingFrequency: string;
    annualCost: number;
    recommendations: string[]
  } {
    const recommendations: string[] = []
    let cleaningFrequency = 'monthly'
    let sealingFrequency = 'annually'
    let polishingFrequency = 'as needed'
    
    // Adjust based on usage
    if (usage === 'heavy') {
      cleaningFrequency = 'weekly'
      sealingFrequency = 'every 6 months'
      polishingFrequency = 'annually'
      recommendations.push('Heavy usage requires frequent maintenance')
    } else if (usage === 'moderate') {
      cleaningFrequency = 'bi-weekly'
      sealingFrequency = 'annually'
      polishingFrequency = 'every 2 years'
    }
    
    // Environment adjustments
    if (environment === 'outdoor') {
      if (cleaningFrequency === 'monthly') cleaningFrequency = 'bi-weekly'
      sealingFrequency = 'every 6 months'
      recommendations.push('Outdoor granite requires more frequent sealing')
    }
    
    // Calculate annual cost
    const cleaningCost = area * 0.50 * (cleaningFrequency === 'weekly' ? 52 : cleaningFrequency === 'bi-weekly' ? 26 : 12)
    const sealingCost = area * 1.75 * (sealingFrequency === 'every 6 months' ? 2 : 1)
    const polishingCost = area * 0.25 * (polishingFrequency === 'annually' ? 1 : 0.5)
    
    const annualCost = cleaningCost + sealingCost + polishingCost
    
    return {
      cleaningFrequency,
      sealingFrequency,
      polishingFrequency,
      annualCost,
      recommendations
    }
  }
}