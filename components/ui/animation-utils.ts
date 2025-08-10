/**
 * Standardized Animation Utilities for EstimatePro UI Components
 *
 * This module provides consistent animation patterns, performance optimizations,
 * and accessibility considerations for Framer Motion animations across the UI system.
 */

import { Variants, Transition, Target, Easing } from "framer-motion";

// Performance-optimized easing functions
export const easings = {
  // Standard easing curves
  ease: [0.25, 0.46, 0.45, 0.94] as Easing,
  easeIn: [0.42, 0, 1, 1] as Easing,
  easeOut: [0, 0, 0.58, 1] as Easing,
  easeInOut: [0.42, 0, 0.58, 1] as Easing,

  // Smooth animations for mobile
  smoothOut: [0.16, 1, 0.3, 1] as Easing,
  smoothIn: [0.7, 0, 0.84, 0] as Easing,

  // Bouncy animations for feedback
  bounce: [0.68, -0.55, 0.265, 1.55] as Easing,

  // Elastic for spring-like effects
  elastic: [0.68, -0.6, 0.32, 1.6] as Easing,
} as const;

// Standard durations for consistent timing
export const durations = {
  instant: 0,
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  slower: 0.6,
} as const;

// Reduced motion detection and configuration with performance monitoring
export const getAnimationConfig = () => {
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  // Performance-aware animation configuration
  const isLowEndDevice =
    typeof navigator !== "undefined" &&
    "connection" in navigator &&
    // @ts-ignore - NetworkInformation types may not be available
    ((navigator as any).connection?.effectiveType === "slow-2g" ||
      (navigator as any).connection?.effectiveType === "2g");

  return {
    prefersReducedMotion,
    isLowEndDevice,
    duration:
      prefersReducedMotion || isLowEndDevice
        ? durations.instant
        : durations.normal,
    ease:
      prefersReducedMotion || isLowEndDevice ? easings.ease : easings.smoothOut,
  };
};

// Standard transitions
export const transitions = {
  default: {
    type: "tween" as const,
    duration: durations.normal,
    ease: easings.smoothOut,
  },
  fast: {
    type: "tween" as const,
    duration: durations.fast,
    ease: easings.ease,
  },
  spring: {
    type: "spring" as const,
    stiffness: 500,
    damping: 30,
    mass: 0.5,
  },
  springBouncy: {
    type: "spring" as const,
    stiffness: 400,
    damping: 25,
    mass: 1,
  },
  smoothSpring: {
    type: "spring" as const,
    stiffness: 300,
    damping: 25,
    mass: 0.8,
  },
} as const;

// Common animation variants
export const fadeVariants: Variants = {
  hidden: {
    opacity: 0,
    transition: transitions.fast,
  },
  visible: {
    opacity: 1,
    transition: transitions.default,
  },
};

export const slideVariants: Variants = {
  hiddenUp: {
    opacity: 0,
    y: -20,
    transition: transitions.fast,
  },
  hiddenDown: {
    opacity: 0,
    y: 20,
    transition: transitions.fast,
  },
  hiddenLeft: {
    opacity: 0,
    x: -20,
    transition: transitions.fast,
  },
  hiddenRight: {
    opacity: 0,
    x: 20,
    transition: transitions.fast,
  },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: transitions.smoothSpring,
  },
};

export const scaleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    transition: transitions.fast,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.spring,
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

// Hover and tap animations
export const interactionVariants = {
  hover: {
    scale: 1.02,
    transition: transitions.fast,
  },
  tap: {
    scale: 0.98,
    transition: transitions.fast,
  },
  pressed: {
    scale: 0.95,
    transition: transitions.fast,
  },
};

// Loading and progress animations
export const loadingVariants: Variants = {
  loading: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

export const pulseVariants: Variants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: easings.easeInOut,
    },
  },
};

// Modal and overlay animations
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: transitions.fast,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.smoothSpring,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: transitions.fast,
  },
};

