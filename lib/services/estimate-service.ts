// Business logic service layer for estimates

import { supabase } from "@/lib/supabase/client";
import { Database } from "@/types/supabase";
import { withDatabaseRetry } from "@/lib/utils/retry-logic";
import {
  isNotNull,
  safeString,
  safeNumber,
  withDefaultArray,
} from "@/lib/utils/null-safety";
import { invalidateCache } from "@/lib/utils/cache";
import {
  Estimate,
  EstimateService,
  ServiceCalculationResult,
  ServiceFormData,
  ServiceType,
  EstimateStatus,
} from "@/lib/types/estimate-types";
import { publishEstimateEvent } from "@/lib/integrations/webhook-system";
import { OptimizedQueryService } from "@/lib/optimization/database-query-optimization";

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
  static validateEstimate(
    params: EstimateCreationParams,
  ): EstimateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!safeString(params.customerName).trim()) {
      errors.push("Customer name is required");
    }

    if (!safeString(params.customerEmail).trim()) {
      errors.push("Customer email is required");
    } else if (!this.isValidEmail(params.customerEmail)) {
      errors.push("Customer email is invalid");
    }

    if (!safeString(params.customerPhone).trim()) {
      errors.push("Customer phone is required");
    }

    if (!safeString(params.buildingName).trim()) {
      errors.push("Building name is required");
    }

    if (!safeString(params.buildingAddress).trim()) {
      errors.push("Building address is required");
    }

    if (safeNumber(params.buildingHeightStories) < 1) {
      errors.push("Building height must be at least 1 story");
    }

    if (withDefaultArray(params.services).length === 0) {
      errors.push("At least one service is required");
    }

    // Service validation
    params.services.forEach((service, index) => {
      const serviceErrors = this.validateService(service);
      serviceErrors.forEach((error) => {
        errors.push(`Service ${index + 1}: ${error}`);
      });
    });

    // Business logic warnings
    if (safeNumber(params.buildingHeightStories) > 20) {
      warnings.push(
        "High-rise building may require special permits and equipment",
      );
    }

    if (params.services.length > 5) {
      warnings.push("Multiple services may require extended project timeline");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateService(service: EstimateService): string[] {
    const errors: string[] = [];

    if (!safeString(service.serviceType).trim()) {
      errors.push("Service type is required");
    }

    if (!service.calculationResult) {
      errors.push("Calculation result is required");
    } else {
      if (safeNumber(service.calculationResult.area) <= 0) {
        errors.push("Service area must be greater than 0");
      }

      if (safeNumber(service.calculationResult.basePrice) <= 0) {
        errors.push("Service price must be greater than 0");
      }

      if (safeNumber(service.calculationResult.laborHours) <= 0) {
        errors.push("Labor hours must be greater than 0");
      }

      if (safeNumber(service.calculationResult.crewSize) < 1) {
        errors.push("Crew size must be at least 1");
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
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `EST-${year}${month}${day}-${random}`;
  }

  static determineComplexityScore(
    services: EstimateService[],
    buildingHeight: number,
  ): number {
    let score = 0;

    // Base complexity from height
    if (buildingHeight <= 3) score += 1;
    else if (buildingHeight <= 10) score += 2;
    else if (buildingHeight <= 20) score += 3;
    else score += 4;

    // Service complexity
    const serviceComplexity = {
      WC: 1,
      PW: 2,
      SW: 2,
      BF: 3,
      GR: 4,
      FR: 4,
      HD: 3,
      FC: 2,
      GRC: 3,
      PWS: 3,
      "parking-deck": 2,
    };

    services.forEach((service) => {
      const complexity =
        serviceComplexity[
          service.serviceType as keyof typeof serviceComplexity
        ] || 2;
      score += complexity;
    });

    // Multiple services increase complexity
    if (services.length > 1) {
      score += Math.floor(services.length / 2);
    }

    return Math.min(score, 10); // Cap at 10
  }

  static calculateRiskAdjustment(
    services: EstimateService[],
    buildingHeight: number,
  ): number {
    let adjustment = 1.0;

    // Height risk
    if (buildingHeight > 10) adjustment += 0.1;
    if (buildingHeight > 20) adjustment += 0.2;

    // Service risk
    const highRiskServices = [
      "glass-restoration",
      "frame-restoration",
      "biofilm-removal",
    ];
    const hasHighRisk = services.some((s) =>
      highRiskServices.includes(s.serviceType),
    );
    if (hasHighRisk) adjustment += 0.15;

    // Multiple services coordination risk
    if (services.length > 3) adjustment += 0.05;

    return Math.min(adjustment, 1.5); // Cap at 50% increase
  }

  // Database operations
  static async createEstimate(
    params: EstimateCreationParams,
  ): Promise<string | null> {
    const validation = this.validateEstimate(params);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    const result = await withDatabaseRetry(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const estimateNumber = this.generateEstimateNumber();
      const totalPrice = this.calculateEstimateTotal(params.services);
      const complexityScore = this.determineComplexityScore(
        params.services,
        params.buildingHeightStories,
      );
      const riskAdjustment = this.calculateRiskAdjustment(
        params.services,
        params.buildingHeightStories,
      );

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
        status: "draft" as EstimateStatus,
        notes: params.notes,
        complexity_score: complexityScore,
        risk_adjustment: riskAdjustment,
        created_by: user.id,
      };

      const { data: estimate, error: estimateError } = await supabase
        .from("estimates")
        .insert(estimateData)
        .select()
        .single();

      if (estimateError) throw estimateError;

      // Insert services
      if (params.services.length > 0) {
        const servicesData = params.services.map((service) => {
          const result = service.calculationResult;
          if (!result) {
            throw new Error(
              `Service ${service.serviceType} is missing calculation result`,
            );
          }
          return {
            estimate_id: estimate.id,
            service_type: service.serviceType,
            area_sqft: result.area,
            glass_sqft: result.equipment?.type === "glass" ? result.area : null,
            price: result.basePrice,
            labor_hours: result.laborHours,
            setup_hours: result.setupHours || 0,
            rig_hours: result.rigHours || 0,
            total_hours: result.totalHours,
            crew_size: result.crewSize,
            equipment_type: result.equipment?.type,
            equipment_days: result.equipment?.days,
            equipment_cost: result.equipment?.cost,
            calculation_details: {
              breakdown: result.breakdown,
              warnings: result.warnings,
              formData: service.formData,
            },
          };
        });

        const { error: servicesError } = await supabase
          .from("estimate_services")
          .insert(servicesData);

        if (servicesError) throw servicesError;
      }

      // Invalidate cache
      invalidateCache.allEstimates();

      // Publish webhook event for estimate creation
      try {
        await publishEstimateEvent("estimate.created", {
          estimate_id: estimate.id,
          quote_number: estimate.quote_number,
          customer_name: estimate.customer_name,
          customer_email: estimate.customer_email,
          building_name: estimate.building_name,
          building_address: estimate.building_address,
          total_price: estimate.total_price,
          status: estimate.status,
          services: params.services.map((s) => ({
            type: s.serviceType,
            area: s.calculationResult?.area || 0,
            price: s.calculationResult?.basePrice || 0,
          })),
          created_at: estimate.created_at,
          created_by: estimate.created_by,
        });
      } catch (webhookError) {
        // Don't fail the estimate creation if webhook fails
        console.error(
          "Failed to publish estimate.created webhook:",
          webhookError,
        );
      }

      return estimate.id;
    });

    return result.success ? result.data : null;
  }

  static async updateEstimate(
    estimateId: string,
    params: Partial<EstimateCreationParams>,
  ): Promise<boolean> {
    const result = await withDatabaseRetry(async () => {
      const updateData: Database["public"]["Tables"]["estimates"]["Update"] =
        {};

      if (params.customerName !== undefined)
        updateData.customer_name = params.customerName;
      if (params.customerEmail !== undefined)
        updateData.customer_email = params.customerEmail;
      if (params.customerPhone !== undefined)
        updateData.customer_phone = params.customerPhone;
      if (params.companyName !== undefined)
        updateData.company_name = params.companyName;
      if (params.buildingName !== undefined)
        updateData.building_name = params.buildingName;
      if (params.buildingAddress !== undefined)
        updateData.building_address = params.buildingAddress;
      if (params.buildingHeightStories !== undefined)
        updateData.building_height_stories = params.buildingHeightStories;
      if (params.buildingHeightFeet !== undefined)
        updateData.building_height_feet = params.buildingHeightFeet;
      if (params.buildingType !== undefined)
        updateData.building_type = params.buildingType;
      if (params.notes !== undefined) updateData.notes = params.notes;

      // Recalculate totals if services are updated
      if (params.services) {
        const totalPrice = this.calculateEstimateTotal(params.services);
        const complexityScore = this.determineComplexityScore(
          params.services,
          params.buildingHeightStories || 1,
        );
        const riskAdjustment = this.calculateRiskAdjustment(
          params.services,
          params.buildingHeightStories || 1,
        );

        updateData.total_price = totalPrice * riskAdjustment;
        updateData.complexity_score = complexityScore;
        updateData.risk_adjustment = riskAdjustment;
      }

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from("estimates")
        .update(updateData)
        .eq("id", estimateId);

      if (error) throw error;

      // Update services if provided - use optimized upsert instead of delete-recreate
      if (params.services) {
        const servicesData = params.services.map((service) => {
          const result = service.calculationResult;
          if (!result) {
            throw new Error(
              `Service ${service.serviceType} is missing calculation result`,
            );
          }
          return {
            service_type: service.serviceType,
            area_sqft: result.area,
            glass_sqft: result.equipment?.type === "glass" ? result.area : null,
            price: result.basePrice,
            labor_hours: result.laborHours,
            setup_hours: result.setupHours || 0,
            rig_hours: result.rigHours || 0,
            total_hours: result.totalHours,
            crew_size: result.crewSize,
            equipment_type: result.equipment?.type,
            equipment_days: result.equipment?.days,
            equipment_cost: result.equipment?.cost,
            calculation_details: {
              breakdown: result.breakdown,
              warnings: result.warnings,
              formData: service.formData,
            },
          };
        });

        // Use optimized upsert pattern - eliminates delete-recreate locks
        const upsertSuccess =
          await OptimizedQueryService.optimizedUpdateEstimateServices(
            estimateId,
            servicesData,
          );

        if (!upsertSuccess) {
          throw new Error("Failed to update estimate services");
        }
      }

      // Invalidate cache
      invalidateCache.estimate(estimateId);
      invalidateCache.allEstimates();

      // Publish webhook event for estimate update
      try {
        // Get updated estimate data
        const { data: updatedEstimate } = await supabase
          .from("estimates")
          .select("*")
          .eq("id", estimateId)
          .single();

        if (updatedEstimate) {
          await publishEstimateEvent("estimate.updated", {
            estimate_id: updatedEstimate.id,
            quote_number: updatedEstimate.quote_number,
            customer_name: updatedEstimate.customer_name,
            customer_email: updatedEstimate.customer_email,
            building_name: updatedEstimate.building_name,
            building_address: updatedEstimate.building_address,
            total_price: updatedEstimate.total_price,
            status: updatedEstimate.status,
            updated_fields: Object.keys(updateData),
            services: params.services
              ? params.services.map((s) => ({
                  type: s.serviceType,
                  area: s.calculationResult?.area || 0,
                  price: s.calculationResult?.basePrice || 0,
                }))
              : undefined,
            updated_at: updatedEstimate.updated_at,
            updated_by: updatedEstimate.created_by,
          });
        }
      } catch (webhookError) {
        // Don't fail the estimate update if webhook fails
        console.error(
          "Failed to publish estimate.updated webhook:",
          webhookError,
        );
      }

      return true;
    });

    return result.success;
  }

  static async deleteEstimate(estimateId: string): Promise<boolean> {
    const result = await withDatabaseRetry(async () => {
      // Delete services first (foreign key constraint)
      await supabase
        .from("estimate_services")
        .delete()
        .eq("estimate_id", estimateId);

      // Delete estimate
      const { error } = await supabase
        .from("estimates")
        .delete()
        .eq("id", estimateId);

      if (error) throw error;

      // Invalidate cache
      invalidateCache.estimate(estimateId);
      invalidateCache.allEstimates();

      return true;
    });

    return result.success;
  }

  static async changeEstimateStatus(
    estimateId: string,
    status: EstimateStatus,
  ): Promise<boolean> {
    const result = await withDatabaseRetry(async () => {
      const { error } = await supabase
        .from("estimates")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", estimateId);

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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  static formatDuration(hours: number): string {
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    if (hours < 8) return `${Math.round(hours * 10) / 10} hours`;

    const days = Math.floor(hours / 8);
    const remainingHours = hours % 8;

    if (remainingHours === 0) return `${days} day${days > 1 ? "s" : ""}`;
    return `${days} day${days > 1 ? "s" : ""} ${Math.round(remainingHours * 10) / 10} hours`;
  }

  static getServiceDisplayName(serviceType: ServiceType): string {
    const displayNames: Record<ServiceType, string> = {
      WC: "Window Cleaning",
      PW: "Pressure Washing",
      SW: "Soft Washing",
      BF: "Biofilm Removal",
      GR: "Glass Restoration",
      FR: "Frame Restoration",
      HD: "High Dusting",
      FC: "Final Clean",
      GRC: "Granite Reconditioning",
      PWS: "Pressure Wash & Seal",
      PD: "Parking Deck",
    };

    return displayNames[serviceType] || serviceType;
  }

  /**
   * Get estimate by ID with full details
   */
  static async getEstimateById(estimateId: string): Promise<Estimate | null> {
    try {
      const result = await withDatabaseRetry(async () => {
        const { data: estimate, error } = await supabase
          .from("estimates")
          .select(
            `
            *,
            estimate_services (
              id,
              service_type,
              area,
              glass_area,
              price,
              labor_hours,
              setup_hours,
              rig_hours,
              total_hours,
              crew_size,
              equipment_type,
              equipment_days,
              equipment_cost,
              notes,
              created_at,
              updated_at
            )
          `,
          )
          .eq("id", estimateId)
          .single();

        if (error) {
          console.error("Database error fetching estimate:", error);
          throw new Error(`Failed to fetch estimate: ${error.message}`);
        }

        return estimate;
      });

      if (!result.success || !result.data) {
        return null;
      }

      const estimateData = result.data;

      // Transform database record to Estimate type
      const estimate: Estimate = {
        id: estimateData.id,
        customerName: safeString(estimateData.customer_name),
        customerEmail: safeString(estimateData.customer_email),
        customerPhone: safeString(estimateData.customer_phone),
        companyName: safeString(estimateData.company_name),
        buildingName: safeString(estimateData.building_name),
        buildingAddress: safeString(estimateData.building_address),
        buildingType: safeString(estimateData.building_type),
        buildingHeightStories: safeNumber(estimateData.building_height_stories),
        buildingHeightFeet: safeNumber(estimateData.building_height_feet),
        notes: safeString(estimateData.notes),
        status: (estimateData.status as EstimateStatus) || "draft",
        services: withDefaultArray(estimateData.estimate_services).map(
          (service: any) => ({
            id: service.id,
            serviceType: service.service_type as ServiceType,
            description: this.getServiceDisplayName(
              service.service_type as ServiceType,
            ),
            quantity: 1,
            unit: "sqft",
            unitPrice: safeNumber(service.price),
            totalPrice: safeNumber(service.price),
            duration: safeNumber(service.total_hours),
            dependencies: [],
            area: safeNumber(service.area),
            glassArea: safeNumber(service.glass_area),
            price: safeNumber(service.price),
            laborHours: safeNumber(service.labor_hours),
            setupHours: safeNumber(service.setup_hours),
            rigHours: safeNumber(service.rig_hours),
            totalHours: safeNumber(service.total_hours),
            crewSize: safeNumber(service.crew_size),
            equipmentType: safeString(service.equipment_type),
            equipmentDays: safeNumber(service.equipment_days),
            equipmentCost: safeNumber(service.equipment_cost),
            notes: safeString(service.notes),
            createdAt: service.created_at,
            updatedAt: service.updated_at,
          }),
        ),
        summary: {
          totalPrice: safeNumber(estimateData.total_price) || 0,
          totalTime: 0, // Calculate from services
          totalArea: 0, // Calculate from services
          serviceCount: withDefaultArray(estimateData.estimate_services).length,
          complexityScore: safeNumber(estimateData.complexity_score) || 1,
        },
        timeline: {
          startDate: new Date(),
          endDate: new Date(),
          totalDuration: 1,
          phases: [],
          milestones: [],
          criticalPath: [],
        },
        terms: {
          paymentSchedule: [],
          warranties: [],
          limitations: [],
          changeOrderPolicy: "All changes must be approved in writing",
          cancellationPolicy: "48-hour notice required",
          insuranceRequirements: ["General liability coverage"],
        },
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        approval: {
          status: "pending" as const,
        },
        createdAt: estimateData.created_at,
        updatedAt: estimateData.updated_at,
      };

      return estimate;
    } catch (error) {
      console.error("Error in getEstimateById:", error);
      throw error;
    }
  }

  /**
   * Get all estimates with filtering and pagination
   */
  static async getAllEstimates(
    options: {
      limit?: number;
      offset?: number;
      status?: EstimateStatus;
      search?: string;
      userId?: string;
    } = {},
  ): Promise<{
    estimates: Estimate[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { limit = 50, offset = 0, status, search, userId } = options;

      const result = await withDatabaseRetry(async () => {
        let query = supabase.from("estimates").select(
          `
            *,
            estimate_services (
              id,
              service_type,
              area,
              glass_area,
              price,
              labor_hours,
              setup_hours,
              rig_hours,
              total_hours,
              crew_size,
              equipment_type,
              equipment_days,
              equipment_cost,
              notes,
              created_at,
              updated_at
            )
          `,
          { count: "exact" },
        );

        // Apply filters
        if (status) {
          query = query.eq("status", status);
        }

        if (userId) {
          query = query.eq("user_id", userId);
        }

        if (search) {
          query = query.or(
            `customer_name.ilike.%${search}%,building_name.ilike.%${search}%,customer_email.ilike.%${search}%`,
          );
        }

        // Apply pagination and ordering
        query = query
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        const { data: estimates, error, count } = await query;

        if (error) {
          console.error("Database error fetching estimates:", error);
          throw new Error(`Failed to fetch estimates: ${error.message}`);
        }

        return { estimates: estimates || [], total: count || 0 };
      });

      if (!result.success || !result.data) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : result.error?.message || "Failed to fetch estimates",
        );
      }

      const { estimates: estimateData, total } = result.data;

      // Transform database records to Estimate types
      const estimates: Estimate[] = estimateData.map((estimateData: any) => ({
        id: estimateData.id,
        customerName: safeString(estimateData.customer_name),
        customerEmail: safeString(estimateData.customer_email),
        customerPhone: safeString(estimateData.customer_phone),
        companyName: safeString(estimateData.company_name),
        buildingName: safeString(estimateData.building_name),
        buildingAddress: safeString(estimateData.building_address),
        buildingType: safeString(estimateData.building_type),
        buildingHeightStories: safeNumber(estimateData.building_height_stories),
        buildingHeightFeet: safeNumber(estimateData.building_height_feet),
        notes: safeString(estimateData.notes),
        status: (estimateData.status as EstimateStatus) || "draft",
        services: withDefaultArray(estimateData.estimate_services).map(
          (service: any) => ({
            id: service.id,
            serviceType: service.service_type as ServiceType,
            description: this.getServiceDisplayName(
              service.service_type as ServiceType,
            ),
            quantity: 1,
            unit: "sqft",
            unitPrice: safeNumber(service.price),
            totalPrice: safeNumber(service.price),
            duration: safeNumber(service.total_hours),
            dependencies: [],
            area: safeNumber(service.area),
            glassArea: safeNumber(service.glass_area),
            price: safeNumber(service.price),
            laborHours: safeNumber(service.labor_hours),
            setupHours: safeNumber(service.setup_hours),
            rigHours: safeNumber(service.rig_hours),
            totalHours: safeNumber(service.total_hours),
            crewSize: safeNumber(service.crew_size),
            equipmentType: safeString(service.equipment_type),
            equipmentDays: safeNumber(service.equipment_days),
            equipmentCost: safeNumber(service.equipment_cost),
            notes: safeString(service.notes),
            createdAt: service.created_at,
            updatedAt: service.updated_at,
          }),
        ),
        summary: {
          totalPrice: safeNumber(estimateData.total_price) || 0,
          totalTime: 0, // Calculate from services
          totalArea: 0, // Calculate from services
          serviceCount: withDefaultArray(estimateData.estimate_services).length,
          complexityScore: safeNumber(estimateData.complexity_score) || 1,
        },
        timeline: {
          startDate: new Date(),
          endDate: new Date(),
          totalDuration: 1,
          phases: [],
          milestones: [],
          criticalPath: [],
        },
        terms: {
          paymentSchedule: [],
          warranties: [],
          limitations: [],
          changeOrderPolicy: "All changes must be approved in writing",
          cancellationPolicy: "48-hour notice required",
          insuranceRequirements: ["General liability coverage"],
        },
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        approval: {
          status: "pending" as const,
        },
        createdAt: estimateData.created_at,
        updatedAt: estimateData.updated_at,
      }));

      return {
        estimates,
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error("Error in getAllEstimates:", error);
      throw error;
    }
  }
}

export default EstimateBusinessService;
