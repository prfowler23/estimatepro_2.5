/**
 * Help System Configuration
 * Centralized configuration for the contextual help system
 */

export interface HelpSystemConfig {
  // Timing configurations
  timings: {
    hesitationTimeout: number; // milliseconds before hesitation is detected
    tooltipDelay: number; // delay before tooltip appears
    tutorialStepDelay: number; // delay between tutorial steps
    autoHideDelay: number; // auto-hide tooltip delay
    activityCheckInterval: number; // activity tracking interval
  };

  // Behavioral tracking
  tracking: {
    enableBehaviorTracking: boolean;
    enableAnalytics: boolean;
    trackingEvents: string[];
    sessionTimeoutMinutes: number;
    maxStoredSessions: number;
  };

  // UI preferences
  ui: {
    maxTooltipWidth: number;
    maxPanelHeight: number;
    animationDuration: number;
    enableAnimations: boolean;
    compactMode: boolean;
    position: {
      tooltip: "auto" | "top" | "bottom" | "left" | "right";
      panel: "floating" | "sidebar" | "inline";
      tutorial: "center" | "follow";
    };
    zIndex: {
      tooltip: number;
      panel: number;
      tutorial: number;
      overlay: number;
    };
  };

  // Content management
  content: {
    maxHelpItems: number;
    maxSuggestions: number;
    maxTutorials: number;
    cacheTimeout: number; // milliseconds
    enableCaching: boolean;
    priorityThreshold: number; // minimum priority to show
  };

  // Performance settings
  performance: {
    debounceResize: number;
    debounceScroll: number;
    debounceActivity: number;
    enableVirtualization: boolean;
    batchSize: number;
    maxConcurrentRequests: number;
  };

  // Accessibility settings
  accessibility: {
    enableKeyboardNavigation: boolean;
    enableScreenReader: boolean;
    enableHighContrast: boolean;
    focusVisible: boolean;
    announceChanges: boolean;
  };

  // Mobile settings
  mobile: {
    enableTouchGestures: boolean;
    swipeThreshold: number;
    touchTargetSize: number;
    adaptiveTooltips: boolean;
    bottomNavOffset: number;
  };

  // Feature flags
  features: {
    enableSmartSuggestions: boolean;
    enableInteractiveTutorials: boolean;
    enableContextualPanels: boolean;
    enableBehavioralTriggers: boolean;
    enableAiIntegration: boolean;
    enableOfflineMode: boolean;
  };

  // Development settings
  development: {
    enableDebugMode: boolean;
    showPerformanceMetrics: boolean;
    enableHotReload: boolean;
    logLevel: "error" | "warn" | "info" | "debug";
    enableTestMode: boolean;
  };
}

/**
 * Default configuration for the help system
 */
export const DEFAULT_HELP_CONFIG: HelpSystemConfig = {
  timings: {
    hesitationTimeout: 30000, // 30 seconds
    tooltipDelay: 500, // 0.5 seconds
    tutorialStepDelay: 1000, // 1 second
    autoHideDelay: 5000, // 5 seconds
    activityCheckInterval: 1000, // 1 second
  },

  tracking: {
    enableBehaviorTracking: true,
    enableAnalytics: true,
    trackingEvents: [
      "help_show",
      "help_hide",
      "help_helpful",
      "help_not_helpful",
      "tutorial_start",
      "tutorial_complete",
      "tutorial_exit",
      "hesitation",
      "error",
      "step_change",
    ],
    sessionTimeoutMinutes: 60,
    maxStoredSessions: 100,
  },

  ui: {
    maxTooltipWidth: 320, // pixels
    maxPanelHeight: 400, // pixels
    animationDuration: 200, // milliseconds
    enableAnimations: true,
    compactMode: false,
    position: {
      tooltip: "auto",
      panel: "floating",
      tutorial: "follow",
    },
    zIndex: {
      tooltip: 50,
      panel: 40,
      tutorial: 60,
      overlay: 55,
    },
  },

  content: {
    maxHelpItems: 10,
    maxSuggestions: 5,
    maxTutorials: 3,
    cacheTimeout: 300000, // 5 minutes
    enableCaching: true,
    priorityThreshold: 3,
  },

  performance: {
    debounceResize: 100,
    debounceScroll: 50,
    debounceActivity: 300,
    enableVirtualization: false,
    batchSize: 5,
    maxConcurrentRequests: 3,
  },

  accessibility: {
    enableKeyboardNavigation: true,
    enableScreenReader: true,
    enableHighContrast: false,
    focusVisible: true,
    announceChanges: true,
  },

  mobile: {
    enableTouchGestures: true,
    swipeThreshold: 50, // pixels
    touchTargetSize: 44, // pixels (iOS recommendation)
    adaptiveTooltips: true,
    bottomNavOffset: 80, // pixels
  },

  features: {
    enableSmartSuggestions: true,
    enableInteractiveTutorials: true,
    enableContextualPanels: true,
    enableBehavioralTriggers: true,
    enableAiIntegration: true,
    enableOfflineMode: false,
  },

  development: {
    enableDebugMode: process.env.NODE_ENV === "development",
    showPerformanceMetrics: false,
    enableHotReload: process.env.NODE_ENV === "development",
    logLevel: process.env.NODE_ENV === "development" ? "debug" : "error",
    enableTestMode: false,
  },
};

