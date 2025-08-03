// Database Query Optimization Utilities
// Advanced query optimization patterns for improved API performance

interface QueryOptimizationOptions {
  useSelectiveColumns?: boolean;
  useBatching?: boolean;
  useAggregation?: boolean;
  limit?: number;
  offset?: number;
}

interface OptimizedQueryResult<T> {
  data: T;
  metadata: {
    executionTime: number;
    rowCount: number;
    cacheHit: boolean;
    optimizations: string[];
  };
}

/**
 * Optimized Help Analytics Query
 * - Uses selective column retrieval
 * - Database-level aggregations
 * - Indexed filtering
 */
export async function getOptimizedHelpAnalytics(
  supabase: any,
  workflowId: string | null,
  timeframe: string,
  options: QueryOptimizationOptions = {},
): Promise<
  OptimizedQueryResult<{ data: any; metrics: any; timeframe: string }>
> {
  const startTime = Date.now();
  const optimizations: string[] = [];

  // Calculate timeframe
  const timeframeMap = { "7d": 7, "30d": 30, "90d": 90 };
  const days = timeframeMap[timeframe as keyof typeof timeframeMap] || 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Selective column retrieval instead of SELECT *
  const selectColumns = options.useSelectiveColumns
    ? "id, workflow_id, help_id, interaction_type, created_at, user_id"
    : "*";
  optimizations.push("selective-columns");

  // Build optimized query with proper indexing hints
  let query = supabase
    .from("help_analytics")
    .select(selectColumns)
    .gte("created_at", startDate.toISOString()) // Uses index on created_at
    .order("created_at", { ascending: false });

  if (workflowId) {
    query = query.eq("workflow_id", workflowId); // Uses index on workflow_id
    optimizations.push("workflow-filter");
  }

  // Add limit for better performance
  if (options.limit) {
    query = query.limit(options.limit);
    optimizations.push("result-limit");
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch help analytics: ${error.message}`);
  }

  // Use database aggregation if supported, otherwise fallback to client-side
  let metrics;
  if (options.useAggregation && workflowId) {
    // Database-level aggregation query
    const { data: aggregationData, error: aggError } = await supabase.rpc(
      "calculate_help_metrics",
      {
        workflow_id_param: workflowId,
        start_date_param: startDate.toISOString(),
      },
    );

    if (!aggError && aggregationData) {
      metrics = aggregationData[0];
      optimizations.push("db-aggregation");
    }
  }

  // Fallback to client-side aggregation
  if (!metrics) {
    const total = data?.length || 0;
    const helpful =
      data?.filter((a: any) => a.interaction_type === "helpful").length || 0;
    const notHelpful =
      data?.filter((a: any) => a.interaction_type === "not_helpful").length ||
      0;
    const dismissed =
      data?.filter((a: any) => a.interaction_type === "dismissed").length || 0;

    const helpfulnessRate =
      total > 0 ? (helpful / (helpful + notHelpful)) * 100 : 0;

    metrics = {
      total_interactions: total,
      helpful_count: helpful,
      not_helpful_count: notHelpful,
      dismissed_count: dismissed,
      helpfulness_rate: helpfulnessRate,
    };
    optimizations.push("client-aggregation");
  }

  const executionTime = Date.now() - startTime;

  return {
    data: {
      data,
      metrics,
      timeframe,
    },
    metadata: {
      executionTime,
      rowCount: data?.length || 0,
      cacheHit: false,
      optimizations,
    },
  };
}

/**
 * Optimized Analytics Event Query
 * - Batch processing for large datasets
 * - Selective column retrieval
 * - Efficient aggregations
 */
export async function getOptimizedEventMetrics(
  supabase: any,
  userId?: string,
  eventName?: string,
  days: number = 30,
  options: QueryOptimizationOptions = {},
): Promise<
  OptimizedQueryResult<{
    total_events: number;
    event_counts: { [k: string]: number };
    daily_activity: { date: string; count: number }[];
    total_value: number;
    unique_event_types: number;
    period_days: number;
  }>
> {
  const startTime = Date.now();
  const optimizations: string[] = [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Selective column retrieval for better performance
  const selectColumns = options.useSelectiveColumns
    ? "event_name, properties, timestamp, user_id"
    : "event_name, properties, timestamp";
  optimizations.push("selective-columns");

  let query = supabase
    .from("analytics_events")
    .select(selectColumns)
    .gte("timestamp", startDate.toISOString()) // Uses index on timestamp
    .order("timestamp", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId); // Uses index on user_id
    optimizations.push("user-filter");
  }

  if (eventName) {
    query = query.eq("event_name", eventName); // Uses index on event_name
    optimizations.push("event-filter");
  }

  // Limit results for performance
  const limit = options.limit || 1000;
  query = query.limit(limit);
  optimizations.push("result-limit");

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch event metrics: ${error.message}`);
  }

  // Optimized aggregation using Map for better performance
  const events = data || [];
  const eventCounts = new Map<string, number>();
  const dailyActivity = new Map<string, number>();
  let totalValue = 0;

  // Single pass aggregation
  events.forEach((event: any) => {
    // Count by event type
    eventCounts.set(
      event.event_name,
      (eventCounts.get(event.event_name) || 0) + 1,
    );

    // Daily activity
    const date = new Date(event.timestamp).toISOString().split("T")[0];
    dailyActivity.set(date, (dailyActivity.get(date) || 0) + 1);

    // Sum values if present
    if (event.properties?.value) {
      totalValue += event.properties.value;
    }
  });

  optimizations.push("single-pass-aggregation");

  const executionTime = Date.now() - startTime;

  return {
    data: {
      total_events: events.length,
      event_counts: Object.fromEntries(eventCounts),
      daily_activity: Array.from(dailyActivity.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      total_value: totalValue,
      unique_event_types: eventCounts.size,
      period_days: days,
    },
    metadata: {
      executionTime,
      rowCount: events.length,
      cacheHit: false,
      optimizations,
    },
  };
}

