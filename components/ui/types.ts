/**
 * UI Component Type Utilities
 *
 * Provides enhanced TypeScript utilities for better developer experience
 * and type safety across the EstimatePro UI system.
 */

import { type VariantProps } from "class-variance-authority";
import React from "react";

// Enhanced component prop types for better DX
export type ComponentSize = "xs" | "sm" | "default" | "lg" | "xl";
export type ComponentVariant = "default" | "secondary" | "outline" | "ghost";
export type ComponentState =
  | "default"
  | "loading"
  | "error"
  | "success"
  | "disabled";

// Accessibility enhancement types
export interface AccessibilityProps {
  /** Custom ARIA label for screen readers */
  ariaLabel?: string;
  /** ARIA description for additional context */
  ariaDescribedBy?: string;
  /** Announce state changes to screen readers */
  announceChanges?: boolean;
  /** Custom announcement message */
  customAnnouncement?: string;
}

// Performance enhancement types
export interface PerformanceProps {
  /** Respect user's motion preferences */
  respectMotionPreferences?: boolean;
  /** Debounce event handlers (ms) */
  debounceMs?: number;
  /** Enable performance monitoring */
  enableProfiling?: boolean;
}

// Animation enhancement types
export interface AnimationProps {
  /** Enable/disable animations */
  animate?: boolean;
  /** Custom motion props */
  motionProps?: Record<string, unknown>;
  /** Animation preset */
  animationPreset?: "fade" | "slide" | "scale" | "bounce";
}

// Enhanced base component props
export interface EnhancedComponentProps
  extends AccessibilityProps,
    PerformanceProps,
    AnimationProps {
  /** Component size variant */
  size?: ComponentSize;
  /** Component visual variant */
  variant?: ComponentVariant;
  /** Component state */
  state?: ComponentState;
  /** Additional CSS classes */
  className?: string;
  /** Component children */
  children?: React.ReactNode;
}

// Utility type for extracting variant props from CVA
export type ExtractVariantProps<T> = T extends (...args: any[]) => any
  ? VariantProps<T>
  : never;

// Utility type for combining component props
export type CombineProps<T, U> = T &
  U & {
    [K in keyof T & keyof U]: T[K] | U[K];
  };

// Utility type for polymorphic components
export type PolymorphicProps<T extends React.ElementType, P = {}> = P &
  Omit<React.ComponentPropsWithoutRef<T>, keyof P> & {
    as?: T;
    asChild?: boolean;
  };

// Enhanced ref forwarding type
export type ForwardRefComponent<T, P = {}> = React.ForwardRefExoticComponent<
  P & React.RefAttributes<T>
>;

// Component composition utilities
export type CompoundComponent<T> = T & {
  displayName?: string;
};

// Event handler enhancement types
export interface EnhancedEventHandlers {
  /** Enhanced click handler with loading state */
  onEnhancedClick?: (
    event: React.MouseEvent,
    meta: { loading: boolean; disabled: boolean },
  ) => void;
  /** Enhanced change handler with validation */
  onEnhancedChange?: (value: string, isValid: boolean) => void;
  /** Enhanced focus handler with analytics */
  onEnhancedFocus?: (
    event: React.FocusEvent,
    analytics: { timestamp: number },
  ) => void;
}

// Validation enhancement types
export interface ValidationProps {
  /** Validation rules */
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean | string;
  };
  /** Real-time validation */
  validateOnChange?: boolean;
  /** Validation debounce delay */
  validationDebounce?: number;
}

// Loading state types
export interface LoadingProps {
  /** Loading state */
  loading?: boolean;
  /** Loading text */
  loadingText?: string;
  /** Loading spinner variant */
  loadingVariant?: "spinner" | "pulse" | "skeleton";
}

// Enhanced theme types for industrial design system
export type IndustrialTheme = {
  colors: {
    dustyBlue: string;
    sandyBeige: string;
    warmTaupe: string;
    darkCharcoal: string;
  };
  gradients: {
    primary: string;
    secondary: string;
    warm: string;
    cool: string;
  };
  animations: {
    duration: Record<string, number>;
    easing: Record<string, string>;
  };
};

// Type guards for better runtime safety
export const isComponentSize = (value: string): value is ComponentSize => {
  return ["xs", "sm", "default", "lg", "xl"].includes(value);
};

export const isComponentVariant = (
  value: string,
): value is ComponentVariant => {
  return ["default", "secondary", "outline", "ghost"].includes(value);
};

export const isComponentState = (value: string): value is ComponentState => {
  return ["default", "loading", "error", "success", "disabled"].includes(value);
};
