import { MeasurementEntry } from '@/lib/types/measurements';

export interface ProductionRate {
  service: string;
  ratePerDay: number;
  unit: 'sqft' | 'windows' | 'spaces' | 'lf';
  crewSize: number;
  factors: {
    height: number; // multiplier for height
    difficulty: number; // multiplier for difficulty
    weather: number; // weather impact factor
  };
}

export interface ServiceDuration {
  service: string;
  baseDuration: number;
  weatherImpact: number;
  finalDuration: number;
  confidence: 'high' | 'medium' | 'low';
  dependencies: string[];
}

export interface TimelineEntry {
  service: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  dependencies: string[];
  canOverlap: boolean;
  isCriticalPath?: boolean;
}

export interface Timeline {
  entries: TimelineEntry[];
  totalDuration: number;
  criticalPath: string[];
}

export const PRODUCTION_RATES: Record<string, ProductionRate> = {
  'WC': {
    service: 'WC',
    ratePerDay: 150, // windows per day
    unit: 'windows',
    crewSize: 2,
    factors: { height: 0.7, difficulty: 0.9, weather: 0.8 }
  },
  'GR': {
    service: 'GR',
    ratePerDay: 50, // windows per day (restoration is slower)
    unit: 'windows',
    crewSize: 2,
    factors: { height: 0.9, difficulty: 0.7, weather: 0.9 }
  },
  'BWP': {
    service: 'BWP',
    ratePerDay: 3000, // sqft per day
    unit: 'sqft',
    crewSize: 2,
    factors: { height: 0.8, difficulty: 0.9, weather: 0.7 }
  },
  'BWS': {
    service: 'BWS',
    ratePerDay: 1500, // sqft per day (includes drying time)
    unit: 'sqft',
    crewSize: 2,
    factors: { height: 0.8, difficulty: 0.85, weather: 0.5 }
  },
  'HBW': {
    service: 'HBW',
    ratePerDay: 2000, // sqft per day (high-rise)
    unit: 'sqft',
    crewSize: 3,
    factors: { height: 0.6, difficulty: 0.8, weather: 0.6 }
  },
  'PWF': {
    service: 'PWF',
    ratePerDay: 5000, // sqft per day (flat surfaces)
    unit: 'sqft',
    crewSize: 2,
    factors: { height: 1.0, difficulty: 0.9, weather: 0.8 }
  },
  'HFS': {
    service: 'HFS',
    ratePerDay: 3000, // sqft per day (hard floor scrubbing)
    unit: 'sqft',
    crewSize: 2,
    factors: { height: 1.0, difficulty: 0.8, weather: 1.0 }
  },
  'PC': {
    service: 'PC',
    ratePerDay: 100, // spaces per day
    unit: 'spaces',
    crewSize: 3,
    factors: { height: 1.0, difficulty: 0.9, weather: 0.6 }
  },
  'PWP': {
    service: 'PWP',
    ratePerDay: 8000, // sqft per day (parking pressure wash)
    unit: 'sqft',
    crewSize: 3,
    factors: { height: 1.0, difficulty: 0.95, weather: 0.7 }
  },
  'IW': {
    service: 'IW',
    ratePerDay: 2500, // sqft per day (interior walls)
    unit: 'sqft',
    crewSize: 2,
    factors: { height: 0.9, difficulty: 0.8, weather: 1.0 }
  },
  'DC': {
    service: 'DC',
    ratePerDay: 4000, // sqft per day (deck cleaning)
    unit: 'sqft',
    crewSize: 2,
    factors: { height: 0.8, difficulty: 0.85, weather: 0.8 }
  }
};

// Service dependencies - which services must be completed before others
export const SERVICE_DEPENDENCIES: Record<string, string[]> = {
  'GR': ['WC'], // Glass restoration after window cleaning
  'BWS': ['BWP'], // Soft wash after pressure wash (if both selected)
  'PC': ['PWP'], // Parking cleaning after pressure wash
  'DC': ['IW'], // Deck cleaning after interior walls
  'HFS': ['PWF'] // Hard floor scrubbing after pressure wash
};

// Services that can overlap with others
export const OVERLAPPING_SERVICES: Record<string, string[]> = {
  'IW': ['WC', 'GR'], // Interior work can overlap with exterior window work
  'HFS': ['IW'], // Floor scrubbing can overlap with wall cleaning
  'DC': ['PWF'] // Deck cleaning can overlap with flat surface work
};