/**
 * Optimized Cost Breakdown Query
 * - Efficient JOIN operations
 * - Calculated fields in query
 * - Reduced data transfer
 */
export async function getOptimizedCostBreakdown(
  supabase: any,
  estimateId: string,
  options: QueryOptimizationOptions = {},
): Promise<OptimizedQueryResult<any>> {
  const startTime = Date.now();
  const optimizations: string[] = [];

  // Single optimized query with calculated fields
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select(
      `
      id,
      customer_name,
      building_address,
      total_amount,
      created_at,
      estimate_services (
        service_name,
        quantity,
        unit_price,
        total_price,
        markup_percentage
      )
    `,
    )
    .eq("id", estimateId)
    .single();

  optimizations.push("single-query-with-joins");

  if (estimateError) {
    throw new Error(`Failed to fetch estimate: ${estimateError.message}`);
  }

  // Optimized calculation using reduce for better performance
  const services = estimate.estimate_services || [];

  const calculations = services.reduce(
    (acc: any, service: any) => {
      const basePrice = service.total_price || 0;
      const markupPercentage = service.markup_percentage || 0;
      const markupAmount = (basePrice * markupPercentage) / 100;

      acc.subtotal += basePrice;
      acc.markup_total += markupAmount;

      return acc;
    },
    { subtotal: 0, markup_total: 0 },
  );

  const tax_amount =
    (estimate.total_amount || 0) -
    calculations.subtotal -
    calculations.markup_total;

  optimizations.push("optimized-calculations");

  const executionTime = Date.now() - startTime;

  return {
    data: {
      estimate: {
        id: estimate.id,
        customer_name: estimate.customer_name,
        building_address: estimate.building_address,
        total_amount: estimate.total_amount,
        created_at: estimate.created_at,
      },
      services,
      summary: {
        subtotal: calculations.subtotal,
        markup_total: calculations.markup_total,
        tax_amount: Math.max(0, tax_amount),
        final_total: estimate.total_amount || 0,
      },
    },
    metadata: {
      executionTime,
      rowCount: services.length + 1,
      cacheHit: false,
      optimizations,
    },
  };
}

