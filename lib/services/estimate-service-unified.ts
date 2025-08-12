/**
 * Unified Estimate Service
 *
 * Consolidates functionality from:
 * - estimate-service.ts (business logic)
 * - estimate-crud-service.ts (CRUD operations)
 * - estimate-validation-service.ts (validation logic)
 *
 * Provides comprehensive estimate management with:
 * - CRUD operations
 * - Business logic validation
 * - Status management
 * - Event publishing
 */

import { createClient } from "@/lib/supabase/universal-client";
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
  unifiedCache,
  CachingUtils,
} from "@/lib/optimization/cache-coordinator";
import {
  Estimate,
  EstimateService as EstimateServiceType,
  ServiceCalculationResult,
  ServiceFormData,
  EstimateStatus,
} from "@/lib/types/estimate-types";

// Temporary workaround for ServiceType - define inline to fix build
type ServiceType =
  | "WC" // Window Cleaning
  | "PW" // Pressure Washing
  | "SW" // Soft Washing
  | "BF" // Biofilm Removal
  | "GR" // Glass Restoration
  | "FR" // Frame Restoration
  | "HD" // High Dusting
  | "FC" // Final Clean
  | "GRC" // Granite Reconditioning
  | "PWS" // Pressure Wash & Seal
  | "PD" // Parking Deck
  | "GC"; // General Cleaning
import { publishEstimateEvent } from "@/lib/integrations/webhook-system";
import { OptimizedQueryService } from "@/lib/optimization/database-query-optimization";
import { BaseService, ServiceConfig } from "./core/base-service";
import {
  ValidationError,
  DatabaseError,
  AuthError,
  BusinessLogicError,
  NotFoundError,
} from "./core/errors";

// Types and Interfaces
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
  services: EstimateServiceType[];
}

export interface EstimateUpdateParams {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  companyName?: string;
  buildingName?: string;
  buildingAddress?: string;
  buildingHeightStories?: number;
  buildingHeightFeet?: number;
  buildingType?: string;
  notes?: string;
  status?: EstimateStatus;
  services?: EstimateServiceType[];
}

export interface EstimateListOptions {
  limit?: number;
  offset?: number;
  status?: EstimateStatus;
  sortBy?: "created_at" | "updated_at" | "total_price";
  sortOrder?: "asc" | "desc";
  search?: string;
}

/**
 * Unified EstimateService class extending BaseService
 * Provides all estimate-related functionality in a single service
 */
export class EstimateService extends BaseService {
  constructor() {
    super({
      serviceName: "EstimateService",
      enableCaching: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      enableRetry: true,
      maxRetries: 3,
      enableLogging: true,
    });
  }

  // ========================================
  // VALIDATION METHODS
  // ========================================

  /**
   * Validate complete estimate data
   */
  validateEstimate(params: EstimateCreationParams): EstimateValidationResult {
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
    } else if (!this.isValidPhoneNumber(params.customerPhone)) {
      warnings.push("Customer phone format may be invalid");
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

    // Business logic validation
    if (params.services.length > 10) {
      warnings.push(
        "Large number of services may require extended processing time",
      );
    }

    // Building height validation
    if (params.buildingHeightStories > 50) {
      warnings.push(
        "High-rise buildings may require special equipment and permits",
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate individual service
   */
  private validateService(service: EstimateServiceType): string[] {
    const errors: string[] = [];

    if (
      !service.serviceType ||
      !Object.values(ServiceType).includes(service.serviceType)
    ) {
      errors.push("Invalid service type");
    }

    if (!service.description?.trim()) {
      errors.push("Service description is required");
    }

    if (safeNumber(service.unitPrice) <= 0) {
      errors.push("Service unit price must be greater than 0");
    }

    if (safeNumber(service.quantity) <= 0) {
      errors.push("Service quantity must be greater than 0");
    }

    return errors;
  }

  /**
   * Email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Phone number validation
   */
  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""));
  }

  // ========================================
  // BUSINESS LOGIC METHODS
  // ========================================

