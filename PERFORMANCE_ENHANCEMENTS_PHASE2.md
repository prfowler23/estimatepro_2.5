# Performance Enhancements - Phase 2

## Current Bundle Analysis Results

After implementing the initial optimizations, we still have opportunities for improvement:

### Largest Chunks Identified

- **6381.js**: 954KB - Likely contains unoptimized dependencies
- **6edf0643.js**: 912KB - Probably a vendor bundle
- **b536a0f1.js**: 640KB - Mixed dependencies
- **a4634e51.js**: 487KB - Large application code

### Additional Optimization Opportunities

## 1. Advanced Code Splitting Strategies

### A. Dynamic Import Granularity

```typescript
// Instead of importing entire modules
import { entireModule } from "large-library";

// Use granular imports
const { specificFunction } = await import("large-library/specific-function");
```

### B. Route-Based Prefetching Strategy

```typescript
// Enhanced RoutePreloader with priority levels
const routePriorities = {
  critical: ["/dashboard", "/estimates/new"],
  high: ["/calculator", "/estimates"],
  medium: ["/3d-demo", "/drone-demo"],
  low: ["/settings", "/analytics"],
};

// Implement progressive prefetching based on user behavior
```

## 2. Bundle Size Reduction Techniques

### A. Tree Shaking Optimization

```javascript
// next.config.mjs enhancement
sideEffects: false, // in package.json
usedExports: true,
optimization: {
  innerGraph: true,
  sideEffects: false,
  providedExports: true,
  usedExports: true,
}
```

### B. Replace Heavy Dependencies

1. **moment.js → date-fns**: ~70% smaller
2. **lodash → lodash-es**: Better tree shaking
3. **xlsx → sheetjs-ce**: Community edition is lighter

### C. Conditional Loading

```typescript
// Load heavy features only when needed
const loadPDFGenerator = () => import("@/lib/pdf/generator");
const loadExcelExport = () => import("@/lib/excel/export");
const load3DViewer = () => import("@/components/visualizer/3d-viewer");
```

## 3. Runtime Performance Optimizations

### A. React Component Optimization

```typescript
// Implement React.memo for expensive components
export const ExpensiveComponent = React.memo(
  ({ data }) => {
    // Component logic
  },
  (prevProps, nextProps) => {
    // Custom comparison logic
    return prevProps.data.id === nextProps.data.id;
  },
);

// Use useMemo and useCallback strategically
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
const memoizedCallback = useCallback(() => doSomething(a, b), [a, b]);
```

### B. Virtual Scrolling for Lists

```typescript
// Implement react-window for large lists
import { FixedSizeList } from 'react-window';

const VirtualizedEstimateList = ({ estimates }) => (
  <FixedSizeList
    height={600}
    itemCount={estimates.length}
    itemSize={80}
    width="100%"
  >
    {({ index, style }) => (
      <EstimateRow style={style} estimate={estimates[index]} />
    )}
  </FixedSizeList>
);
```

## 4. API & Data Fetching Optimizations

### A. Implement React Query with Proper Caching

```typescript
// Optimize data fetching with stale-while-revalidate
const { data, error } = useQuery({
  queryKey: ["estimates", filters],
  queryFn: fetchEstimates,
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
});
```

### B. Implement Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: updateEstimate,
  onMutate: async (newEstimate) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(["estimates"]);

    // Snapshot previous value
    const previousEstimates = queryClient.getQueryData(["estimates"]);

    // Optimistically update
    queryClient.setQueryData(["estimates"], (old) => [...old, newEstimate]);

    return { previousEstimates };
  },
  onError: (err, newEstimate, context) => {
    // Rollback on error
    queryClient.setQueryData(["estimates"], context.previousEstimates);
  },
});
```

## 5. Image & Asset Optimization

### A. Implement Progressive Image Loading

```typescript
const ProgressiveImage = ({ src, placeholder, alt }) => {
  const [currentSrc, setCurrentSrc] = useState(placeholder);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setCurrentSrc(src);
  }, [src]);

  return (
    <Image
      src={currentSrc}
      alt={alt}
      placeholder="blur"
      blurDataURL={placeholder}
    />
  );
};
```

### B. Lazy Load Images Below Fold

```typescript
// Use Intersection Observer
const LazyImage = ({ src, alt, ...props }) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { threshold: 0.1 }
    );

    if (imgRef.current) observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef}>
      {isIntersecting && <Image src={src} alt={alt} {...props} />}
    </div>
  );
};
```

## 6. Service Worker & Caching Strategy

### A. Implement Advanced Service Worker

```javascript
// public/sw.js enhancement
const CACHE_NAME = "estimatepro-v2";
const STATIC_CACHE = "static-v2";
const DYNAMIC_CACHE = "dynamic-v2";

