// Business logic service layer for estimates

import { supabase } from '@/lib/supabase/client';
import { withDatabaseRetry } from '@/lib/utils/retry-logic';
import { isNotNull, safeString, safeNumber, withDefaultArray } from '@/lib/utils/null-safety';
import { invalidateCache } from '@/lib/utils/cache';
import {
  Estimate,
  EstimateService,
  ServiceCalculationResult,
  ServiceFormData,
  ServiceType,
  EstimateStatus
} from '@/lib/types/estimate-types';

export interface EstimateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EstimateCreationParams {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName?: string;
  buildingName: string;
  buildingAddress: string;
  buildingHeightStories: number;
  buildingHeightFeet?: number;
  buildingType?: string;
  notes?: string;
  services: EstimateService[];
}

export class EstimateBusinessService {
  // Validation methods
  static validateEstimate(params: EstimateCreationParams): EstimateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!safeString(params.customerName).trim()) {
      errors.push('Customer name is required');
    }

    if (!safeString(params.customerEmail).trim()) {
      errors.push('Customer email is required');
    } else if (!this.isValidEmail(params.customerEmail)) {
      errors.push('Customer email is invalid');
    }

    if (!safeString(params.customerPhone).trim()) {
      errors.push('Customer phone is required');
    }

    if (!safeString(params.buildingName).trim()) {
      errors.push('Building name is required');
    }

    if (!safeString(params.buildingAddress).trim()) {
      errors.push('Building address is required');
    }

    if (safeNumber(params.buildingHeightStories) < 1) {
      errors.push('Building height must be at least 1 story');
    }

    if (withDefaultArray(params.services).length === 0) {
      errors.push('At least one service is required');
    }

    // Service validation
    params.services.forEach((service, index) => {
      const serviceErrors = this.validateService(service);
      serviceErrors.forEach(error => {
        errors.push(`Service ${index + 1}: ${error}`);
      });
    });

    // Business logic warnings
    if (safeNumber(params.buildingHeightStories) > 20) {
      warnings.push('High-rise building may require special permits and equipment');
    }

    if (params.services.length > 5) {
      warnings.push('Multiple services may require extended project timeline');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateService(service: EstimateService): string[] {
    const errors: string[] = [];

    if (!safeString(service.serviceType).trim()) {
      errors.push('Service type is required');
    }

    if (!service.calculationResult) {
      errors.push('Calculation result is required');
    } else {
      if (safeNumber(service.calculationResult.area) <= 0) {
        errors.push('Service area must be greater than 0');
      }

      if (safeNumber(service.calculationResult.basePrice) <= 0) {
        errors.push('Service price must be greater than 0');
      }

      if (safeNumber(service.calculationResult.laborHours) <= 0) {
        errors.push('Labor hours must be greater than 0');
      }

      if (safeNumber(service.calculationResult.crewSize) < 1) {
        errors.push('Crew size must be at least 1');
      }
    }

    return errors;
  }

  // Business logic methods
  static calculateEstimateTotal(services: EstimateService[]): number {
    return withDefaultArray(services).reduce((total, service) => {
      return total + safeNumber(service.calculationResult?.basePrice);
    }, 0);
  }

  static calculateEstimateDuration(services: EstimateService[]): number {
    return withDefaultArray(services).reduce((total, service) => {
      return Math.max(total, safeNumber(service.calculationResult?.totalHours));
    }, 0);
  }

  static generateEstimateNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `EST-${year}${month}${day}-${random}`;
  }

  static determineComplexityScore(services: EstimateService[], buildingHeight: number): number {
    let score = 0;
    
    // Base complexity from height
    if (buildingHeight <= 3) score += 1;
    else if (buildingHeight <= 10) score += 2;
    else if (buildingHeight <= 20) score += 3;
    else score += 4;

    // Service complexity
    const serviceComplexity = {
      'window-cleaning': 1,
      'pressure-washing': 2,
      'soft-washing': 2,
      'biofilm-removal': 3,
      'glass-restoration': 4,
      'frame-restoration': 4,
      'high-dusting': 3,
      'final-clean': 2,
      'granite-reconditioning': 3,
      'pressure-wash-seal': 3,
      'parking-deck': 2
    };

    services.forEach(service => {
      const complexity = serviceComplexity[service.serviceType as keyof typeof serviceComplexity] || 2;
      score += complexity;
    });

    // Multiple services increase complexity
    if (services.length > 1) {
      score += Math.floor(services.length / 2);
    }

    return Math.min(score, 10); // Cap at 10
  }

  static calculateRiskAdjustment(services: EstimateService[], buildingHeight: number): number {
    let adjustment = 1.0;

    // Height risk
    if (buildingHeight > 10) adjustment += 0.1;
    if (buildingHeight > 20) adjustment += 0.2;

    // Service risk
    const highRiskServices = ['glass-restoration', 'frame-restoration', 'biofilm-removal'];
    const hasHighRisk = services.some(s => highRiskServices.includes(s.serviceType));
    if (hasHighRisk) adjustment += 0.15;

    // Multiple services coordination risk
    if (services.length > 3) adjustment += 0.05;

    return Math.min(adjustment, 1.5); // Cap at 50% increase
  }

  // Database operations
  static async createEstimate(params: EstimateCreationParams): Promise<string | null> {
    const validation = this.validateEstimate(params);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const result = await withDatabaseRetry(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const estimateNumber = this.generateEstimateNumber();
      const totalPrice = this.calculateEstimateTotal(params.services);
      const complexityScore = this.determineComplexityScore(params.services, params.buildingHeightStories);
      const riskAdjustment = this.calculateRiskAdjustment(params.services, params.buildingHeightStories);

      const estimateData = {
        quote_number: estimateNumber,
        customer_name: params.customerName,
        customer_email: params.customerEmail,
        customer_phone: params.customerPhone,
        company_name: params.companyName,
        building_name: params.buildingName,
        building_address: params.buildingAddress,
        building_height_stories: params.buildingHeightStories,
        building_height_feet: params.buildingHeightFeet,
        building_type: params.buildingType,
        total_price: totalPrice * riskAdjustment,
        status: 'draft' as EstimateStatus,
        notes: params.notes,
        complexity_score: complexityScore,
        risk_adjustment: riskAdjustment,
        created_by: user.id
      };

      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .insert(estimateData)
        .select()
        .single();

      if (estimateError) throw estimateError;

      // Insert services
      if (params.services.length > 0) {
        const servicesData = params.services.map(service => ({
          estimate_id: estimate.id,
          service_type: service.serviceType,
          area_sqft: service.calculationResult.area,
          glass_sqft: service.calculationResult.equipment?.type === 'glass' ? service.calculationResult.area : null,
          price: service.calculationResult.basePrice,
          labor_hours: service.calculationResult.laborHours,
          setup_hours: service.calculationResult.setupHours || 0,
          rig_hours: service.calculationResult.rigHours || 0,
          total_hours: service.calculationResult.totalHours,
          crew_size: service.calculationResult.crewSize,
          equipment_type: service.calculationResult.equipment?.type,
          equipment_days: service.calculationResult.equipment?.days,
          equipment_cost: service.calculationResult.equipment?.cost,
          calculation_details: {
            breakdown: service.calculationResult.breakdown,
            warnings: service.calculationResult.warnings,
            formData: service.formData
          }
        }));

        const { error: servicesError } = await supabase
          .from('estimate_services')
          .insert(servicesData);

        if (servicesError) throw servicesError;
      }

      // Invalidate cache
      invalidateCache.allEstimates();

      return estimate.id;
    });

    return result.success ? result.data : null;
  }

  static async updateEstimate(estimateId: string, params: Partial<EstimateCreationParams>): Promise<boolean> {
    const result = await withDatabaseRetry(async () => {
      const updateData: any = {};

      if (params.customerName !== undefined) updateData.customer_name = params.customerName;
      if (params.customerEmail !== undefined) updateData.customer_email = params.customerEmail;
      if (params.customerPhone !== undefined) updateData.customer_phone = params.customerPhone;
      if (params.companyName !== undefined) updateData.company_name = params.companyName;
      if (params.buildingName !== undefined) updateData.building_name = params.buildingName;
      if (params.buildingAddress !== undefined) updateData.building_address = params.buildingAddress;
      if (params.buildingHeightStories !== undefined) updateData.building_height_stories = params.buildingHeightStories;
      if (params.buildingHeightFeet !== undefined) updateData.building_height_feet = params.buildingHeightFeet;
      if (params.buildingType !== undefined) updateData.building_type = params.buildingType;
      if (params.notes !== undefined) updateData.notes = params.notes;

      // Recalculate totals if services are updated
      if (params.services) {
        const totalPrice = this.calculateEstimateTotal(params.services);
        const complexityScore = this.determineComplexityScore(params.services, params.buildingHeightStories || 1);
        const riskAdjustment = this.calculateRiskAdjustment(params.services, params.buildingHeightStories || 1);
        
        updateData.total_price = totalPrice * riskAdjustment;
        updateData.complexity_score = complexityScore;
        updateData.risk_adjustment = riskAdjustment;
      }

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('estimates')
        .update(updateData)
        .eq('id', estimateId);

      if (error) throw error;

      // Update services if provided
      if (params.services) {
        // Delete existing services
        await supabase
          .from('estimate_services')
          .delete()
          .eq('estimate_id', estimateId);

        // Insert new services
        if (params.services.length > 0) {
          const servicesData = params.services.map(service => ({
            estimate_id: estimateId,
            service_type: service.serviceType,
            area_sqft: service.calculationResult.area,
            glass_sqft: service.calculationResult.equipment?.type === 'glass' ? service.calculationResult.area : null,
            price: service.calculationResult.basePrice,
            labor_hours: service.calculationResult.laborHours,
            setup_hours: service.calculationResult.setupHours || 0,
            rig_hours: service.calculationResult.rigHours || 0,
            total_hours: service.calculationResult.totalHours,
            crew_size: service.calculationResult.crewSize,
            equipment_type: service.calculationResult.equipment?.type,
            equipment_days: service.calculationResult.equipment?.days,
            equipment_cost: service.calculationResult.equipment?.cost,
            calculation_details: {
              breakdown: service.calculationResult.breakdown,
              warnings: service.calculationResult.warnings,
              formData: service.formData
            }
          }));

          const { error: servicesError } = await supabase
            .from('estimate_services')
            .insert(servicesData);

          if (servicesError) throw servicesError;
        }
      }

      // Invalidate cache
      invalidateCache.estimate(estimateId);
      invalidateCache.allEstimates();

      return true;
    });

    return result.success;
  }

  static async deleteEstimate(estimateId: string): Promise<boolean> {
    const result = await withDatabaseRetry(async () => {
      // Delete services first (foreign key constraint)
      await supabase
        .from('estimate_services')
        .delete()
        .eq('estimate_id', estimateId);

      // Delete estimate
      const { error } = await supabase
        .from('estimates')
        .delete()
        .eq('id', estimateId);

      if (error) throw error;

      // Invalidate cache
      invalidateCache.estimate(estimateId);
      invalidateCache.allEstimates();

      return true;
    });

    return result.success;
  }

  static async changeEstimateStatus(estimateId: string, status: EstimateStatus): Promise<boolean> {
    const result = await withDatabaseRetry(async () => {
      const { error } = await supabase
        .from('estimates')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', estimateId);

      if (error) throw error;

      // Invalidate cache
      invalidateCache.estimate(estimateId);
      invalidateCache.allEstimates();

      return true;
    });

    return result.success;
  }

  // Utility methods
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  static formatDuration(hours: number): string {
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    if (hours < 8) return `${Math.round(hours * 10) / 10} hours`;
    
    const days = Math.floor(hours / 8);
    const remainingHours = hours % 8;
    
    if (remainingHours === 0) return `${days} day${days > 1 ? 's' : ''}`;
    return `${days} day${days > 1 ? 's' : ''} ${Math.round(remainingHours * 10) / 10} hours`;
  }

  static getServiceDisplayName(serviceType: ServiceType): string {
    const displayNames: Record<ServiceType, string> = {
      'window-cleaning': 'Window Cleaning',
      'pressure-washing': 'Pressure Washing',
      'soft-washing': 'Soft Washing',
      'biofilm-removal': 'Biofilm Removal',
      'glass-restoration': 'Glass Restoration',
      'frame-restoration': 'Frame Restoration',
      'high-dusting': 'High Dusting',
      'final-clean': 'Final Clean',
      'granite-reconditioning': 'Granite Reconditioning',
      'pressure-wash-seal': 'Pressure Wash & Seal',
      'parking-deck': 'Parking Deck Cleaning'
    };

    return displayNames[serviceType] || serviceType;
  }
}

export default EstimateBusinessService;