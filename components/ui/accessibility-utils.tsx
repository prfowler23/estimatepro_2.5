/**
 * Accessibility Utilities for EstimatePro UI Components
 *
 * This module provides comprehensive accessibility enhancements including
 * ARIA attributes, screen reader support, keyboard navigation, and WCAG AA compliance.
 */

import React from "react";

// ARIA live region types
export type LiveRegionPoliteness = "off" | "polite" | "assertive";

// Screen reader announcement interface
export interface AnnouncementOptions {
  /** The message to announce to screen readers */
  message: string;
  /** How urgently the message should be announced */
  priority?: LiveRegionPoliteness;
  /** Clear previous announcements before making new one */
  clear?: boolean;
  /** Delay before making the announcement (ms) */
  delay?: number;
}

// Keyboard navigation directions
export type NavigationDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "home"
  | "end";

// Focus management options
export interface FocusOptions {
  /** Whether to scroll the element into view */
  preventScroll?: boolean;
  /** Custom focus selector within the target */
  selector?: string;
  /** Delay before focusing (ms) */
  delay?: number;
}

// ARIA describedby manager for dynamic descriptions
class AriaDescriptionManager {
  private static instance: AriaDescriptionManager;
  private descriptions = new Map<string, string>();
  private elements = new Map<string, HTMLElement>();

  static getInstance(): AriaDescriptionManager {
    if (!AriaDescriptionManager.instance) {
      AriaDescriptionManager.instance = new AriaDescriptionManager();
    }
    return AriaDescriptionManager.instance;
  }

  /**
   * Registers a description for an element
   */
  registerDescription(elementId: string, description: string): string {
    const descriptionId = `${elementId}-description`;
    this.descriptions.set(descriptionId, description);

    // Create or update description element
    let descElement = document.getElementById(descriptionId);
    if (!descElement) {
      descElement = document.createElement("div");
      descElement.id = descriptionId;
      descElement.className = "sr-only";
      document.body.appendChild(descElement);
    }

    descElement.textContent = description;
    this.elements.set(descriptionId, descElement);

    return descriptionId;
  }

  /**
   * Updates a description
   */
  updateDescription(descriptionId: string, description: string): void {
    this.descriptions.set(descriptionId, description);
    const element = this.elements.get(descriptionId);
    if (element) {
      element.textContent = description;
    }
  }

  /**
   * Removes a description
   */
  removeDescription(descriptionId: string): void {
    this.descriptions.delete(descriptionId);
    const element = this.elements.get(descriptionId);
    if (element) {
      element.remove();
      this.elements.delete(descriptionId);
    }
  }
}

// Global announcement manager
class AnnouncementManager {
  private static instance: AnnouncementManager;
  private liveRegions = new Map<LiveRegionPoliteness, HTMLElement>();

  static getInstance(): AnnouncementManager {
    if (!AnnouncementManager.instance) {
      AnnouncementManager.instance = new AnnouncementManager();
      AnnouncementManager.instance.initialize();
    }
    return AnnouncementManager.instance;
  }

  private initialize() {
    if (typeof window === "undefined") return;

    // Create live regions for different priority levels
    const priorities: LiveRegionPoliteness[] = ["polite", "assertive"];

    priorities.forEach((priority) => {
      const region = document.createElement("div");
      region.setAttribute("aria-live", priority);
      region.setAttribute("aria-atomic", "true");
      region.className = "sr-only";
      region.id = `live-region-${priority}`;
      document.body.appendChild(region);
      this.liveRegions.set(priority, region);
    });
  }

  /**
   * Makes an announcement to screen readers
   */
  announce(options: AnnouncementOptions): void {
    const { message, priority = "polite", clear = false, delay = 0 } = options;

    const performAnnouncement = () => {
      const region = this.liveRegions.get(priority);
      if (!region) return;

      if (clear) {
        region.textContent = "";
        // Small delay to ensure screen reader notices the clear
        setTimeout(() => {
          region.textContent = message;
        }, 50);
      } else {
        region.textContent = message;
      }
    };

    if (delay > 0) {
      setTimeout(performAnnouncement, delay);
    } else {
      performAnnouncement();
    }
  }
}

/**
 * Hook for managing ARIA descriptions
 */
export function useAriaDescription(elementId: string, description?: string) {
  const descriptionManager = React.useMemo(
    () => AriaDescriptionManager.getInstance(),
    [],
  );
  const [descriptionId, setDescriptionId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (description && elementId) {
      const id = descriptionManager.registerDescription(elementId, description);
      setDescriptionId(id);

      return () => {
        descriptionManager.removeDescription(id);
      };
    }
  }, [elementId, description, descriptionManager]);

  const updateDescription = React.useCallback(
    (newDescription: string) => {
      if (descriptionId) {
        descriptionManager.updateDescription(descriptionId, newDescription);
      }
    },
    [descriptionId, descriptionManager],
  );

  return {
    descriptionId,
    updateDescription,
  };
}