export const overlayVariants: Variants = {
  hidden: {
    opacity: 0,
    transition: transitions.fast,
  },
  visible: {
    opacity: 1,
    transition: transitions.default,
  },
  exit: {
    opacity: 0,
    transition: transitions.fast,
  },
};

// List and grid item animations
export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -10,
    transition: transitions.fast,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.default,
  },
  exit: {
    opacity: 0,
    x: 10,
    scale: 0.95,
    transition: transitions.fast,
  },
};

// Notification and alert animations
export const notificationVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -50,
    scale: 0.95,
    transition: transitions.fast,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transitions.smoothSpring,
  },
  exit: {
    opacity: 0,
    y: -50,
    scale: 0.95,
    transition: transitions.fast,
  },
};

// Utility functions for creating custom animations

/**
 * Creates a responsive animation that adapts to device capabilities
 */
export function createResponsiveAnimation(
  baseAnimation: Target,
  options: {
    reducedMotion?: Target;
    mobile?: Target;
  } = {},
): Target {
  const config = getAnimationConfig();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  if (config.prefersReducedMotion) {
    return options.reducedMotion || { opacity: 1 };
  }

  if (isMobile && options.mobile) {
    return options.mobile;
  }

  return baseAnimation;
}

/**
 * Creates a staggered animation for lists
 */
export function createStaggerAnimation(
  childVariants: Variants,
  staggerDelay: number = 0.1,
): Variants {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };
}

/**
 * Creates an entrance animation with optional delay
 */
export function createEntranceAnimation(
  direction: "up" | "down" | "left" | "right" | "fade" | "scale" = "up",
  delay: number = 0,
): Variants {
  const baseTransition = {
    ...transitions.smoothSpring,
    delay,
  };

  switch (direction) {
    case "up":
      return {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: baseTransition },
      };
    case "down":
      return {
        hidden: { opacity: 0, y: -20 },
        visible: { opacity: 1, y: 0, transition: baseTransition },
      };
    case "left":
      return {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: baseTransition },
      };
    case "right":
      return {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0, transition: baseTransition },
      };
    case "scale":
      return {
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1, transition: baseTransition },
      };
    case "fade":
    default:
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: baseTransition },
      };
  }
}

/**
 * Creates a cleanup function for animation listeners
 */
export function createAnimationCleanup(
  element: HTMLElement | null,
  listeners: Array<{ event: string; handler: EventListener }>,
): () => void {
  if (!element) return () => {};

  listeners.forEach(({ event, handler }) => {
    element.addEventListener(event, handler);
  });

  return () => {
    listeners.forEach(({ event, handler }) => {
      element.removeEventListener(event, handler);
    });
  };
}

/**
 * Optimized viewport detection for animation triggering
 */
export const viewportOptions = {
  once: true,
  amount: 0.3,
  margin: "0px 0px -100px 0px",
} as const;

/**
 * Animation presets for common UI patterns
 */
export const presets = {
  // Button animations
  button: {
    whileHover: interactionVariants.hover,
    whileTap: interactionVariants.tap,
    transition: transitions.fast,
  },

  // Card animations
  card: {
    initial: "hidden",
    animate: "visible",
    variants: slideVariants,
    viewport: viewportOptions,
  },

  // Modal animations
  modal: {
    initial: "hidden",
    animate: "visible",
    exit: "exit",
    variants: modalVariants,
  },

  // List item animations
  listItem: {
    initial: "hidden",
    animate: "visible",
    exit: "exit",
    variants: listItemVariants,
    layout: true,
  },

  // Loading animations
  spinner: {
    animate: "loading",
    variants: loadingVariants,
  },

  // Pulse animations
  pulse: {
    animate: "pulse",
    variants: pulseVariants,
  },
} as const;

// Export type for better TypeScript support
export type AnimationPreset = keyof typeof presets;
export type EasingType = keyof typeof easings;
export type DurationType = keyof typeof durations;
export type TransitionType = keyof typeof transitions;