export class DurationCalculationService {
  calculateServiceDuration(
    service: string,
    measurements: MeasurementEntry[],
    buildingHeight: number = 1,
    difficulty: 'low' | 'medium' | 'high' = 'medium',
    weatherRisk: number = 0.3
  ): ServiceDuration {
    const rate = PRODUCTION_RATES[service];
    if (!rate) {
      return {
        service,
        baseDuration: 1,
        weatherImpact: 0,
        finalDuration: 1,
        confidence: 'low',
        dependencies: SERVICE_DEPENDENCIES[service] || []
      };
    }
    
    // Get total quantity for this service
    const totalQuantity = this.getTotalQuantityForService(service, measurements);
    
    if (totalQuantity === 0) {
      return {
        service,
        baseDuration: 0,
        weatherImpact: 0,
        finalDuration: 0,
        confidence: 'low',
        dependencies: SERVICE_DEPENDENCIES[service] || []
      };
    }
    
    // Base calculation
    let days = totalQuantity / rate.ratePerDay;
    
    // Apply height factor (buildings over 2 stories)
    if (buildingHeight > 2) {
      const heightFactor = Math.pow(rate.factors.height, (buildingHeight - 2) / 2);
      days = days / heightFactor;
    }
    
    // Apply difficulty factor
    const difficultyMultiplier = {
      'low': 1.2,
      'medium': 1.0,
      'high': 0.8
    }[difficulty];
    days = days / (rate.factors.difficulty * difficultyMultiplier);
    
    // Round up to nearest half day minimum 0.5 days
    const baseDuration = Math.max(0.5, Math.ceil(days * 2) / 2);
    
    // Calculate weather impact
    const weatherImpact = this.calculateWeatherImpact(baseDuration, service, weatherRisk);
    
    // Final duration
    const finalDuration = baseDuration + weatherImpact;
    
    // Determine confidence based on measurement quality
    const confidence = this.determineConfidence(totalQuantity, measurements, service);
    
    return {
      service,
      baseDuration,
      weatherImpact,
      finalDuration,
      confidence,
      dependencies: SERVICE_DEPENDENCIES[service] || []
    };
  }
  
  getTotalQuantityForService(service: string, measurements: MeasurementEntry[]): number {
    const relevantMeasurements = this.getRelevantMeasurementsForService(service, measurements);
    const rate = PRODUCTION_RATES[service];
    
    if (!rate) return 0;
    
    switch (rate.unit) {
      case 'windows':
        return relevantMeasurements.reduce((sum, m) => sum + m.quantity, 0);
      case 'spaces':
        return relevantMeasurements.reduce((sum, m) => sum + m.quantity, 0);
      case 'sqft':
      case 'lf':
      default:
        return relevantMeasurements.reduce((sum, m) => sum + m.total, 0);
    }
  }
  
  private getRelevantMeasurementsForService(service: string, measurements: MeasurementEntry[]): MeasurementEntry[] {
    switch (service) {
      case 'WC':
      case 'GR':
        return measurements.filter(m => 
          m.category === 'glass_windows' || 
          m.category === 'glass_doors' || 
          m.category === 'glass_storefront'
        );
      
      case 'BWP':
      case 'BWS':
      case 'HBW':
        return measurements.filter(m => 
          m.category.startsWith('facade_')
        );
      
      case 'PWF':
      case 'HFS':
        return measurements.filter(m => 
          m.category === 'flat_surface'
        );
      
      case 'PC':
        return measurements.filter(m => 
          m.category === 'parking_spaces'
        );
      
      case 'PWP':
        return measurements.filter(m => 
          m.category === 'parking_deck' || 
          m.category === 'parking_spaces'
        );
      
      case 'IW':
        return measurements.filter(m => 
          m.category === 'inner_wall'
        );
      
      case 'DC':
        return measurements.filter(m => 
          m.category === 'ceiling'
        );
      
      default:
        return measurements;
    }
  }
  
  calculateWeatherImpact(baseDuration: number, service: string, weatherRisk: number): number {
    const rate = PRODUCTION_RATES[service];
    if (!rate) return 0;
    
    // Weather risk is 0-1, where 1 is highest risk
    // Weather factor reduces productivity, so higher risk = more days needed
    const weatherMultiplier = weatherRisk * (1 - rate.factors.weather);
    const weatherDays = baseDuration * weatherMultiplier;
    
    // Round to nearest quarter day
    return Math.ceil(weatherDays * 4) / 4;
  }
  
