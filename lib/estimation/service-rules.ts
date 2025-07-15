export const SERVICE_RULES = {
  // Mandatory service pairs
  mandatoryPairs: {
    'PW': ['WC'], // Pressure Washing ALWAYS includes Window Cleaning
  },
  
  // Service sequence rules
  sequenceRules: [
    { before: 'PWS', after: ['GR', 'FR', 'WC'] },
    { before: 'PW', after: ['WC', 'GR', 'FR'] },
  ],
  
  // Services that work well together
  commonPairs: [
    ['GR', 'FR'], // Glass and Frame often together
  ],
  
  // Independent services
  independentServices: ['PD', 'HD', 'FC', 'GRC'],
  
  // Service priority for scheduling
  serviceOrder: {
    'PWS': { priority: 1, mustBeBefore: ['GR', 'FR', 'WC'] },
    'PW': { priority: 1, mustBeBefore: ['WC', 'GR', 'FR'] },
    'SW': { priority: 2 },
    'GR': { priority: 3, canBeWith: ['FR'] },
    'FR': { priority: 3, canBeWith: ['GR'] },
    'WC': { priority: 4, mustBeAfter: ['PW', 'PWS'] },
    'HD': { priority: 5 },
    'GRC': { priority: 6 },
    'PD': { priority: 7 }, // Can be done anytime
    'FC': { priority: 8 }, // Usually last
  },
  
  validateServiceSelection(services: string[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    autoAddedServices: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const autoAddedServices: string[] = [];
    
    // Check mandatory pairs
    Object.entries(this.mandatoryPairs).forEach(([service, requiredServices]) => {
      if (services.includes(service)) {
        requiredServices.forEach(requiredService => {
          if (!services.includes(requiredService)) {
            autoAddedServices.push(requiredService);
          }
        });
      }
    });
    
    // Validate dependencies (reverse check)
    if (services.includes('WC') && !services.includes('PW') && !services.includes('PWS')) {
      errors.push('Window Cleaning requires either Pressure Washing or Pressure Wash & Seal');
    }
    
    // Check for conflicting services
    if (services.includes('PW') && services.includes('PWS')) {
      warnings.push('Both PW and PWS selected - typically only one is needed');
    }
    
    // Validate service sequences
    this.sequenceRules.forEach(rule => {
      if (services.includes(rule.before)) {
        rule.after.forEach(afterService => {
          if (services.includes(afterService)) {
            // Check if they appear in the wrong order in the array
            const beforeIndex = services.indexOf(rule.before);
            const afterIndex = services.indexOf(afterService);
            if (afterIndex < beforeIndex) {
              warnings.push(`${afterService} should be scheduled after ${rule.before} for optimal results`);
            }
          }
        });
      }
    });
    
    // Check for common service recommendations
    this.commonPairs.forEach(pair => {
      if (services.includes(pair[0]) && !services.includes(pair[1])) {
        warnings.push(`Consider adding ${pair[1]} - commonly done with ${pair[0]}`);
      } else if (services.includes(pair[1]) && !services.includes(pair[0])) {
        warnings.push(`Consider adding ${pair[0]} - commonly done with ${pair[1]}`);
      }
    });
    
    // Validate service order compatibility
    const selectedWithOrder = services.filter(service => this.serviceOrder[service as keyof typeof this.serviceOrder]);
    selectedWithOrder.forEach(service => {
      const serviceRules = this.serviceOrder[service as keyof typeof this.serviceOrder];
      
      // Check mustBeBefore rules
      if ('mustBeBefore' in serviceRules && serviceRules.mustBeBefore) {
        serviceRules.mustBeBefore.forEach(afterService => {
          if (services.includes(afterService)) {
            const servicePriority = serviceRules.priority;
            const afterServicePriority = this.serviceOrder[afterService as keyof typeof this.serviceOrder]?.priority || 99;
            if (servicePriority >= afterServicePriority) {
              warnings.push(`${service} should be scheduled before ${afterService}`);
            }
          }
        });
      }
      
      // Check mustBeAfter rules
      if ('mustBeAfter' in serviceRules && serviceRules.mustBeAfter) {
        serviceRules.mustBeAfter.forEach(beforeService => {
          if (services.includes(beforeService)) {
            const servicePriority = serviceRules.priority;
            const beforeServicePriority = this.serviceOrder[beforeService as keyof typeof this.serviceOrder]?.priority || 1;
            if (servicePriority <= beforeServicePriority) {
              warnings.push(`${service} should be scheduled after ${beforeService}`);
            }
          }
        });
      }
    });
    
    // Check for empty selection
    if (services.length === 0) {
      errors.push('At least one service must be selected');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      autoAddedServices
    };
  }
};