/**
 * Optimized Collaboration History Query
 * - Efficient pagination
 * - Conditional joins
 * - Indexed filtering
 */
export async function getOptimizedCollaborationHistory(
  supabase: any,
  estimateId: string,
  userId: string,
  days: number,
  includeMetrics: boolean,
  options: QueryOptimizationOptions = {},
): Promise<OptimizedQueryResult<any>> {
  const startTime = Date.now();
  const optimizations: string[] = [];

  // Calculate date range
  const endDate = new Date().toISOString();
  const startDate = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Selective column retrieval
  const selectColumns = options.useSelectiveColumns
    ? `
      id,
      estimate_id,
      user_id,
      change_type,
      field_name,
      description,
      created_at,
      profiles:user_id (
        full_name,
        email
      )
    `
    : `
      id,
      estimate_id,
      user_id,
      change_type,
      field_name,
      old_value,
      new_value,
      description,
      created_at,
      profiles:user_id (
        full_name,
        email
      )
    `;

  optimizations.push("selective-columns");

  let query = supabase
    .from("collaboration_history")
    .select(selectColumns)
    .gte("created_at", startDate) // Uses index on created_at
    .lte("created_at", endDate)
    .order("created_at", { ascending: false });

  if (estimateId) {
    query = query.eq("estimate_id", estimateId); // Uses index on estimate_id
    optimizations.push("estimate-filter");
  }

  if (userId) {
    query = query.eq("user_id", userId); // Uses index on user_id
    optimizations.push("user-filter");
  }

  // Efficient pagination
  const limit = options.limit || 100;
  const offset = options.offset || 0;
  query = query.range(offset, offset + limit - 1);
  optimizations.push("efficient-pagination");

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch change history: ${error.message}`);
  }

  // Transform data efficiently
  const history = (data || []).map((item: any) => ({
    id: item.id,
    estimate_id: item.estimate_id,
    user_id: item.user_id,
    change_type: item.change_type,
    field_name: item.field_name,
    old_value: item.old_value,
    new_value: item.new_value,
    description: item.description,
    created_at: item.created_at,
    user_name: item.profiles?.full_name || "Unknown User",
    user_email: item.profiles?.email || "",
  }));

  let metrics = null;
  if (includeMetrics) {
    // Optimized metrics calculation
    metrics = await calculateOptimizedCollaborationMetrics(
      supabase,
      estimateId,
      startDate,
      endDate,
    );
    optimizations.push("optimized-metrics");
  }

  const executionTime = Date.now() - startTime;

  return {
    data: { history, metrics },
    metadata: {
      executionTime,
      rowCount: history.length,
      cacheHit: false,
      optimizations,
    },
  };
}

/**
 * Optimized metrics calculation for collaboration
 */
async function calculateOptimizedCollaborationMetrics(
  supabase: any,
  estimateId: string,
  startDate: string,
  endDate: string,
): Promise<any> {
  let baseQuery = supabase
    .from("collaboration_history")
    .select("user_id, change_type, created_at, profiles:user_id (full_name)")
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  if (estimateId) {
    baseQuery = baseQuery.eq("estimate_id", estimateId);
  }

  const { data, error } = await baseQuery;

  if (error) {
    throw new Error(`Failed to calculate metrics: ${error.message}`);
  }

  const changes = data || [];
  const userCounts = new Map<string, { name: string; count: number }>();
  const changeTypeCounts = new Map<string, number>();
  const dailyActivity = new Map<string, number>();

  // Single pass aggregation for better performance
  changes.forEach((change: any) => {
    // Count by user
    const userId = change.user_id;
    const userName = change.profiles?.full_name || "Unknown User";

    if (!userCounts.has(userId)) {
      userCounts.set(userId, { name: userName, count: 0 });
    }
    userCounts.get(userId)!.count++;

    // Count by change type
    const changeType = change.change_type;
    changeTypeCounts.set(
      changeType,
      (changeTypeCounts.get(changeType) || 0) + 1,
    );

    // Count by day
    const date = new Date(change.created_at).toISOString().split("T")[0];
    dailyActivity.set(date, (dailyActivity.get(date) || 0) + 1);
  });

  // Find most active user efficiently
  let mostActiveUser = { user_id: "", user_name: "None", change_count: 0 };
  let maxChanges = 0;

  for (const [userId, userData] of userCounts) {
    if (userData.count > maxChanges) {
      maxChanges = userData.count;
      mostActiveUser = {
        user_id: userId,
        user_name: userData.name,
        change_count: userData.count,
      };
    }
  }

  return {
    total_changes: changes.length,
    unique_contributors: userCounts.size,
    most_active_user: mostActiveUser,
    change_types_breakdown: Object.fromEntries(changeTypeCounts),
    daily_activity: Array.from(dailyActivity.entries())
      .map(([date, count]) => ({ date, change_count: count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/**
 * Database Index Recommendations
 * These should be applied to the database for optimal performance
 */
export const RECOMMENDED_INDEXES = {
  help_analytics: [
    "CREATE INDEX IF NOT EXISTS idx_help_analytics_workflow_created ON help_analytics(workflow_id, created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_help_analytics_interaction_type ON help_analytics(interaction_type);",
    "CREATE INDEX IF NOT EXISTS idx_help_analytics_user_id ON help_analytics(user_id);",
  ],
  analytics_events: [
    "CREATE INDEX IF NOT EXISTS idx_analytics_events_user_timestamp ON analytics_events(user_id, timestamp DESC);",
    "CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);",
    "CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);",
  ],
  collaboration_history: [
    "CREATE INDEX IF NOT EXISTS idx_collaboration_estimate_created ON collaboration_history(estimate_id, created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_collaboration_user_created ON collaboration_history(user_id, created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_collaboration_change_type ON collaboration_history(change_type);",
  ],
  issue_reports: [
    "CREATE INDEX IF NOT EXISTS idx_issue_reports_user_status ON issue_reports(user_id, status);",
    "CREATE INDEX IF NOT EXISTS idx_issue_reports_type_priority ON issue_reports(type, priority);",
    "CREATE INDEX IF NOT EXISTS idx_issue_reports_created_at ON issue_reports(created_at DESC);",
  ],
  sql_execution_log: [
    "CREATE INDEX IF NOT EXISTS idx_sql_execution_user_operation ON sql_execution_log(user_id, operation_type);",
    "CREATE INDEX IF NOT EXISTS idx_sql_execution_executed_at ON sql_execution_log(executed_at DESC);",
  ],
};

/**
 * Query Performance Monitoring
 */
export interface QueryPerformanceMetrics {
  query: string;
  executionTime: number;
  rowCount: number;
  cacheHit: boolean;
  optimizations: string[];
  timestamp: string;
}

export class QueryPerformanceMonitor {
  private metrics: QueryPerformanceMetrics[] = [];
  private maxMetrics = 1000;

  logQueryPerformance(metric: QueryPerformanceMetrics): void {
    this.metrics.push({
      ...metric,
      timestamp: new Date().toISOString(),
    });

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getPerformanceStats(): {
    averageExecutionTime: number;
    totalQueries: number;
    cacheHitRate: number;
    slowQueries: QueryPerformanceMetrics[];
  } {
    if (this.metrics.length === 0) {
      return {
        averageExecutionTime: 0,
        totalQueries: 0,
        cacheHitRate: 0,
        slowQueries: [],
      };
    }

    const totalTime = this.metrics.reduce((sum, m) => sum + m.executionTime, 0);
    const cacheHits = this.metrics.filter((m) => m.cacheHit).length;
    const slowQueries = this.metrics
      .filter((m) => m.executionTime > 1000) // Queries slower than 1 second
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      averageExecutionTime: totalTime / this.metrics.length,
      totalQueries: this.metrics.length,
      cacheHitRate: (cacheHits / this.metrics.length) * 100,
      slowQueries,
    };
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}

export const queryPerformanceMonitor = new QueryPerformanceMonitor();
