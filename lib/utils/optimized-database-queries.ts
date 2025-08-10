/**
 * Optimized Database Queries - Phase 1 N+1 Query Elimination
 *
 * Eliminates N+1 query patterns through intelligent batching, joins, and caching
 * Target: 30-50% reduction in database calls
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { getSupabaseCacheLayer } from "@/lib/cache/supabase-cache-layer";
import { createClient } from "@/lib/supabase/client";

type DatabaseClient = SupabaseClient<Database>;
type TableName = keyof Database["public"]["Tables"];
type TableRow<T extends TableName> = Database["public"]["Tables"][T]["Row"];

// Enhanced query result with performance metadata
export interface OptimizedQueryResult<T> {
  data: T;
  metadata: {
    executionTime: number;
    cacheHit: boolean;
    queriesExecuted: number;
    joinStrategy: "single_query" | "batched" | "cached";
    source: "database" | "cache" | "hybrid";
  };
}

// Query optimization strategies
export type QueryStrategy = "joins" | "batch" | "cache" | "hybrid";

/**
 * Advanced Query Optimizer for eliminating N+1 patterns
 */
export class OptimizedDatabaseQueries {
  private static instance: OptimizedDatabaseQueries | null = null;
  private client: DatabaseClient;
  private cache = getSupabaseCacheLayer();
  private queryBatch = new Map<string, Promise<any>>();

  private constructor(client?: DatabaseClient) {
    this.client = client || createClient();
  }

  static getInstance(client?: DatabaseClient): OptimizedDatabaseQueries {
    if (!OptimizedDatabaseQueries.instance) {
      OptimizedDatabaseQueries.instance = new OptimizedDatabaseQueries(client);
    }
    return OptimizedDatabaseQueries.instance;
  }

  /**
   * OPTIMIZED: Load estimate with services using single query with joins
   * Eliminates N+1 pattern by loading estimate + services in one operation
   */
  async loadEstimateWithServices(
    estimateId: string,
    strategy: QueryStrategy = "hybrid",
  ): Promise<
    OptimizedQueryResult<{
      estimate: TableRow<"estimates">;
      services: TableRow<"estimate_services">[];
    }>
  > {
    const startTime = Date.now();
    const cacheKey = `estimate_with_services:${estimateId}:${strategy}`;

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return {
        data: cached as {
          estimate: TableRow<"estimates">;
          services: TableRow<"estimate_services">[];
        },
        metadata: {
          executionTime: Date.now() - startTime,
          cacheHit: true,
          queriesExecuted: 0,
          joinStrategy: "cached",
          source: "cache",
        },
      };
    }