  private determineConfidence(
    totalQuantity: number, 
    measurements: MeasurementEntry[], 
    service: string
  ): 'high' | 'medium' | 'low' {
    const relevantMeasurements = this.getRelevantMeasurementsForService(service, measurements);
    
    if (totalQuantity === 0 || relevantMeasurements.length === 0) {
      return 'low';
    }
    
    // Check measurement quality
    const hasDetailedMeasurements = relevantMeasurements.every(m => 
      m.description && m.description.trim() !== '' && 
      m.width > 0 && 
      (m.height > 0 || m.length > 0) && 
      m.quantity > 0
    );
    
    const hasReasonableValues = relevantMeasurements.every(m => 
      m.total > 0 && m.total < 50000 // Reasonable range
    );
    
    if (hasDetailedMeasurements && hasReasonableValues && relevantMeasurements.length >= 3) {
      return 'high';
    } else if (hasReasonableValues && relevantMeasurements.length >= 1) {
      return 'medium';
    } else {
      return 'low';
    }
  }
  
  scheduleServices(
    serviceDurations: ServiceDuration[],
    startDate: Date,
    allowOverlaps: boolean = true
  ): Timeline {
    const timeline: TimelineEntry[] = [];
    let currentDate = new Date(startDate);
    
    // Sort services by dependency order
    const sortedServices = this.topologicalSort(serviceDurations);
    
    // Track when each service can start based on dependencies
    const serviceStartDates = new Map<string, Date>();
    
    sortedServices.forEach(duration => {
      // Calculate earliest start date based on dependencies
      let earliestStart = new Date(startDate);
      
      duration.dependencies.forEach(depService => {
        const depTimeline = timeline.find(t => t.service === depService);
        if (depTimeline) {
          const depEndDate = new Date(depTimeline.endDate);
          depEndDate.setDate(depEndDate.getDate() + 1); // Add 1 day buffer
          if (depEndDate > earliestStart) {
            earliestStart = depEndDate;
          }
        }
      });
      
      // Check for overlaps if allowed
      let actualStartDate = earliestStart;
      if (!allowOverlaps || !this.canOverlapWithOthers(duration.service)) {
        // Find the latest end date of non-overlapping services
        const nonOverlappingEnd = this.findLatestNonOverlappingEnd(duration.service, timeline);
        if (nonOverlappingEnd > actualStartDate) {
          actualStartDate = nonOverlappingEnd;
        }
      }
      
      // Ensure start date is a business day
      actualStartDate = this.getNextBusinessDay(actualStartDate);
      
      const endDate = this.addBusinessDays(actualStartDate, duration.finalDuration);
      
      const entry: TimelineEntry = {
        service: duration.service,
        startDate: actualStartDate,
        endDate: endDate,
        duration: duration.finalDuration,
        dependencies: duration.dependencies,
        canOverlap: this.canOverlapWithOthers(duration.service),
        isCriticalPath: false // Will be calculated later
      };
      
      timeline.push(entry);
      serviceStartDates.set(duration.service, actualStartDate);
    });
    
    // Calculate critical path
    const criticalPath = this.findCriticalPath(timeline);
    timeline.forEach(entry => {
      entry.isCriticalPath = criticalPath.includes(entry.service);
    });
    
    // Calculate total project duration
    const projectEndDate = timeline.length > 0 ? 
      new Date(Math.max(...timeline.map(t => t.endDate.getTime()))) : 
      startDate;
    
    const totalDuration = this.calculateBusinessDays(startDate, projectEndDate);
    
    return {
      entries: timeline,
      totalDuration,
      criticalPath
    };
  }
  