/**
 * Hook for screen reader announcements
 */
export function useAnnouncer() {
  const announcer = React.useMemo(() => AnnouncementManager.getInstance(), []);

  const announce = React.useCallback(
    (message: string, options: Omit<AnnouncementOptions, "message"> = {}) => {
      announcer.announce({ message, ...options });
    },
    [announcer],
  );

  // Convenience methods for different announcement types
  const announcePolite = React.useCallback(
    (message: string, delay?: number) => {
      announce(message, { priority: "polite", delay });
    },
    [announce],
  );

  const announceAssertive = React.useCallback(
    (message: string, delay?: number) => {
      announce(message, { priority: "assertive", delay });
    },
    [announce],
  );

  const announceSuccess = React.useCallback(
    (message: string) => {
      announce(`Success: ${message}`, { priority: "polite", delay: 500 });
    },
    [announce],
  );

  const announceError = React.useCallback(
    (message: string) => {
      announce(`Error: ${message}`, { priority: "assertive", clear: true });
    },
    [announce],
  );

  const announceLoading = React.useCallback(
    (message: string = "Loading...") => {
      announce(message, { priority: "polite" });
    },
    [announce],
  );

  return {
    announce,
    announcePolite,
    announceAssertive,
    announceSuccess,
    announceError,
    announceLoading,
  };
}

/**
 * Hook for enhanced keyboard navigation
 */
export function useKeyboardNavigation<T extends HTMLElement = HTMLElement>(
  options: {
    /** Elements to navigate between */
    elements?: T[];
    /** Navigation orientation */
    orientation?: "horizontal" | "vertical" | "both";
    /** Whether navigation should wrap around */
    wrap?: boolean;
    /** Custom key handlers */
    onKeyDown?: (
      event: React.KeyboardEvent<T>,
      direction?: NavigationDirection,
    ) => void;
    /** Whether to enable arrow key navigation */
    enableArrowKeys?: boolean;
    /** Whether to enable home/end keys */
    enableHomeEnd?: boolean;
  } = {},
) {
  const {
    elements = [],
    orientation = "both",
    wrap = true,
    onKeyDown,
    enableArrowKeys = true,
    enableHomeEnd = true,
  } = options;

  const [currentIndex, setCurrentIndex] = React.useState(0);

  const navigateToIndex = React.useCallback(
    (index: number) => {
      if (elements.length === 0) return;

      let targetIndex = index;
      if (wrap) {
        targetIndex =
          ((index % elements.length) + elements.length) % elements.length;
      } else {
        targetIndex = Math.max(0, Math.min(index, elements.length - 1));
      }

      setCurrentIndex(targetIndex);
      elements[targetIndex]?.focus();
    },
    [elements, wrap],
  );

  const navigate = React.useCallback(
    (direction: NavigationDirection) => {
      switch (direction) {
        case "up":
          if (orientation === "horizontal") return;
          navigateToIndex(currentIndex - 1);
          break;
        case "down":
          if (orientation === "horizontal") return;
          navigateToIndex(currentIndex + 1);
          break;
        case "left":
          if (orientation === "vertical") return;
          navigateToIndex(currentIndex - 1);
          break;
        case "right":
          if (orientation === "vertical") return;
          navigateToIndex(currentIndex + 1);
          break;
        case "home":
          navigateToIndex(0);
          break;
        case "end":
          navigateToIndex(elements.length - 1);
          break;
      }
    },
    [currentIndex, navigateToIndex, orientation],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<T>) => {
      let direction: NavigationDirection | undefined;

      if (enableArrowKeys) {
        switch (event.key) {
          case "ArrowUp":
            direction = "up";
            break;
          case "ArrowDown":
            direction = "down";
            break;
          case "ArrowLeft":
            direction = "left";
            break;
          case "ArrowRight":
            direction = "right";
            break;
        }
      }

      if (enableHomeEnd) {
        switch (event.key) {
          case "Home":
            direction = "home";
            break;
          case "End":
            direction = "end";
            break;
        }
      }

      if (direction) {
        event.preventDefault();
        navigate(direction);
      }

      onKeyDown?.(event, direction);
    },
    [navigate, onKeyDown, enableArrowKeys, enableHomeEnd],
  );

  return {
    currentIndex,
    navigate,
    navigateToIndex,
    handleKeyDown,
  };
}

/**
 * Hook for focus management with enhanced options
 */