  /**
   * Generate unique estimate number
   */
  public generateEstimateNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `EST-${timestamp}-${random}`;
  }

  /**
   * Calculate total estimate price
   */
  public calculateEstimateTotal(services: EstimateServiceType[]): number {
    return services.reduce((total, service) => {
      const serviceTotal =
        safeNumber(service.unitPrice) * safeNumber(service.quantity);
      const markup = safeNumber(service.markup) || 0;
      const margin = safeNumber(service.margin) || 0;

      const withMarkup = serviceTotal * (1 + markup / 100);
      const withMargin = withMarkup * (1 + margin / 100);

      return total + withMargin;
    }, 0);
  }

  /**
   * Calculate complexity score
   */
  public determineComplexityScore(
    services: EstimateServiceType[],
    buildingHeight: number,
  ): number {
    let score = 0;

    // Base complexity from service types
    const uniqueServiceTypes = new Set(services.map((s) => s.serviceType));
    score += uniqueServiceTypes.size * 0.2;

    // Height complexity
    if (buildingHeight > 10) score += 0.3;
    if (buildingHeight > 20) score += 0.2;
    if (buildingHeight > 30) score += 0.2;

    // Service quantity complexity
    const totalQuantity = services.reduce(
      (sum, s) => sum + safeNumber(s.quantity),
      0,
    );
    if (totalQuantity > 1000) score += 0.2;
    if (totalQuantity > 5000) score += 0.1;

    return Math.min(1.0, score); // Cap at 1.0
  }

  /**
   * Calculate risk adjustment factor
   */
  public calculateRiskAdjustment(
    services: EstimateServiceType[],
    buildingHeight: number,
  ): number {
    let adjustment = 1.0;

    // Height risk
    if (buildingHeight > 10) adjustment += 0.05;
    if (buildingHeight > 20) adjustment += 0.05;
    if (buildingHeight > 30) adjustment += 0.1;

    // Service complexity risk
    const complexServiceTypes = [
      ServiceType.GLASS_RESTORATION,
      ServiceType.HIGH_DUSTING,
    ];
    const hasComplexServices = services.some((s) =>
      complexServiceTypes.includes(s.serviceType),
    );
    if (hasComplexServices) adjustment += 0.03;

    // Large project risk
    const totalValue = this.calculateEstimateTotal(services);
    if (totalValue > 50000) adjustment += 0.02;
    if (totalValue > 100000) adjustment += 0.03;

    return Math.min(1.2, adjustment); // Cap at 20% increase
  }

  // ========================================
  // CRUD OPERATIONS
  // ========================================

  /**
   * Create a new estimate with services
   */
  async createEstimate(params: EstimateCreationParams): Promise<string | null> {
    return await this.withDatabase(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new AuthError("User not authenticated");
      }

      // Validate estimate data
      const validation = this.validateEstimate(params);
      if (!validation.isValid) {
        throw new ValidationError(
          "Estimate validation failed",
          validation.errors,
        );
      }

      // Generate business logic values
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

      // Prepare estimate data
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

      // Insert estimate
      const { data: estimate, error: estimateError } = await supabase
        .from("estimates")
        .insert(estimateData)
        .select()
        .single();

      if (estimateError) {
        throw new DatabaseError("Failed to create estimate", estimateError);
      }

      // Insert services
      const serviceData = params.services.map((service) => ({
        estimate_id: estimate.id,
        service_type: service.serviceType,
        description: service.description,
        unit_price: service.unitPrice,
        quantity: service.quantity,
        total_price: service.unitPrice * service.quantity,
        markup: service.markup || 0,
        margin: service.margin || 0,
        notes: service.notes,
      }));

      const { error: servicesError } = await supabase
        .from("estimate_services")
        .insert(serviceData);

      if (servicesError) {
        // Rollback estimate creation
        await supabase.from("estimates").delete().eq("id", estimate.id);
        throw new DatabaseError(
          "Failed to create estimate services",
          servicesError,
        );
      }

      // Clear unified cache
      await CachingUtils.estimates.invalidate();

      // Publish event
      try {
        await publishEstimateEvent({
          type: "estimate.created",
          estimateId: estimate.id,
          userId: user.id,
          data: estimate,
        });
      } catch (error) {
        this.logger.warn("Failed to publish estimate created event", error);
      }

      this.logger.info("Estimate created successfully", {
        estimateId: estimate.id,
        estimateNumber,
      });

      return estimate.id;
    }, "createEstimate");
  }

  /**
   * Get estimate by ID with services
   */
  async getEstimate(estimateId: string): Promise<Estimate | null> {
    // Check unified cache first
    const cached = await CachingUtils.estimates.get(estimateId);
    if (cached) return cached;

    return await this.withDatabase(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new AuthError("User not authenticated");
      }

      // Get estimate with services
      const { data: estimate, error: estimateError } = await supabase
        .from("estimates")
        .select(
          `
          *,
          estimate_services (*)
        `,
        )
        .eq("id", estimateId)
        .eq("created_by", user.id)
        .single();

      if (estimateError) {
        if (estimateError.code === "PGRST116") {
          throw new NotFoundError("Estimate not found");
        }
        throw new DatabaseError("Failed to get estimate", estimateError);
      }

      // Cache the result with unified cache
      await CachingUtils.estimates.set(estimateId, estimate);

      return estimate;
    }, "getEstimate");
  }

  /**
   * List estimates with pagination and filtering
   */
  async listEstimates(options: EstimateListOptions = {}): Promise<{
    estimates: Estimate[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      limit = 20,
      offset = 0,
      status,
      sortBy = "created_at",
      sortOrder = "desc",
      search,
    } = options;

    // Check cache
    const cacheKey = this.generateCacheKey(
      "estimates",
      status,
      sortBy,
      sortOrder,
      search,
      limit,
      offset,
    );
    const cached = this.getCached<{
      estimates: Estimate[];
      total: number;
      hasMore: boolean;
    }>(cacheKey);
    if (cached) return cached;

    return await this.withDatabase(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new AuthError("User not authenticated");
      }

      // Build query
      let query = supabase
        .from("estimates")
        .select(
          `
          *,
          estimate_services (*)
        `,
          { count: "exact" },
        )
        .eq("created_by", user.id);

      // Apply filters
      if (status) {
        query = query.eq("status", status);
      }

      if (search) {
        query = query.or(
          `customer_name.ilike.%${search}%,building_name.ilike.%${search}%,quote_number.ilike.%${search}%`,
        );
      }

      // Apply sorting and pagination
      query = query
        .order(sortBy, { ascending: sortOrder === "asc" })
        .range(offset, offset + limit - 1);

      const { data: estimates, error, count } = await query;

      if (error) {
        throw new DatabaseError("Failed to list estimates", error);
      }

      const result = {
        estimates: estimates || [],
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      };

      // Cache the result
      this.setCached(cacheKey, result, 2 * 60 * 1000); // 2 minutes for lists

      return result;
    }, "listEstimates");
  }

  /**
   * Update estimate
   */
  async updateEstimate(
    estimateId: string,
    params: EstimateUpdateParams,
  ): Promise<boolean> {
    return await this.withDatabase(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new AuthError("User not authenticated");
      }

      // Validate update params if services are included
      if (params.services) {
        const validation = this.validateEstimate({
          ...params,
          customerName: params.customerName || "",
          customerEmail: params.customerEmail || "",
          customerPhone: params.customerPhone || "",
          buildingName: params.buildingName || "",
          buildingAddress: params.buildingAddress || "",
          buildingHeightStories: params.buildingHeightStories || 1,
          services: params.services,
        } as EstimateCreationParams);

        if (!validation.isValid) {
          throw new ValidationError(
            "Update validation failed",
            validation.errors,
          );
        }
      }

      // Update estimate
      const updateData: any = {};
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
      if (params.status !== undefined) updateData.status = params.status;

      // Recalculate pricing if services are updated
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

      const { error: estimateError } = await supabase
        .from("estimates")
        .update(updateData)
        .eq("id", estimateId)
        .eq("created_by", user.id);

      if (estimateError) {
        throw new DatabaseError("Failed to update estimate", estimateError);
      }

      // Update services if provided
      if (params.services) {
        // Delete existing services
        const { error: deleteError } = await supabase
          .from("estimate_services")
          .delete()
          .eq("estimate_id", estimateId);

        if (deleteError) {
          throw new DatabaseError("Failed to delete old services", deleteError);
        }

        // Insert new services
        const serviceData = params.services.map((service) => ({
          estimate_id: estimateId,
          service_type: service.serviceType,
          description: service.description,
          unit_price: service.unitPrice,
          quantity: service.quantity,
          total_price: service.unitPrice * service.quantity,
          markup: service.markup || 0,
          margin: service.margin || 0,
          notes: service.notes,
        }));

        const { error: servicesError } = await supabase
          .from("estimate_services")
          .insert(serviceData);

        if (servicesError) {
          throw new DatabaseError(
            "Failed to create updated services",
            servicesError,
          );
        }
      }

      // Clear cache
      this.clearCache("estimates");
      this.clearCache(estimateId);

      // Publish event
      try {
        await publishEstimateEvent({
          type: "estimate.updated",
          estimateId,
          userId: user.id,
          data: updateData,
        });
      } catch (error) {
        this.logger.warn("Failed to publish estimate updated event", error);
      }

      this.logger.info("Estimate updated successfully", { estimateId });

      return true;
    }, "updateEstimate");
  }

  /**
   * Delete estimate
   */
  async deleteEstimate(estimateId: string): Promise<boolean> {
    return await this.withDatabase(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new AuthError("User not authenticated");
      }

      // Delete estimate (services will be deleted via cascade)
      const { error } = await supabase
        .from("estimates")
        .delete()
        .eq("id", estimateId)
        .eq("created_by", user.id);

      if (error) {
        throw new DatabaseError("Failed to delete estimate", error);
      }

      // Clear cache
      this.clearCache("estimates");
      this.clearCache(estimateId);

      // Publish event
      try {
        await publishEstimateEvent({
          type: "estimate.deleted",
          estimateId,
          userId: user.id,
          data: null,
        });
      } catch (error) {
        this.logger.warn("Failed to publish estimate deleted event", error);
      }

      this.logger.info("Estimate deleted successfully", { estimateId });

      return true;
    }, "deleteEstimate");
  }

  // ========================================
  // STATUS MANAGEMENT
  // ========================================

  /**
   * Update estimate status
   */
  async updateEstimateStatus(
    estimateId: string,
    status: EstimateStatus,
  ): Promise<boolean> {
    return await this.updateEstimate(estimateId, { status });
  }

  // ========================================
  // HEALTH CHECK
  // ========================================

  protected async onHealthCheck(): Promise<Record<string, any>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("estimates")
        .select("id")
        .limit(1);

      return {
        databaseConnection: !error,
        cacheSize: this.getMetrics().cacheHitRate,
      };
    } catch (error) {
      return {
        databaseConnection: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Utility methods for testing and helper functionality
  public formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  public formatDuration(hours: number): string {
    if (hours >= 8) {
      const days = Math.floor(hours / 8);
      const remainingHours = hours % 8;
      return remainingHours > 0
        ? `${days} day${days > 1 ? "s" : ""}, ${remainingHours} hour${remainingHours > 1 ? "s" : ""}`
        : `${days} day${days > 1 ? "s" : ""}`;
    }
    if (hours >= 1) {
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    }
    return `${Math.round(hours * 60)} minute${Math.round(hours * 60) > 1 ? "s" : ""}`;
  }

  public getServiceDisplayName(serviceCode: ServiceType): string {
    const serviceNames: Record<ServiceType, string> = {
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
      GC: "General Cleaning",
    };
    return serviceNames[serviceCode] || serviceCode;
  }

  public calculateEstimateDuration(services: EstimateServiceType[]): number {
    if (!services || services.length === 0) return 0;

    // Calculate total duration considering overlapping services
    let totalDuration = 0;
    let maxDuration = 0;

    for (const service of services) {
      const duration = safeNumber(service.duration, 0);
      totalDuration += duration;
      maxDuration = Math.max(maxDuration, duration);
    }

    // Account for parallel work - use max duration rather than total
    // Add 20% for coordination overhead
    return Math.max(totalDuration * 0.7, maxDuration) * 1.2;
  }

  public async getAllEstimates(options?: {
    limit?: number;
    offset?: number;
    status?: EstimateStatus;
    sortBy?: string;
  }): Promise<{
    estimates: Estimate[];
    total: number;
    hasMore: boolean;
  }> {
    return await withDatabaseRetry(async () => {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();

      if (!user.user) {
        throw new Error("User not authenticated");
      }

      let query = supabase
        .from("estimates")
        .select("*", { count: "exact" })
        .eq("user_id", user.user.id);

      // Apply filters
      if (options?.status) {
        query = query.eq("status", options.status);
      }

      // Apply sorting
      const sortBy = options?.sortBy || "updated_at";
      query = query.order(sortBy, { ascending: false });

      // Apply pagination
      const limit = options?.limit || 10;
      const offset = options?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      // Transform database records to Estimate objects
      const estimates: Estimate[] = (data || []).map((row) => ({
        id: row.id,
        customerName: safeString(row.customer_name, ""),
        customerEmail: safeString(row.customer_email, ""),
        customerPhone: safeString(row.customer_phone, ""),
        buildingName: safeString(row.building_name, ""),
        buildingAddress: safeString(row.building_address, ""),
        buildingHeightStories: safeNumber(row.building_height_stories, 1),
        buildingType: safeString(row.building_type, "commercial"),
        status: (row.status as EstimateStatus) || "draft",
        notes: safeString(row.notes, ""),
        services: withDefaultArray(row.services, []),
        createdAt: new Date(row.created_at || Date.now()),
        updatedAt: new Date(row.updated_at || Date.now()),
      }));

      return {
        estimates,
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      };
    }, "getAllEstimates");
  }
}

// Create singleton instance
export const estimateService = new EstimateService();
export const unifiedEstimateService = estimateService;

// Export for backward compatibility
export const EstimateBusinessService = EstimateService;
export const EstimateCrudService = EstimateService;
export const EstimateValidationService = EstimateService;
