# Supabase Performance Optimization Plan

**Status**: Baseline assessment required  
**Priority**: High - Critical for scaling  
**Timeline**: Week 1-3 implementation

## Current State Analysis

### Security Findings (Immediate Action Required)

**From Supabase Security Advisors**:

1. **Leaked Password Protection Disabled** [WARN]
   - Impact: Users can set compromised passwords from HaveIBeenPwned database
   - Fix: Enable in Auth settings → Security
   - Timeline: 15 minutes
   - Documentation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

2. **Insufficient MFA Options** [WARN]
   - Impact: Weak account security with limited authentication factors
   - Current: 1-2 MFA methods enabled
   - Target: Enable TOTP, recovery codes, email verification
   - Timeline: 30 minutes
   - Documentation: https://supabase.com/docs/guides/auth/auth-mfa

### Schema Analysis Limitations

**Challenge**: Unable to analyze full schema due to size (76,878 tokens > 25,000 limit)

- **Implication**: Potential performance issues undetected
- **Risk**: Slow queries, missing indexes, inefficient relationships
- **Mitigation**: Implement staged analysis approach

## Performance Optimization Strategy

### Phase 1: Monitoring Foundation (Week 1)

#### 1.1 Query Performance Monitoring

```typescript
// Implement in lib/services/optimized-query-service.ts
export interface QueryMetrics {
  query: string;
  executionTime: number;
  rowsReturned: number;
  timestamp: Date;
  userId?: string;
  endpoint: string;
}

export class QueryMonitor {
  private static slowQueries: QueryMetrics[] = [];
  private static readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second

  static logQuery(metrics: QueryMetrics) {
    if (metrics.executionTime > this.SLOW_QUERY_THRESHOLD) {
      this.slowQueries.push(metrics);
      console.warn(`Slow query detected: ${metrics.executionTime}ms`, metrics);
    }
  }

  static getSlowQueries(limit = 10): QueryMetrics[] {
    return this.slowQueries
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }
}
```

#### 1.2 Connection Pool Monitoring

```typescript
// Enhance existing lib/supabase/connection-pool.ts
export interface PoolMetrics {
  activeConnections: number;
  totalConnections: number;
  waitingRequests: number;
  connectionAcquisitionTime: number;
  connectionUtilization: number;
}

export class ConnectionPoolMonitor {
  static getMetrics(): PoolMetrics {
    // Implementation details
    return {
      activeConnections: 0,
      totalConnections: 10,
      waitingRequests: 0,
      connectionAcquisitionTime: 0,
      connectionUtilization: 0,
    };
  }
}
```

### Phase 2: Query Optimization (Week 2)

#### 2.1 Common Query Patterns Analysis

Based on service layer structure, identify likely slow queries:

**Estimates with Services (N+1 Problem)**:

```sql
-- Current (potentially inefficient)
SELECT * FROM estimates WHERE user_id = $1;
-- Then for each estimate:
SELECT * FROM estimate_services WHERE estimate_id = $2;

-- Optimized (single query with join)
SELECT
  e.*,
  es.id as service_id,
  es.service_type,
  es.area_sqft,
  es.price,
  es.labor_hours
FROM estimates e
LEFT JOIN estimate_services es ON e.id = es.estimate_id
WHERE e.user_id = $1
ORDER BY e.created_at DESC;
```

**Analytics Aggregations (Heavy Computations)**:

```sql
-- Likely exists in analytics-service.ts
-- May benefit from materialized views or pre-computed aggregates
CREATE MATERIALIZED VIEW estimate_summary_stats AS
SELECT
  user_id,
  COUNT(*) as total_estimates,
  SUM(total_price) as total_value,
  AVG(total_price) as avg_price,
  DATE_TRUNC('month', created_at) as month
FROM estimates
GROUP BY user_id, DATE_TRUNC('month', created_at);

-- Refresh daily via cron
CREATE OR REPLACE FUNCTION refresh_estimate_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW estimate_summary_stats;
END;
$$ LANGUAGE plpgsql;
```

#### 2.2 Index Optimization Strategy

```sql
-- Likely missing indexes based on service patterns:

-- For estimate queries by user and status
CREATE INDEX CONCURRENTLY idx_estimates_user_status
ON estimates (user_id, status, created_at);

-- For AI analysis results
CREATE INDEX CONCURRENTLY idx_ai_analysis_created
ON ai_analysis_results (created_at, confidence_score);

-- For analytics events
CREATE INDEX CONCURRENTLY idx_analytics_events_user_time
ON analytics_events (user_id, event_type, created_at);

-- For facade analysis with image associations
CREATE INDEX CONCURRENTLY idx_facade_analysis_images
ON facade_analysis_images (analysis_id, processed_at);

-- For estimate services pricing queries
CREATE INDEX CONCURRENTLY idx_estimate_services_pricing
ON estimate_services (service_type, area_sqft, price);
```

### Phase 3: Caching Strategy Enhancement (Week 2-3)

#### 3.1 Query Result Caching