/**
 * Environment-specific configuration overrides
 */
export const getHelpConfig = (): HelpSystemConfig => {
  const baseConfig = { ...DEFAULT_HELP_CONFIG };

  // Environment-based overrides
  if (process.env.NEXT_PUBLIC_HELP_DEBUG === "true") {
    baseConfig.development.enableDebugMode = true;
    baseConfig.development.showPerformanceMetrics = true;
  }

  // Mobile detection overrides
  if (typeof window !== "undefined") {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      baseConfig.ui.position.panel = "inline";
      baseConfig.ui.maxTooltipWidth = Math.min(
        baseConfig.ui.maxTooltipWidth,
        window.innerWidth - 32,
      );
      baseConfig.timings.tooltipDelay = 100; // Faster on mobile
    }
  }

  // Performance overrides for slower devices
  if (typeof navigator !== "undefined" && "deviceMemory" in navigator) {
    const deviceMemory = (navigator as any).deviceMemory;
    if (deviceMemory && deviceMemory < 4) {
      baseConfig.ui.enableAnimations = false;
      baseConfig.performance.batchSize = 3;
      baseConfig.content.maxHelpItems = 5;
    }
  }

  // Accessibility overrides
  if (typeof window !== "undefined") {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) {
      baseConfig.ui.enableAnimations = false;
      baseConfig.ui.animationDuration = 0;
    }

    const prefersHighContrast = window.matchMedia(
      "(prefers-contrast: high)",
    ).matches;
    if (prefersHighContrast) {
      baseConfig.accessibility.enableHighContrast = true;
    }
  }

  return baseConfig;
};

/**
 * Validation function for help configuration
 */
export const validateHelpConfig = (
  config: Partial<HelpSystemConfig>,
): string[] => {
  const errors: string[] = [];

  // Validate timings
  if (config.timings) {
    if (config.timings.hesitationTimeout < 5000) {
      errors.push("Hesitation timeout must be at least 5 seconds");
    }
    if (config.timings.tooltipDelay < 0) {
      errors.push("Tooltip delay cannot be negative");
    }
  }

  // Validate UI settings
  if (config.ui) {
    if (config.ui.maxTooltipWidth < 200) {
      errors.push("Maximum tooltip width must be at least 200px");
    }
    if (config.ui.animationDuration < 0) {
      errors.push("Animation duration cannot be negative");
    }
  }

  // Validate content limits
  if (config.content) {
    if (config.content.maxHelpItems < 1) {
      errors.push("Must allow at least 1 help item");
    }
    if (
      config.content.priorityThreshold < 0 ||
      config.content.priorityThreshold > 10
    ) {
      errors.push("Priority threshold must be between 0 and 10");
    }
  }

  return errors;
};

/**
 * Configuration context for React components
 */
export type HelpConfigContext = {
  config: HelpSystemConfig;
  updateConfig: (updates: Partial<HelpSystemConfig>) => void;
  resetConfig: () => void;
};

export default getHelpConfig;
