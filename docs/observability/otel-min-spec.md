# OpenTelemetry Minimal Implementation Specification

**Timeline**: Week 3 (Days 15-17)  
**Effort**: 90 minutes total implementation  
**Scope**: Baseline tracing + 3 critical paths + business KPIs  
**Goal**: Production-ready observability foundation

## Current Observability Gap

### Existing Infrastructure

- ✅ Web Vitals tracking table (`web_vitals`)
- ✅ Performance metrics migration (2025-07-30)
- ✅ Enhanced performance monitoring service
- ✅ Error service with basic logging
- ❌ No distributed tracing
- ❌ Limited business metrics
- ❌ No correlation between frontend and backend performance

### Critical Blind Spots

1. **Request Flow Tracing**: Cannot trace requests across service boundaries
2. **Database Query Performance**: No visibility into Supabase query execution
3. **AI Service Latency**: No tracking of OpenAI API call performance
4. **Business KPI Correlation**: Cannot correlate technical metrics with business outcomes

## Minimal OpenTelemetry Architecture

### Core Components (60 minutes implementation)

#### 1. OTel SDK Configuration

```typescript
// lib/observability/otel-config.ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "estimatepro",
    [SemanticResourceAttributes.SERVICE_VERSION]:
      process.env.npm_package_version || "1.0.0",
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
      process.env.NODE_ENV || "development",
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy instrumentations
      "@opentelemetry/instrumentation-fs": { enabled: false },
      "@opentelemetry/instrumentation-dns": { enabled: false },
    }),
  ],
});

if (process.env.NODE_ENV === "production") {
  // Production: Export to actual observability platform
  // For now, use console exporter for development
  sdk.start();
}

export { sdk };
```

#### 2. Next.js Integration

```typescript
// lib/observability/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { trace, SpanStatusCode, SpanKind } from "@opentelemetry/api";

const tracer = trace.getTracer("estimatepro-middleware");

export function withTracing(
  handler: (req: NextRequest) => Promise<NextResponse>,
  operationName: string,
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    return tracer.startActiveSpan(
      operationName,
      {
        kind: SpanKind.SERVER,
        attributes: {
          "http.method": req.method,
          "http.url": req.url,
          "http.route": req.nextUrl.pathname,
        },
      },
      async (span) => {
        try {
          const response = await handler(req);

          span.setAttributes({
            "http.status_code": response.status,
            "http.response_size": response.headers.get("content-length") || "0",
          });

          span.setStatus({ code: SpanStatusCode.OK });
          return response;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  };
}
```

### Critical Path Instrumentation (30 minutes)

#### 1. Estimate Creation Flow

```typescript
// app/api/estimates/route.ts
import { withTracing } from "@/lib/observability/middleware";

async function createEstimate(req: NextRequest) {
  const span = trace.getActiveSpan();

  try {
    // Add business context
    span?.setAttributes({
      "business.operation": "create_estimate",
      "business.user_id": userId,
      "business.estimate_type": estimateData.type,
    });

    const estimate = await estimateService.createEstimate(estimateData);

    span?.setAttributes({
      "business.estimate_id": estimate.id,
      "business.estimate_value": estimate.totalPrice,
    });

    return NextResponse.json(estimate);
  } catch (error) {
    span?.recordException(error as Error);
    throw error;
  }
}

export const POST = withTracing(createEstimate, "create_estimate");
```

#### 2. AI Processing Pipeline

```typescript
// lib/services/ai-service.ts
import { trace, SpanKind } from "@opentelemetry/api";

export class AIService extends BaseService {
  private tracer = trace.getTracer("ai-service");

  async processAIRequest(request: AIRequest): Promise<AIResponse> {
    return this.tracer.startActiveSpan(
      "ai_process_request",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          "ai.model": request.model,
          "ai.prompt_length": request.prompt.length,
          "ai.request_type": request.type,
        },
      },
      async (span) => {
        try {
          const startTime = Date.now();
          const response = await this.callOpenAI(request);
          const duration = Date.now() - startTime;

          span.setAttributes({
            "ai.response_length": response.content.length,
            "ai.tokens_used": response.usage?.total_tokens || 0,
            "ai.duration_ms": duration,
            "ai.confidence_score": response.confidence || 0,
          });

          // Record business metrics
          this.recordAIUsageMetrics({
            model: request.model,
            tokensUsed: response.usage?.total_tokens || 0,
            duration,
            success: true,
          });

          return response;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: "AI request failed",
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }
}
```