```typescript
// Integration with existing BaseService caching
export class OptimizedQueryService extends BaseService {
  constructor() {
    super({
      serviceName: "OptimizedQueryService",
      enableCaching: true,
      cacheTimeout: 10 * 60 * 1000, // 10 minutes for query results
    });
  }

  async getEstimateWithServices(
    estimateId: string,
  ): Promise<EstimateWithServices> {
    const cacheKey = this.generateCacheKey(
      "estimate_with_services",
      estimateId,
    );

    let result = this.getCached<EstimateWithServices>(cacheKey);
    if (result) return result;

    result = await this.withDatabase(
      () => this.executeOptimizedEstimateQuery(estimateId),
      "getEstimateWithServices",
    );

    this.setCached(cacheKey, result, 5 * 60 * 1000); // 5 minute cache
    return result;
  }
}
```

#### 3.2 Redis Integration (Server-Side Only)

```typescript
// Fix current Redis client browser issue
// Move to lib/cache/server-side-redis.ts
import Redis from "ioredis";

class ServerSideRedisClient {
  private static instance: Redis | null = null;

  static getClient(): Redis | null {
    // Only initialize on server-side
    if (typeof window !== "undefined") return null;

    if (!this.instance && process.env.REDIS_URL) {
      this.instance = new Redis(process.env.REDIS_URL);
    }

    return this.instance;
  }
}

export { ServerSideRedisClient };
```

### Phase 4: Database Configuration Optimization (Week 3)

#### 4.1 Connection Pool Tuning

```javascript
// Optimize lib/supabase/connection-pool.ts configuration
export const CONNECTION_POOL_CONFIG = {
  // Increase based on concurrent user expectations
  max: process.env.NODE_ENV === "production" ? 20 : 10,
  min: 5,

  // Optimize connection lifecycle
  acquireTimeoutMillis: 60000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200,

  // Performance monitoring
  log: (message, logLevel) => {
    if (logLevel === "warn" || logLevel === "error") {
      console.log(`Pool ${logLevel}: ${message}`);
    }
  },
};
```

#### 4.2 RLS Policy Optimization

```sql
-- Review and optimize existing RLS policies
-- Example: Optimize estimates policy for better performance

-- Current policy may be inefficient:
-- CREATE POLICY "Users can view own estimates" ON estimates
-- FOR SELECT USING (auth.uid() = user_id);

-- Optimized with index support:
CREATE POLICY "estimates_select_optimized" ON estimates
FOR SELECT USING (
  auth.uid() = user_id
  AND status IN ('draft', 'pending', 'approved', 'completed')
);

-- Ensure supporting index exists:
CREATE INDEX CONCURRENTLY idx_estimates_rls_optimized
ON estimates (user_id, status)
WHERE user_id IS NOT NULL;
```

## Implementation Timeline

### Week 1: Foundation (Days 3-4)

- [ ] Enable Supabase security features (15 min)
- [ ] Implement basic query monitoring (45 min)
- [ ] Set up connection pool metrics (30 min)

### Week 2: Query Optimization (Days 8-14)

- [ ] Analyze slow queries from monitoring (60 min)
- [ ] Create performance indexes (90 min)
- [ ] Optimize N+1 query patterns (90 min)
- [ ] Implement query result caching (60 min)

### Week 3: Advanced Optimization (Days 15-21)

- [ ] Fix Redis client browser issue (30 min)
- [ ] Tune connection pool configuration (45 min)
- [ ] Optimize RLS policies (60 min)
- [ ] Create materialized views for analytics (45 min)
- [ ] Set up automated performance monitoring (90 min)

## Success Metrics

### Performance Targets

- **Query Response Time**: <200ms for 95th percentile
- **Connection Acquisition**: <100ms average
- **Cache Hit Rate**: >70% for frequently accessed data
- **Database CPU**: <60% average utilization

### Monitoring KPIs

- Slow query count and trending
- Connection pool utilization and wait times
- Cache effectiveness and hit rates
- RLS policy performance impact
- Overall API response times

## Risk Assessment & Mitigation

### High Risk: Schema Analysis Blind Spot

- **Risk**: Unknown performance issues due to analysis limitations
- **Mitigation**: Implement comprehensive query monitoring first
- **Timeline**: Week 1 priority

### Medium Risk: Index Creation Impact

- **Risk**: Index creation may impact production performance
- **Mitigation**: Use `CREATE INDEX CONCURRENTLY` for zero-downtime
- **Timeline**: Off-peak hours

### Low Risk: Connection Pool Changes

- **Risk**: Connection pool tuning may cause instability
- **Mitigation**: Gradual adjustment with monitoring
- **Timeline**: Staged rollout

## Validation & Testing

### Performance Testing Script

```typescript
// scripts/performance-test-queries.ts
export async function testQueryPerformance() {
  const startTime = Date.now();

  // Test critical queries
  await testEstimateQueries();
  await testAnalyticsQueries();
  await testAIAnalysisQueries();

  const endTime = Date.now();
  console.log(`Performance test completed in ${endTime - startTime}ms`);
}
```

### Monitoring Dashboard Integration

- Add database metrics to existing performance dashboard
- Alert on slow queries > 1 second
- Track query patterns and optimize iteratively

---

**Next Steps**: Begin with security fixes (15 min), then implement query monitoring foundation (45 min) to establish baseline metrics for optimization.
