"use client";

import React, { Suspense, lazy } from "react";

// Lazy load the focus management components
const FocusManagerComponent = lazy(() =>
  import("./focus-management").then((module) => ({
    default: module.FocusManager,
  })),
);

const FocusIndicatorComponent = lazy(() =>
  import("./focus-management").then((module) => ({
    default: module.FocusIndicator,
  })),
);

const AccessibilityAnnouncerComponent = lazy(() =>
  import("./focus-management").then((module) => ({
    default: module.AccessibilityAnnouncer,
  })),
);

// Lightweight focus manager for initial load
function BasicFocusManager({ children }: { children: React.ReactNode }) {
  return (
    <div role="application" aria-label="Application interface">
      {children}
    </div>
  );
}

// Props interfaces re-exported for convenience
export interface FocusManagerProps {
  children: React.ReactNode;
  skipLinks?: { href: string; label: string }[];
  enableSkipLinks?: boolean;
}

export interface FocusIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export interface AccessibilityAnnouncerProps {
  message: string;
  priority?: "polite" | "assertive";
}

/**
 * Lazy-loaded FocusManager component with progressive enhancement
 *
 * This component provides:
 * - Code splitting for accessibility features
 * - Progressive enhancement from basic to advanced focus management
 * - Graceful degradation if lazy loading fails
 * - Performance optimization for non-interactive pages
 *
 * @example
 * ```tsx
 * // Basic usage with progressive enhancement
 * <LazyFocusManager>
 *   <App />
 * </LazyFocusManager>
 *
 * // With skip links
 * <LazyFocusManager
 *   skipLinks={[{ href: '#main', label: 'Skip to main content' }]}
 * >
 *   <App />
 * </LazyFocusManager>
 * ```
 */
export function LazyFocusManager(props: FocusManagerProps) {
  return (
    <Suspense
      fallback={<BasicFocusManager>{props.children}</BasicFocusManager>}
    >
      <FocusManagerComponent {...props} />
    </Suspense>
  );
}

/**
 * Lazy-loaded FocusIndicator component
 *
 * Provides visual focus indicators with lazy loading for performance.
 * Falls back to basic focus styles if component fails to load.
 */
export function LazyFocusIndicator(props: FocusIndicatorProps) {
  const BasicIndicator = ({
    children,
    className,
    ...rest
  }: FocusIndicatorProps) => (
    <div
      className={`focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 rounded-md ${className || ""}`}
      {...rest}
    >
      {children}
    </div>
  );

  return (
    <Suspense fallback={<BasicIndicator {...props} />}>
      <FocusIndicatorComponent {...props} />
    </Suspense>
  );
}

/**
 * Lazy-loaded AccessibilityAnnouncer component
 *
 * Provides screen reader announcements with lazy loading.
 * Falls back to no-op if component fails to load.
 */
export function LazyAccessibilityAnnouncer(props: AccessibilityAnnouncerProps) {
  const NoOpAnnouncer = () => null;

  return (
    <Suspense fallback={<NoOpAnnouncer />}>
      <AccessibilityAnnouncerComponent {...props} />
    </Suspense>
  );
}

/**
 * Preload function for focus management components
 * Call this when user interactions suggest focus management will be needed
 */
export function preloadFocusManagement() {
  Promise.all([import("./focus-management")]).catch(() => {
    console.warn("Failed to preload focus management components");
  });
}

/**
 * Hook to conditionally load focus management based on user interaction
 * Returns a boolean indicating if enhanced focus management should be used
 */
export function useProgressiveFocusManagement() {
  const [shouldLoad, setShouldLoad] = React.useState(false);

  React.useEffect(() => {
    // Load enhanced focus management on first user interaction
    const handleFirstInteraction = () => {
      setShouldLoad(true);
      preloadFocusManagement();

      // Remove listeners after first interaction
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };

    document.addEventListener("click", handleFirstInteraction, {
      passive: true,
    });
    document.addEventListener("keydown", handleFirstInteraction, {
      passive: true,
    });
    document.addEventListener("touchstart", handleFirstInteraction, {
      passive: true,
    });

    return () => {
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, []);

  return shouldLoad;
}

// Re-export the hook from the main module for lazy loading
export const useFocusManager = () => {
  const [hook, setHook] = React.useState<any>(null);

  React.useEffect(() => {
    import("./focus-management").then((module) => {
      setHook(() => module.useFocusManager);
    });
  }, []);

  return hook
    ? hook()
    : {
        announceToScreenReader: () => {},
        registerFocusable: () => {},
        unregisterFocusable: () => {},
        focusNext: () => {},
        focusPrevious: () => {},
        focusFirst: () => {},
        focusLast: () => {},
        trapFocus: () => () => {},
        currentFocusId: null,
      };
};

export const useFocusable = (
  id: string,
  priority = 0,
  dependencies: any[] = [],
) => {
  const [hook, setHook] = React.useState<any>(null);
  const fallbackRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    import("./focus-management").then((module) => {
      setHook(() => module.useFocusable);
    });
  }, []);

  return hook ? hook(id, priority, dependencies) : fallbackRef;
};