#### 3. Database Operations

```typescript
// lib/supabase/instrumented-client.ts
import { createClient } from "@supabase/supabase-js";
import { trace, SpanKind } from "@opentelemetry/api";

class InstrumentedSupabaseClient {
  private tracer = trace.getTracer("supabase-client");
  private client = createClient(url, key);

  async query(table: string, query: any) {
    return this.tracer.startActiveSpan(
      "supabase_query",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          "db.system": "postgresql",
          "db.name": "supabase",
          "db.operation": query.method || "select",
          "db.collection.name": table,
        },
      },
      async (span) => {
        try {
          const startTime = Date.now();
          const result = await query;
          const duration = Date.now() - startTime;

          span.setAttributes({
            "db.rows_affected": result.count || 0,
            "db.duration_ms": duration,
          });

          // Alert on slow queries
          if (duration > 1000) {
            console.warn(`Slow query detected: ${table} took ${duration}ms`);
          }

          return result;
        } catch (error) {
          span.recordException(error as Error);
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }
}

export const instrumentedSupabase = new InstrumentedSupabaseClient();
```

## Business KPI Tracking (30 minutes)

### Key Performance Indicators

```typescript
// lib/observability/kpi-tracker.ts
import { metrics } from "@opentelemetry/api";

class BusinessKPITracker {
  private meter = metrics.getMeter("estimatepro-business");

  // Core business metrics
  private estimateCreationCounter = this.meter.createCounter(
    "estimates_created_total",
    {
      description: "Total number of estimates created",
    },
  );

  private estimateValueHistogram = this.meter.createHistogram(
    "estimate_value_usd",
    {
      description: "Distribution of estimate values in USD",
    },
  );

  private aiUsageCounter = this.meter.createCounter("ai_requests_total", {
    description: "Total AI API requests",
  });

  private conversionRateGauge = this.meter.createUpDownCounter(
    "conversion_rate",
    {
      description: "Estimate to approval conversion rate",
    },
  );

  // Track estimate lifecycle
  recordEstimateCreated(estimate: {
    id: string;
    value: number;
    type: string;
    userId: string;
  }) {
    this.estimateCreationCounter.add(1, {
      estimate_type: estimate.type,
      user_segment: this.getUserSegment(estimate.userId),
    });

    this.estimateValueHistogram.record(estimate.value, {
      estimate_type: estimate.type,
    });
  }

  // Track AI usage and costs
  recordAIUsage(usage: {
    model: string;
    tokens: number;
    cost: number;
    duration: number;
  }) {
    this.aiUsageCounter.add(1, {
      model: usage.model,
      success: "true",
    });

    // Track costs and performance
    this.meter.createHistogram("ai_cost_usd").record(usage.cost, {
      model: usage.model,
    });

    this.meter.createHistogram("ai_duration_ms").record(usage.duration, {
      model: usage.model,
    });
  }

  // Track business conversion funnel
  recordConversionEvent(
    event: "estimate_created" | "estimate_sent" | "estimate_approved",
    metadata: any,
  ) {
    this.meter.createCounter("conversion_funnel_events").add(1, {
      event_type: event,
      ...metadata,
    });
  }
}

export const kpiTracker = new BusinessKPITracker();
```

### Integration with Existing Services

```typescript
// Update existing services to emit business events
// lib/services/estimate-service.ts
import { kpiTracker } from "@/lib/observability/kpi-tracker";

export class EstimateService extends BaseService {
  async createEstimate(data: EstimateData): Promise<Estimate> {
    const estimate = await this.withDatabase(
      () => this.performEstimateCreation(data),
      "create_estimate",
    );

    // Track business KPI
    kpiTracker.recordEstimateCreated({
      id: estimate.id,
      value: estimate.totalPrice,
      type: estimate.buildingType,
      userId: estimate.userId,
    });

    kpiTracker.recordConversionEvent("estimate_created", {
      building_type: estimate.buildingType,
      service_count: estimate.services.length,
    });

    return estimate;
  }
}
```

## Development vs Production Configuration

### Development Setup

```typescript
// lib/observability/exporters/console-exporter.ts
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from "@opentelemetry/sdk-metrics";

export const developmentConfig = {
  tracing: {
    exporter: new ConsoleSpanExporter(),
  },
  metrics: {
    reader: new PeriodicExportingMetricReader({
      exporter: new ConsoleMetricExporter(),
      exportIntervalMillis: 10000, // 10 seconds
    }),
  },
};
```