export function useFocusManagement() {
  const focusElement = React.useCallback(
    (element: HTMLElement | null, options: FocusOptions = {}) => {
      if (!element) return;

      const { preventScroll = false, selector, delay = 0 } = options;

      const performFocus = () => {
        const targetElement = selector
          ? (element.querySelector(selector) as HTMLElement)
          : element;
        if (targetElement) {
          targetElement.focus({ preventScroll });
        }
      };

      if (delay > 0) {
        setTimeout(performFocus, delay);
      } else {
        performFocus();
      }
    },
    [],
  );

  const focusById = React.useCallback(
    (id: string, options: FocusOptions = {}) => {
      const element = document.getElementById(id);
      focusElement(element, options);
    },
    [focusElement],
  );

  const focusFirst = React.useCallback(
    (container: HTMLElement, options: FocusOptions = {}) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const firstElement = focusableElements[0] as HTMLElement;
      focusElement(firstElement, options);
    },
    [focusElement],
  );

  const focusLast = React.useCallback(
    (container: HTMLElement, options: FocusOptions = {}) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;
      focusElement(lastElement, options);
    },
    [focusElement],
  );

  return {
    focusElement,
    focusById,
    focusFirst,
    focusLast,
  };
}

/**
 * Hook for reduced motion preferences
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Component for creating accessible live regions
 */
export interface LiveRegionProps {
  /** Content to announce */
  children: React.ReactNode;
  /** How urgently content should be announced */
  politeness?: LiveRegionPoliteness;
  /** Whether announcements should be atomic */
  atomic?: boolean;
  /** Whether the region is relevant */
  relevant?: "additions" | "removals" | "text" | "all";
  /** Additional className */
  className?: string;
}

export const LiveRegion = React.forwardRef<HTMLDivElement, LiveRegionProps>(
  (
    {
      children,
      politeness = "polite",
      atomic = true,
      relevant = "all",
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        aria-live={politeness}
        aria-atomic={atomic}
        aria-relevant={relevant}
        className={`sr-only ${className || ""}`}
        {...props}
      >
        {children}
      </div>
    );
  },
);
LiveRegion.displayName = "LiveRegion";

/**
 * Component for skip links
 */
export interface SkipLinkProps {
  /** Target element ID to skip to */
  href: string;
  /** Link text content */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

export const SkipLink = React.forwardRef<HTMLAnchorElement, SkipLinkProps>(
  ({ href, children, className, ...props }, ref) => {
    return (
      <a
        ref={ref}
        href={href}
        className={`sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:no-underline ${className || ""}`}
        {...props}
      >
        {children}
      </a>
    );
  },
);
SkipLink.displayName = "SkipLink";

/**
 * Utility functions for WCAG compliance
 */
export const accessibilityUtils = {
  /**
   * Generates accessible IDs for form elements
   */
  generateId: (prefix: string = "element"): string => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Checks if an element is focusable
   */
  isFocusable: (element: HTMLElement): boolean => {
    const focusableSelectors = [
      "button:not([disabled])",
      "[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ];

    return focusableSelectors.some((selector) => element.matches(selector));
  },

  /**
   * Gets all focusable elements within a container
   */
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll(focusableSelector));
  },

  /**
   * Creates ARIA attributes object
   */
  createAriaAttributes: (options: {
    label?: string;
    labelledBy?: string;
    describedBy?: string;
    expanded?: boolean;
    selected?: boolean;
    checked?: boolean;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    readonly?: boolean;
    hidden?: boolean;
  }) => {
    const attributes: Record<string, any> = {};

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        const ariaKey =
          key === "label"
            ? "aria-label"
            : key === "labelledBy"
              ? "aria-labelledby"
              : key === "describedBy"
                ? "aria-describedby"
                : `aria-${key.toLowerCase()}`;
        attributes[ariaKey] = value;
      }
    });

    return attributes;
  },

  /**
   * Announces content to screen readers
   */
  announce: (message: string, priority: LiveRegionPoliteness = "polite") => {
    AnnouncementManager.getInstance().announce({ message, priority });
  },
};

/**
 * Higher-order component for adding accessibility features
 */
export function withAccessibility<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: {
    announceOnMount?: string;
    generateIds?: string[];
    defaultAriaAttributes?: Record<string, any>;
  } = {},
) {
  const WrappedComponent = React.forwardRef<any, T>((props, ref) => {
    const { announce } = useAnnouncer();
    const {
      announceOnMount,
      generateIds = [],
      defaultAriaAttributes = {},
    } = options;

    // Generate IDs for accessibility
    const generatedIds = React.useMemo(() => {
      return generateIds.reduce(
        (acc, idKey) => {
          acc[idKey] = accessibilityUtils.generateId(idKey);
          return acc;
        },
        {} as Record<string, string>,
      );
    }, []);

    // Announce on mount if specified
    React.useEffect(() => {
      if (announceOnMount) {
        announce(announceOnMount, { delay: 1000 });
      }
    }, [announce, announceOnMount]);

    const enhancedProps = {
      ...props,
      ...defaultAriaAttributes,
      ...generatedIds,
    };

    return <Component ref={ref} {...enhancedProps} />;
  });

  WrappedComponent.displayName = `withAccessibility(${Component.displayName || Component.name})`;
  return WrappedComponent;
}
