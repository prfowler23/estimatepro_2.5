# Analytics Components - Unified Dashboard

## Overview

The analytics components have been refactored to use a **Unified Analytics Dashboard** that consolidates functionality from three previously separate dashboards into a single, configurable component.

## Migration Guide

### Old Usage (Deprecated)

```tsx
// Basic Dashboard
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
<AnalyticsDashboard userId={userId} teamId={teamId} />;

// Enhanced Dashboard
import { EnhancedAnalyticsDashboard } from "@/components/analytics/enhanced-analytics-dashboard";
<EnhancedAnalyticsDashboard />;

// Consolidated Dashboard
import ConsolidatedAnalyticsDashboard from "@/components/analytics/ConsolidatedAnalyticsDashboard";
<ConsolidatedAnalyticsDashboard />;
```

### New Usage (Recommended)

```tsx
import { UnifiedAnalyticsDashboard } from "@/components/analytics/UnifiedAnalyticsDashboard";

// Basic mode - Standard analytics
<UnifiedAnalyticsDashboard
  mode="basic"
  userId={userId}
  teamId={teamId}
/>

// Enhanced mode - AI-powered analytics
<UnifiedAnalyticsDashboard
  mode="enhanced"
  enableAI={true}
  autoRefresh={true}
/>

// Consolidated mode - Real-time with WebSockets
<UnifiedAnalyticsDashboard
  mode="consolidated"
  enableWebSocket={true}
  enableAI={true}
  refreshInterval={60000}
/>
```

## Configuration

### Dashboard Modes

| Mode           | Description                                | Features                                                      |
| -------------- | ------------------------------------------ | ------------------------------------------------------------- |
| `basic`        | Standard analytics and performance metrics | Charts, filters, export, user stats                           |
| `enhanced`     | AI-powered business intelligence           | AI predictions, insights, recommendations, financial analysis |
| `consolidated` | Real-time with WebSocket connections       | Live metrics, anomaly detection, data quality monitoring      |

### Props

```tsx
interface UnifiedAnalyticsDashboardProps {
  mode?: "basic" | "enhanced" | "consolidated";
  userId?: string;
  teamId?: string;
  className?: string;
  enableWebSocket?: boolean;
  enableAI?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
```

### Feature Flags

Configure features through the dashboard configuration:

```tsx
import {
  getDashboardConfig,
  createCustomConfig,
} from "@/lib/config/analytics-dashboard-config";

// Get default configuration
const config = getDashboardConfig("enhanced");

// Create custom configuration
const customConfig = createCustomConfig("basic", {
  features: {
    ...getDashboardConfig("basic").features,
    aiPredictions: true,
    insights: true,
  },
  refreshInterval: 120000, // 2 minutes
});
```

## API Service

All API calls are now centralized through the Analytics API Service:

```tsx
import { getAnalyticsAPIService } from "@/lib/services/analytics-api-service";

const analyticsAPI = getAnalyticsAPIService();

// Get enhanced analytics
const { data, error } = await analyticsAPI.getEnhancedAnalytics();

// Get real-time metrics
const metrics = await analyticsAPI.getRealTimeMetrics(["revenue", "users"]);

// Export data
const exportResult = await analyticsAPI.exportAnalytics("pdf", data);

// Batch multiple requests
const batchData = await analyticsAPI.batchRequests([
  { key: "metrics", method: () => analyticsAPI.getAnalyticsMetrics(filters) },
  { key: "insights", method: () => analyticsAPI.getPredictiveInsights(userId) },
  {
    key: "benchmarks",
    method: () => analyticsAPI.getWorkflowBenchmarks("time", filters),
  },
]);
```

## Component Structure

```
components/analytics/
├── UnifiedAnalyticsDashboard.tsx    # Main unified dashboard
├── README.md                         # This documentation
│
├── Core Components/
│   ├── MetricCard.tsx               # Metric display cards
│   ├── TimeSeriesChart.tsx          # Time-based charts
│   ├── WorkflowChart.tsx            # Workflow visualization
│   └── UserPerformanceTable.tsx    # User stats table
│
├── Feature Components/
│   ├── InsightPanel.tsx             # AI insights display
│   ├── BenchmarkComparison.tsx      # Benchmark comparisons
│   ├── AlertsPanel.tsx              # System alerts
│   └── ExportDialog.tsx             # Export functionality
│
├── Control Components/
│   ├── AnalyticsFilters.tsx         # Filter controls
│   └── AdvancedFilteringPersonalization.tsx # Advanced filters
│
├── Legacy (Deprecated)/
│   ├── AnalyticsDashboard.tsx       # Use mode="basic"
│   ├── enhanced-analytics-dashboard.tsx # Use mode="enhanced"
│   └── ConsolidatedAnalyticsDashboard.tsx # Use mode="consolidated"
```

## Best Practices

1. **Choose the Right Mode**: Start with `basic` mode and upgrade as needed
2. **Enable Features Gradually**: Use feature flags to enable capabilities
3. **Cache API Calls**: The API service includes built-in caching
4. **Handle Errors**: Always check for errors in API responses
5. **Use TypeScript**: All components are fully typed for better DX

## Performance Optimizations

- **Dynamic Loading**: Enhanced and consolidated modes load on-demand
- **API Caching**: Automatic caching with configurable timeouts
- **Request Batching**: Combine multiple API calls for efficiency
- **WebSocket Management**: Automatic reconnection and error handling
- **Memoization**: Heavy computations are memoized

## Migration Timeline

1. **Phase 1** (Complete): Unified dashboard created, API service implemented
2. **Phase 2** (In Progress): Update all imports to use new components
3. **Phase 3** (Planned): Remove deprecated components
4. **Phase 4** (Future): Add more advanced features and optimizations

## Troubleshooting

### Common Issues

**Issue**: Dashboard not loading

```tsx
// Check if required environment variables are set
NEXT_PUBLIC_ENABLE_AI = true;
NEXT_PUBLIC_ENABLE_WEBSOCKET = true;
```

**Issue**: WebSocket connection failing

```tsx
// Ensure WebSocket is only enabled in consolidated mode
<UnifiedAnalyticsDashboard
  mode="consolidated"
  enableWebSocket={true} // Only works with consolidated mode
/>
```

**Issue**: AI features not working

```tsx
// Verify AI is enabled and API key is configured
<UnifiedAnalyticsDashboard
  mode="enhanced"
  enableAI={true} // Required for AI features
/>
```

## Support

For questions or issues with the analytics components:

1. Check this documentation
2. Review the TypeScript types for detailed prop information
3. Check the console for error messages
4. File an issue with reproduction steps