  private topologicalSort(serviceDurations: ServiceDuration[]): ServiceDuration[] {
    const sorted: ServiceDuration[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (service: ServiceDuration) => {
      if (visiting.has(service.service)) {
        // Circular dependency detected - skip
        return;
      }
      
      if (visited.has(service.service)) {
        return;
      }
      
      visiting.add(service.service);
      
      // Visit dependencies first
      service.dependencies.forEach(depServiceId => {
        const depService = serviceDurations.find(s => s.service === depServiceId);
        if (depService) {
          visit(depService);
        }
      });
      
      visiting.delete(service.service);
      visited.add(service.service);
      sorted.push(service);
    };
    
    serviceDurations.forEach(visit);
    return sorted;
  }
  
  private canOverlapWithOthers(service: string): boolean {
    return Object.keys(OVERLAPPING_SERVICES).includes(service) ||
           Object.values(OVERLAPPING_SERVICES).some(services => services.includes(service));
  }
  
  private findLatestNonOverlappingEnd(service: string, timeline: TimelineEntry[]): Date {
    const overlappingServices = OVERLAPPING_SERVICES[service] || [];
    
    let latestEnd = new Date(0); // Very early date
    
    timeline.forEach(entry => {
      if (!overlappingServices.includes(entry.service) && entry.service !== service) {
        if (entry.endDate > latestEnd) {
          latestEnd = new Date(entry.endDate);
          latestEnd.setDate(latestEnd.getDate() + 1); // Add buffer day
        }
      }
    });
    
    return latestEnd.getTime() === 0 ? new Date() : latestEnd;
  }
  
  private findCriticalPath(timeline: TimelineEntry[]): string[] {
    // Simplified critical path calculation
    // In a real implementation, this would use proper CPM algorithm
    
    if (timeline.length === 0) return [];
    
    // Find the service that ends last
    const lastService = timeline.reduce((latest, current) => 
      current.endDate > latest.endDate ? current : latest
    );
    
    // Trace back through dependencies
    const criticalPath: string[] = [];
    const visited = new Set<string>();
    
    const tracePath = (service: string) => {
      if (visited.has(service)) return;
      visited.add(service);
      
      const serviceEntry = timeline.find(t => t.service === service);
      if (!serviceEntry) return;
      
      criticalPath.unshift(service);
      
      // Find the dependency that ends latest
      let latestDep: string | null = null;
      let latestEndDate = new Date(0);
      
      serviceEntry.dependencies.forEach(depService => {
        const depEntry = timeline.find(t => t.service === depService);
        if (depEntry && depEntry.endDate > latestEndDate) {
          latestEndDate = depEntry.endDate;
          latestDep = depService;
        }
      });
      
      if (latestDep) {
        tracePath(latestDep);
      }
    };
    
    tracePath(lastService.service);
    return criticalPath;
  }
  
  private getNextBusinessDay(date: Date): Date {
    const result = new Date(date);
    while (result.getDay() === 0 || result.getDay() === 6) {
      result.setDate(result.getDate() + 1);
    }
    return result;
  }
  
  private addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let addedDays = 0;
    
    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        addedDays++;
      }
    }
    
    return result;
  }
  
  private calculateBusinessDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }
  
  // Utility method to get all production rates
  getAllProductionRates(): Record<string, ProductionRate> {
    return PRODUCTION_RATES;
  }
  
  // Utility method to get service dependencies
  getServiceDependencies(service: string): string[] {
    return SERVICE_DEPENDENCIES[service] || [];
  }
  
  // Utility method to check if services can overlap
  canServicesOverlap(service1: string, service2: string): boolean {
    const service1Overlaps = OVERLAPPING_SERVICES[service1] || [];
    const service2Overlaps = OVERLAPPING_SERVICES[service2] || [];
    
    return service1Overlaps.includes(service2) || service2Overlaps.includes(service1);
  }
  
  // Method to estimate crew requirements
  estimateCrewRequirements(serviceDurations: ServiceDuration[]): Record<string, number> {
    const crewRequirements: Record<string, number> = {};
    
    serviceDurations.forEach(duration => {
      const rate = PRODUCTION_RATES[duration.service];
      if (rate) {
        crewRequirements[duration.service] = rate.crewSize;
      }
    });
    
    return crewRequirements;
  }
  
  // Method to calculate resource utilization over time
  calculateResourceUtilization(timeline: Timeline): Array<{ date: Date; crewsNeeded: number; services: string[] }> {
    const utilization: Array<{ date: Date; crewsNeeded: number; services: string[] }> = [];
    
    if (timeline.entries.length === 0) return utilization;
    
    const startDate = new Date(Math.min(...timeline.entries.map(e => e.startDate.getTime())));
    const endDate = new Date(Math.max(...timeline.entries.map(e => e.endDate.getTime())));
    
    const current = new Date(startDate);
    while (current <= endDate) {
      if (current.getDay() !== 0 && current.getDay() !== 6) { // Business days only
        const activeServices = timeline.entries.filter(entry => 
          current >= entry.startDate && current <= entry.endDate
        );
        
        const totalCrews = activeServices.reduce((sum, entry) => {
          const rate = PRODUCTION_RATES[entry.service];
          return sum + (rate ? rate.crewSize : 1);
        }, 0);
        
        utilization.push({
          date: new Date(current),
          crewsNeeded: totalCrews,
          services: activeServices.map(s => s.service)
        });
      }
      current.setDate(current.getDate() + 1);
    }
    
    return utilization;
  }
}