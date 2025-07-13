import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'

type WebVitalMetric = {
  name: string
  value: number
  id: string
  delta: number
}

export function reportWebVitals(onPerfEntry?: (metric: WebVitalMetric) => void) {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    onCLS(onPerfEntry)
    onINP(onPerfEntry) // INP replaced FID
    onFCP(onPerfEntry)
    onLCP(onPerfEntry)
    onTTFB(onPerfEntry)
  }
}

export function logWebVitals(metric: WebVitalMetric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`${metric.name}: ${metric.value}`)
  }
  
  // Send to analytics in production
  if (process.env.NODE_ENV === 'production') {
    // Send to your analytics service
    // Example: Google Analytics, Vercel Analytics, etc.
    if (typeof window !== 'undefined' && 'gtag' in window) {
      ;(window as any).gtag('event', metric.name, {
        value: Math.round(metric.value),
        event_label: metric.id,
        non_interaction: true,
      })
    }
  }
}