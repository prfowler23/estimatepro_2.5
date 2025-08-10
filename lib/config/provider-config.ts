/**
 * Provider configuration constants
 * Centralized configuration for all application providers
 */

export const QUERY_CLIENT_CONFIG = {
  queries: {
    // Cache data for 5 minutes before considering stale
    staleTime: 5 * 60 * 1000,
    // Keep cached data for 10 minutes before garbage collection
    gcTime: 10 * 60 * 1000,
    // Retry failed requests up to 3 times
    retry: 3,
    // Exponential backoff with max 30 seconds
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
    // Refetch data when window regains focus
    refetchOnWindowFocus: true,
    // Always refetch on reconnect
    refetchOnReconnect: "always" as const,
  },
  mutations: {
    // Retry mutations up to 2 times
    retry: 2,
    // Exponential backoff for mutations
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
  },
} as const;

export const NOTIFICATION_CONFIG = {
  // Maximum number of simultaneous notifications
  maxNotifications: 5,
  // Default position for notifications
  defaultPosition: "top-right" as const,
  // Default duration in milliseconds
  defaultDuration: 5000,
} as const;

export const FOCUS_MANAGEMENT_CONFIG = {
  // Enable skip links for accessibility
  enableSkipLinks: true,
  // Skip link configurations
  skipLinks: [
    { href: "#main-content", label: "Skip to main content" },
    { href: "#navigation", label: "Skip to navigation" },
    { href: "#mobile-nav", label: "Skip to mobile navigation" },
  ],
} as const;

export const THEME_CONFIG = {
  // Default theme setting
  defaultTheme: "system" as const,
  // Local storage key for theme persistence
  storageKey: "estimatepro-theme",
} as const;

export const PROVIDER_OPTIMIZATION_CONFIG = {
  // Enable lazy loading for non-critical providers
  enableLazyLoading: process.env.NODE_ENV === "production",
  // Enable performance monitoring
  enablePerformanceMonitoring: process.env.NODE_ENV === "production",
  // Enable error tracking
  enableErrorTracking: true,
} as const;