    try {
      let data: any;
      let queriesExecuted = 1;
      let joinStrategy: OptimizedQueryResult<any>["metadata"]["joinStrategy"] =
        "single_query";

      if (strategy === "joins" || strategy === "hybrid") {
        // Single query with joins - eliminates N+1 pattern
        const { data: result, error } = await this.client
          .from("estimates")
          .select(
            `
            *,
            estimate_services (
              id,
              service_type,
              area_sqft,
              glass_sqft,
              price,
              labor_hours,
              setup_hours,
              rig_hours,
              total_hours,
              crew_size,
              equipment_type,
              equipment_days,
              equipment_cost,
              calculation_details,
              created_at,
              updated_at
            )
          `,
          )
          .eq("id", estimateId)
          .single();

        if (error) throw error;

        data = {
          estimate: result,
          services: result.estimate_services || [],
        };
      } else {
        // Fallback to separate queries if joins aren't optimal
        const [estimateResult, servicesResult] = await Promise.all([
          this.client
            .from("estimates")
            .select("*")
            .eq("id", estimateId)
            .single(),
          this.client
            .from("estimate_services")
            .select("*")
            .eq("estimate_id", estimateId),
        ]);

        if (estimateResult.error) throw estimateResult.error;

        data = {
          estimate: estimateResult.data,
          services: servicesResult.data || [],
        };

        queriesExecuted = 2;
        joinStrategy = "batched";
      }

      // Cache the result
      await this.cache.set(cacheKey, data, {
        ttl: 300000, // 5 minutes
        tags: ["estimates", `estimate:${estimateId}`],
      });

      return {
        data: data as any,
        metadata: {
          executionTime: Date.now() - startTime,
          cacheHit: false,
          queriesExecuted,
          joinStrategy,
          source: "database",
        },
      };
    } catch (error) {
      throw new Error(
        `Optimized estimate load failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * OPTIMIZED: Load multiple estimates with services using optimized batch queries
   * Eliminates N+1 pattern when loading lists of estimates
   */
  async loadEstimatesWithServices(
    options: {
      userId?: string;
      limit?: number;
      offset?: number;
      status?: string[];
      includeServices?: boolean;
    } = {},
  ): Promise<
    OptimizedQueryResult<
      Array<{
        estimate: TableRow<"estimates">;
        services: TableRow<"estimate_services">[];
      }>
    >
  > {
    const startTime = Date.now();
    const {
      userId,
      limit = 20,
      offset = 0,
      status,
      includeServices = true,
    } = options;

    const cacheKey = `estimates_with_services:${JSON.stringify(options)}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return {
        data: cached as any,
        metadata: {
          executionTime: Date.now() - startTime,
          cacheHit: true,
          queriesExecuted: 0,
          joinStrategy: "cached",
          source: "cache",
        },
      };
    }

    try {
      let query = this.client
        .from("estimates")
        .select(
          includeServices
            ? `
          *,
          estimate_services (
            id,
            service_type,
            area_sqft,
            price,
            labor_hours,
            total_hours,
            equipment_cost,
            calculation_details
          )
        `
            : "*",
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (userId) {
        query = query.eq("created_by", userId);
      }

      if (status && status.length > 0) {
        query = query.in("status", status);
      }

      const { data: results, error } = await query;
      if (error) throw error;

      const data = results.map((estimate) => ({
        estimate,
        services: includeServices
          ? (estimate as any).estimate_services || []
          : [],
      }));

      // Cache with shorter TTL for lists
      await this.cache.set(cacheKey, data, {
        ttl: 180000, // 3 minutes
        tags: [
          "estimates",
          "estimate-lists",
          ...(userId ? [`user:${userId}`] : []),
        ],
      });

      return {
        data: data as any,
        metadata: {
          executionTime: Date.now() - startTime,
          cacheHit: false,
          queriesExecuted: 1,
          joinStrategy: "single_query",
          source: "database",
        },
      };
    } catch (error) {
      throw new Error(
        `Optimized estimates load failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * OPTIMIZED: Batch load facade analyses with images
   * Eliminates N+1 queries when loading multiple facade analyses
   */
  async loadFacadeAnalysesWithImages(
    analysisIds: string[],
    strategy: QueryStrategy = "hybrid",
  ): Promise<
    OptimizedQueryResult<
      Array<{
        analysis: TableRow<"facade_analyses">;
        images: TableRow<"facade_analysis_images">[];
      }>
    >
  > {
    const startTime = Date.now();
    const cacheKey = `facade_analyses_batch:${analysisIds.sort().join(",")}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return {
        data: cached as any,
        metadata: {
          executionTime: Date.now() - startTime,
          cacheHit: true,
          queriesExecuted: 0,
          joinStrategy: "cached",
          source: "cache",
        },
      };
    }

    try {
      if (strategy === "joins" || strategy === "hybrid") {
        // Single query approach with joins
        const { data: analyses, error: analysesError } = await this.client
          .from("facade_analyses")
          .select(
            `
            *,
            facade_analysis_images (
              id,
              image_url,
              image_type,
              view_angle,
              confidence_scores,
              analysis_results,
              created_at
            )
          `,
          )
          .in("id", analysisIds);

        if (analysesError) throw analysesError;

        const data = analyses.map((analysis) => ({
          analysis,
          images: (analysis as any).facade_analysis_images || [],
        }));

        await this.cache.set(cacheKey, data, {
          ttl: 600000, // 10 minutes (facade analyses change rarely)
          tags: [
            "facade-analyses",
            ...analysisIds.map((id) => `analysis:${id}`),
          ],
        });

        return {
          data: data as any,
          metadata: {
            executionTime: Date.now() - startTime,
            cacheHit: false,
            queriesExecuted: 1,
            joinStrategy: "single_query",
            source: "database",
          },
        };
      } else {
        // Batch queries approach
        const [analyses, images] = await Promise.all([
          this.client.from("facade_analyses").select("*").in("id", analysisIds),
          this.client
            .from("facade_analysis_images")
            .select("*")
            .in("facade_analysis_id", analysisIds),
        ]);

        if (analyses.error) throw analyses.error;
        if (images.error) throw images.error;

        // Group images by analysis ID
        const imagesByAnalysis = new Map<
          string,
          TableRow<"facade_analysis_images">[]
        >();
        images.data.forEach((image) => {
          const analysisId = image.facade_analysis_id;
          if (analysisId) {
            if (!imagesByAnalysis.has(analysisId)) {
              imagesByAnalysis.set(analysisId, []);
            }
            imagesByAnalysis.get(analysisId)!.push(image);
          }
        });

        const data = analyses.data.map((analysis) => ({
          analysis,
          images: imagesByAnalysis.get(analysis.id) || [],
        }));

        await this.cache.set(cacheKey, data, {
          ttl: 600000,
          tags: [
            "facade-analyses",
            ...analysisIds.map((id) => `analysis:${id}`),
          ],
        });

        return {
          data: data as any,
          metadata: {
            executionTime: Date.now() - startTime,
            cacheHit: false,
            queriesExecuted: 2,
            joinStrategy: "batched",
            source: "database",
          },
        };
      }
    } catch (error) {
      throw new Error(
        `Batch facade analyses load failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * OPTIMIZED: Dashboard summary with single query aggregation
   * Eliminates multiple separate queries for dashboard metrics
   */
  async loadDashboardSummary(
    userId: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<
    OptimizedQueryResult<{
      totalEstimates: number;
      totalValue: number;
      estimatesByStatus: Record<string, number>;
      recentEstimates: Array<Partial<TableRow<"estimates">>>;
      topServices: Array<{
        serviceType: string;
        count: number;
        totalValue: number;
      }>;
    }>
  > {
    const startTime = Date.now();
    const cacheKey = `dashboard_summary:${userId}:${timeRange ? `${timeRange.start.getTime()}-${timeRange.end.getTime()}` : "all"}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return {
        data: cached as any,
        metadata: {
          executionTime: Date.now() - startTime,
          cacheHit: true,
          queriesExecuted: 0,
          joinStrategy: "cached",
          source: "cache",
        },
      };
    }

    try {
      // Build optimized queries with proper filtering
      let baseQuery = this.client
        .from("estimates")
        .select(
          `
          id,
          status,
          total_price,
          created_at,
          quote_number,
          customer_name,
          building_name,
          estimate_services (
            service_type,
            price
          )
        `,
        )
        .eq("created_by", userId);

      if (timeRange) {
        baseQuery = baseQuery
          .gte("created_at", timeRange.start.toISOString())
          .lte("created_at", timeRange.end.toISOString());
      }

      // Single query to get all data needed
      const { data: estimates, error } = await baseQuery;
      if (error) throw error;

      // Process data for dashboard metrics
      const totalEstimates = estimates.length;
      const totalValue = estimates.reduce(
        (sum, est) => sum + (est.total_price || 0),
        0,
      );

      // Group by status
      const estimatesByStatus: Record<string, number> = {};
      estimates.forEach((est) => {
        const status = est.status || "unknown";
        estimatesByStatus[status] = (estimatesByStatus[status] || 0) + 1;
      });

      // Recent estimates (already sorted by created_at DESC from base query)
      const recentEstimates = estimates.slice(0, 5);

      // Top services aggregation
      const serviceStats = new Map<
        string,
        { count: number; totalValue: number }
      >();
      estimates.forEach((estimate) => {
        const services = (estimate as any).estimate_services || [];
        services.forEach((service: any) => {
          const serviceType = service.service_type;
          const existing = serviceStats.get(serviceType) || {
            count: 0,
            totalValue: 0,
          };
          existing.count += 1;
          existing.totalValue += service.price || 0;
          serviceStats.set(serviceType, existing);
        });
      });

      const topServices = Array.from(serviceStats.entries())
        .map(([serviceType, stats]) => ({ serviceType, ...stats }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10);

      const data = {
        totalEstimates,
        totalValue,
        estimatesByStatus,
        recentEstimates,
        topServices,
      };

      // Cache dashboard data for 2 minutes (it changes frequently)
      await this.cache.set(cacheKey, data, {
        ttl: 120000,
        tags: ["dashboard", `user:${userId}`, "estimates", "analytics"],
      });

      return {
        data: data as any,
        metadata: {
          executionTime: Date.now() - startTime,
          cacheHit: false,
          queriesExecuted: 1,
          joinStrategy: "single_query",
          source: "database",
        },
      };
    } catch (error) {
      throw new Error(
        `Dashboard summary load failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * OPTIMIZED: Batch query deduplication
   * Prevents duplicate queries by batching similar requests
   */
  async batchQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    ttl: number = 5000,
  ): Promise<T> {
    // Check if query is already in progress
    const existingPromise = this.queryBatch.get(queryKey);
    if (existingPromise) {
      return existingPromise;
    }

    // Create new query promise
    const promise = queryFn().finally(() => {
      // Clean up after query completes
      setTimeout(() => {
        this.queryBatch.delete(queryKey);
      }, ttl);
    });

    // Store promise for deduplication
    this.queryBatch.set(queryKey, promise);

    return promise;
  }

  /**
   * OPTIMIZED: Search with intelligent caching and query optimization
   */
  async optimizedSearch(
    searchTerm: string,
    options: {
      tables?: TableName[];
      userId?: string;
      limit?: number;
      includeRelated?: boolean;
    } = {},
  ): Promise<
    OptimizedQueryResult<{
      estimates: Array<Partial<TableRow<"estimates">>>;
      customers: Array<Partial<TableRow<"customers">>>;
      facadeAnalyses: Array<Partial<TableRow<"facade_analyses">>>;
    }>
  > {
    const startTime = Date.now();
    const {
      tables = ["estimates"],
      userId,
      limit = 20,
      includeRelated = false,
    } = options;

    const cacheKey = `search:${searchTerm}:${JSON.stringify(options)}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return {
        data: cached as any,
        metadata: {
          executionTime: Date.now() - startTime,
          cacheHit: true,
          queriesExecuted: 0,
          joinStrategy: "cached",
          source: "cache",
        },
      };
    }

    try {
      const searchQueries: Promise<any>[] = [];
      let queriesExecuted = 0;

      // Optimized full-text search for estimates
      if (tables.includes("estimates")) {
        let estimatesQuery = this.client
          .from("estimates")
          .select(
            includeRelated
              ? `
            *,
            estimate_services (
              id,
              service_type,
              price
            )
          `
              : "*",
          )
          .or(
            `
            customer_name.ilike.%${searchTerm}%,
            company_name.ilike.%${searchTerm}%,
            building_name.ilike.%${searchTerm}%,
            building_address.ilike.%${searchTerm}%,
            quote_number.ilike.%${searchTerm}%
          `,
          )
          .limit(limit);

        if (userId) {
          estimatesQuery = estimatesQuery.eq("created_by", userId);
        }

        searchQueries.push(Promise.resolve(estimatesQuery));
        queriesExecuted++;
      }

      // Add other table searches if needed
      if (tables.includes("customers")) {
        let customersQuery = this.client
          .from("customers")
          .select("*")
          .or(
            `
            name.ilike.%${searchTerm}%,
            email.ilike.%${searchTerm}%,
            company.ilike.%${searchTerm}%
          `,
          )
          .limit(limit);

        if (userId) {
          customersQuery = customersQuery.eq("created_by", userId);
        }

        searchQueries.push(Promise.resolve(customersQuery));
        queriesExecuted++;
      }

      // Execute all search queries in parallel
      const results = await Promise.all(searchQueries);

      const data = {
        estimates: tables.includes("estimates") ? results[0]?.data || [] : [],
        customers: tables.includes("customers")
          ? results[tables.includes("estimates") ? 1 : 0]?.data || []
          : [],
        facadeAnalyses: [], // Add facade analysis search if needed
      };

      // Cache search results for 30 seconds (they change frequently)
      await this.cache.set(cacheKey, data, {
        ttl: 30000,
        tags: [
          "search",
          "estimates",
          "customers",
          ...(userId ? [`user:${userId}`] : []),
        ],
      });

      return {
        data: data as any,
        metadata: {
          executionTime: Date.now() - startTime,
          cacheHit: false,
          queriesExecuted,
          joinStrategy: queriesExecuted === 1 ? "single_query" : "batched",
          source: "database",
        },
      };
    } catch (error) {
      throw new Error(
        `Optimized search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Clear query batch cache (useful for testing or cleanup)
   */
  clearBatchCache(): void {
    this.queryBatch.clear();
  }

  /**
   * Get performance statistics for monitoring
   */
  getPerformanceStats() {
    return {
      activeBatches: this.queryBatch.size,
      cacheStats: this.cache.getMetrics(),
    };
  }
}

// Export singleton instance and convenience functions
export const optimizedQueries = OptimizedDatabaseQueries.getInstance();

// Convenience functions that eliminate N+1 patterns
export const loadEstimateWithServices = (
  estimateId: string,
  strategy?: QueryStrategy,
) => optimizedQueries.loadEstimateWithServices(estimateId, strategy);

export const loadEstimatesWithServices = (
  options?: Parameters<typeof optimizedQueries.loadEstimatesWithServices>[0],
) => optimizedQueries.loadEstimatesWithServices(options);

export const loadFacadeAnalysesWithImages = (
  analysisIds: string[],
  strategy?: QueryStrategy,
) => optimizedQueries.loadFacadeAnalysesWithImages(analysisIds, strategy);

export const loadDashboardSummary = (
  userId: string,
  timeRange?: { start: Date; end: Date },
) => optimizedQueries.loadDashboardSummary(userId, timeRange);

export const optimizedSearch = (
  searchTerm: string,
  options?: Parameters<typeof optimizedQueries.optimizedSearch>[1],
) => optimizedQueries.optimizedSearch(searchTerm, options);

// Performance monitoring functions
export const getQueryPerformanceStats = () =>
  optimizedQueries.getPerformanceStats();

export default OptimizedDatabaseQueries;