// Cache strategies
const cacheStrategies = {
  networkFirst: ["/api/", "/auth/"],
  cacheFirst: ["/static/", "/_next/static/"],
  staleWhileRevalidate: ["/images/", "/fonts/"],
};

// Implement background sync for offline functionality
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-estimates") {
    event.waitUntil(syncEstimates());
  }
});
```

### B. Implement Cache Headers

```typescript
// API route caching
export async function GET() {
  const data = await fetchData();

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=10, stale-while-revalidate=59",
    },
  });
}
```

## 7. Database Query Optimization

### A. Implement Database Connection Pooling

```typescript
// lib/supabase/optimized-client.ts
import { createClient } from "@supabase/supabase-js";

const supabasePool = new Map();

export function getSupabaseClient() {
  const key = `${process.env.NEXT_PUBLIC_SUPABASE_URL}`;

  if (!supabasePool.has(key)) {
    supabasePool.set(
      key,
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          db: { schema: "public" },
          auth: { persistSession: true },
          realtime: { params: { eventsPerSecond: 10 } },
        },
      ),
    );
  }

  return supabasePool.get(key);
}
```

### B. Optimize Database Queries

```typescript
// Use select to fetch only needed columns
const { data } = await supabase
  .from("estimates")
  .select("id, title, status, total_amount, created_at")
  .order("created_at", { ascending: false })
  .limit(10);

// Implement pagination
const PAGE_SIZE = 20;
const { data, count } = await supabase
  .from("estimates")
  .select("*", { count: "exact" })
  .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
```

## 8. Memory Management

### A. Implement Component Cleanup

```typescript
useEffect(() => {
  const subscription = subscribeToUpdates();
  const timer = setInterval(refresh, 30000);

  return () => {
    subscription.unsubscribe();
    clearInterval(timer);
  };
}, []);
```

### B. Prevent Memory Leaks

```typescript
// Use AbortController for fetch requests
useEffect(() => {
  const controller = new AbortController();

  fetch("/api/data", { signal: controller.signal })
    .then((res) => res.json())
    .then((data) => setData(data))
    .catch((err) => {
      if (err.name !== "AbortError") {
        console.error(err);
      }
    });

  return () => controller.abort();
}, []);
```

## 9. Build Configuration Enhancements

### A. Enable SWC Optimizations

```javascript
// next.config.mjs
module.exports = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
    reactRemoveProperties: true,
    styledComponents: true,
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/*",
      "framer-motion",
      "recharts",
      "date-fns",
      "zod",
    ],
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
  },
};
```

### B. Implement Module Federation

```javascript
// For micro-frontend architecture
const { ModuleFederationPlugin } = require("webpack").container;

new ModuleFederationPlugin({
  name: "estimatepro",
  filename: "remoteEntry.js",
  exposes: {
    "./Calculator": "./components/calculator",
    "./Estimator": "./components/estimator",
  },
  shared: {
    react: { singleton: true },
    "react-dom": { singleton: true },
  },
});
```

## 10. Monitoring & Performance Budget

### A. Set Performance Budgets

```javascript
// performance.budget.js
module.exports = {
  bundles: [
    {
      name: "main",
      maxSize: "150kb",
    },
    {
      name: "vendor",
      maxSize: "300kb",
    },
  ],
  metrics: {
    FCP: 1800, // First Contentful Paint
    LCP: 2500, // Largest Contentful Paint
    TTI: 3800, // Time to Interactive
    CLS: 0.1, // Cumulative Layout Shift
  },
};
```

### B. Continuous Monitoring

```typescript
// components/performance/performance-monitor.tsx
export function PerformanceMonitor() {
  useEffect(() => {
    // Monitor long tasks
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn("Long task detected:", entry);
          // Send to analytics
        }
      }
    });

    observer.observe({ entryTypes: ["longtask"] });

    return () => observer.disconnect();
  }, []);

  return null;
}
```

## Implementation Priority

1. **Immediate (High Impact)**
   - Fix large vendor chunks (954KB, 912KB)
   - Implement React Query with proper caching
   - Add virtual scrolling for large lists
   - Optimize database queries

2. **Short Term (1-2 weeks)**
   - Replace heavy dependencies
   - Implement progressive image loading
   - Add service worker enhancements
   - Set up performance monitoring

3. **Long Term (1 month)**
   - Module federation for micro-frontends
   - Advanced prefetching strategies
   - Complete memory optimization
   - Implement performance budgets

## Expected Results

- **Bundle Size**: Additional 30-40% reduction
- **Initial Load Time**: <2s on 3G
- **Time to Interactive**: <2.5s
- **Lighthouse Score**: 95+
- **Memory Usage**: 50% reduction in idle state