### Production Ready (Future)

```typescript
// lib/observability/exporters/production-exporter.ts
// Placeholder for future production exporters
// - Jaeger for distributed tracing
// - Prometheus for metrics
// - Grafana for dashboards
export const productionConfig = {
  tracing: {
    // exporter: new JaegerExporter({ ... })
  },
  metrics: {
    // reader: new PrometheusExporter({ ... })
  },
};
```

## Implementation Timeline

### Day 15: OTel Infrastructure (60 minutes)

- [ ] Install OpenTelemetry packages (5 min)
- [ ] Configure SDK with basic tracing (20 min)
- [ ] Set up middleware wrapper (20 min)
- [ ] Test basic span creation (15 min)

### Day 16: Critical Path Instrumentation (15 minutes)

- [ ] Instrument estimate creation API (5 min)
- [ ] Add database query tracing (5 min)
- [ ] Instrument AI service calls (5 min)

### Day 17: Business KPI Tracking (15 minutes)

- [ ] Implement KPI tracker class (10 min)
- [ ] Integrate with estimate service (3 min)
- [ ] Test business metrics collection (2 min)

## Success Metrics

### Technical Metrics

- **Trace Coverage**: 100% of critical API routes traced
- **Span Correlation**: Full request lifecycle visibility
- **Performance Overhead**: <5% latency increase
- **Error Correlation**: 100% of errors captured in spans

### Business Metrics

- **Estimate Creation Rate**: Tracked per hour/day
- **AI Usage Costs**: Per model, per user segment
- **Conversion Funnel**: Estimate → Sent → Approved
- **Performance vs Business Impact**: Correlate technical metrics with business outcomes

## Monitoring & Alerting

### Key Alerts (Post-Implementation)

1. **Slow Database Queries**: >1000ms execution time
2. **AI API Failures**: >5% error rate in 5-minute window
3. **High AI Costs**: >$X per day threshold exceeded
4. **Low Conversion Rate**: <Y% estimates approved in 24h

### Dashboard Layout (Future)

```
┌─────────────────┬─────────────────┬─────────────────┐
│  Request Volume │   Error Rates   │  Response Times │
├─────────────────┼─────────────────┼─────────────────┤
│ Business KPIs   │  AI Usage/Costs │ DB Performance  │
├─────────────────┴─────────────────┴─────────────────┤
│           Distributed Trace View                    │
└─────────────────────────────────────────────────────┘
```

## Integration with Existing Systems

### Performance Monitoring Service

```typescript
// Enhance lib/services/monitoring-service.ts
import { trace } from "@opentelemetry/api";

export class MonitoringService extends BaseService {
  async getMetrics(): Promise<PerformanceMetrics> {
    const span = trace.getActiveSpan();

    // Correlate traditional metrics with trace data
    const metrics = await this.gatherPerformanceData();

    span?.setAttributes({
      "monitoring.cpu_usage": metrics.cpuUsage,
      "monitoring.memory_usage": metrics.memoryUsage,
      "monitoring.active_connections": metrics.dbConnections,
    });

    return metrics;
  }
}
```

### Error Service Integration

```typescript
// lib/services/error-service.ts
import { trace } from "@opentelemetry/api";

export class ErrorService extends BaseService {
  async recordError(error: Error, context: ErrorContext) {
    const span = trace.getActiveSpan();

    // Enrich error with trace context
    const errorRecord = {
      ...context,
      traceId: span?.spanContext().traceId,
      spanId: span?.spanContext().spanId,
      timestamp: Date.now(),
    };

    await this.persistError(errorRecord);
  }
}
```

## Validation & Testing

### Testing OTel Integration

```typescript
// __tests__/observability/otel-integration.test.ts
import { trace } from "@opentelemetry/api";

describe("OpenTelemetry Integration", () => {
  test("should create spans for API routes", async () => {
    const response = await fetch("/api/estimates", { method: "POST" });

    // Verify span was created and contains expected attributes
    expect(mockSpanExporter.getFinishedSpans()).toHaveLength(1);
    expect(mockSpanExporter.getFinishedSpans()[0].name).toBe("create_estimate");
  });
});
```

### Performance Validation

- Measure baseline response times before OTel implementation
- Ensure <5% performance overhead after instrumentation
- Validate that tracing doesn't impact user experience

---

**Next Steps**: Install OTel packages and configure basic SDK (Week 3, Day 15, 60 minutes) to establish observability foundation.
