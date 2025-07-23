"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface FocusManagerContextType {
  registerFocusable: (
    element: HTMLElement,
    id: string,
    priority?: number,
  ) => void;
  unregisterFocusable: (id: string) => void;
  focusNext: () => void;
  focusPrevious: () => void;
  focusFirst: () => void;
  focusLast: () => void;
  trapFocus: (container: HTMLElement) => () => void;
  announceToScreenReader: (
    message: string,
    priority?: "polite" | "assertive",
  ) => void;
  currentFocusId: string | null;
}

const FocusManagerContext = createContext<FocusManagerContextType | null>(null);

interface FocusableElement {
  element: HTMLElement;
  id: string;
  priority: number;
}

interface FocusManagerProps {
  children: ReactNode;
  skipLinks?: { href: string; label: string }[];
  enableSkipLinks?: boolean;
}

export function FocusManager({
  children,
  skipLinks = [],
  enableSkipLinks = true,
}: FocusManagerProps) {
  const focusableElements = useRef<Map<string, FocusableElement>>(new Map());
  const screenReaderRegion = useRef<HTMLDivElement>(null);
  const [currentFocusId, setCurrentFocusId] = useState<string | null>(null);
  const [showSkipLinks, setShowSkipLinks] = useState(false);

  // Register focusable elements
  const registerFocusable = useCallback(
    (element: HTMLElement, id: string, priority = 0) => {
      focusableElements.current.set(id, { element, id, priority });
    },
    [],
  );

  // Unregister focusable elements
  const unregisterFocusable = useCallback((id: string) => {
    focusableElements.current.delete(id);
  }, []);

  // Get sorted focusable elements by priority and DOM order
  const getSortedFocusables = useCallback(() => {
    const elements = Array.from(focusableElements.current.values())
      .filter(({ element }) => {
        // Check if element is visible and not disabled
        const rect = element.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        const isEnabled =
          !element.hasAttribute("disabled") &&
          !element.classList.contains("disabled") &&
          !element.getAttribute("aria-disabled");
        return isVisible && isEnabled;
      })
      .sort((a, b) => {
        // Sort by priority first, then by DOM order
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }

        // Use DOM order for same priority
        const position = a.element.compareDocumentPosition(b.element);
        return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });

    return elements;
  }, []);

  // Focus navigation
  const focusNext = useCallback(() => {
    const elements = getSortedFocusables();
    const currentIndex = elements.findIndex(
      ({ element }) => element === document.activeElement,
    );
    const nextIndex = (currentIndex + 1) % elements.length;

    if (elements[nextIndex]) {
      elements[nextIndex].element.focus();
      setCurrentFocusId(elements[nextIndex].id);
    }
  }, [getSortedFocusables]);

  const focusPrevious = useCallback(() => {
    const elements = getSortedFocusables();
    const currentIndex = elements.findIndex(
      ({ element }) => element === document.activeElement,
    );
    const prevIndex =
      currentIndex <= 0 ? elements.length - 1 : currentIndex - 1;

    if (elements[prevIndex]) {
      elements[prevIndex].element.focus();
      setCurrentFocusId(elements[prevIndex].id);
    }
  }, [getSortedFocusables]);

  const focusFirst = useCallback(() => {
    const elements = getSortedFocusables();
    if (elements[0]) {
      elements[0].element.focus();
      setCurrentFocusId(elements[0].id);
    }
  }, [getSortedFocusables]);

  const focusLast = useCallback(() => {
    const elements = getSortedFocusables();
    const lastElement = elements[elements.length - 1];
    if (lastElement) {
      lastElement.element.focus();
      setCurrentFocusId(lastElement.id);
    }
  }, [getSortedFocusables]);

  // Focus trap for modals and dialogs
  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableSelectors = `
      button:not([disabled]),
      [href]:not([disabled]),
      input:not([disabled]),
      select:not([disabled]),
      textarea:not([disabled]),
      [tabindex]:not([tabindex="-1"]):not([disabled]),
      [contenteditable="true"]:not([disabled])
    `;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const focusableElements = container.querySelectorAll(focusableSelectors);
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    // Focus first element
    const firstFocusable = container.querySelector(
      focusableSelectors,
    ) as HTMLElement;
    firstFocusable?.focus();

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Screen reader announcements
  const announceToScreenReader = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      if (screenReaderRegion.current) {
        screenReaderRegion.current.setAttribute("aria-live", priority);
        screenReaderRegion.current.textContent = message;

        // Clear after announcement
        setTimeout(() => {
          if (screenReaderRegion.current) {
            screenReaderRegion.current.textContent = "";
          }
        }, 1000);
      }
    },
    [],
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, altKey } = event;
      const isModifierPressed = ctrlKey || metaKey;

      // Skip link activation
      if (key === "Tab" && !event.shiftKey && !isModifierPressed) {
        setShowSkipLinks(true);
        setTimeout(() => setShowSkipLinks(false), 3000);
      }

      // Global focus navigation (Ctrl/Cmd + Arrow keys)
      if (isModifierPressed && !altKey) {
        switch (key) {
          case "ArrowUp":
            event.preventDefault();
            focusPrevious();
            announceToScreenReader("Focused previous element");
            break;
          case "ArrowDown":
            event.preventDefault();
            focusNext();
            announceToScreenReader("Focused next element");
            break;
          case "Home":
            event.preventDefault();
            focusFirst();
            announceToScreenReader("Focused first element");
            break;
          case "End":
            event.preventDefault();
            focusLast();
            announceToScreenReader("Focused last element");
            break;
        }
      }

      // Escape to clear focus and return to main content
      if (key === "Escape") {
        const mainContent = document.querySelector(
          '[role="main"]',
        ) as HTMLElement;
        if (mainContent) {
          mainContent.focus();
          announceToScreenReader("Returned to main content");
        }
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [focusNext, focusPrevious, focusFirst, focusLast, announceToScreenReader]);

  // Track current focus
  useEffect(() => {
    const handleFocusChange = () => {
      const activeElement = document.activeElement;
      const focusableEntry = Array.from(
        focusableElements.current.values(),
      ).find(({ element }) => element === activeElement);

      setCurrentFocusId(focusableEntry?.id || null);
    };

    document.addEventListener("focusin", handleFocusChange);
    return () => document.removeEventListener("focusin", handleFocusChange);
  }, []);

  const contextValue: FocusManagerContextType = {
    registerFocusable,
    unregisterFocusable,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    trapFocus,
    announceToScreenReader,
    currentFocusId,
  };

  return (
    <FocusManagerContext.Provider value={contextValue}>
      {/* Screen reader announcement region */}
      <div
        ref={screenReaderRegion}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Skip navigation links */}
      {enableSkipLinks && (skipLinks.length > 0 || showSkipLinks) && (
        <div
          className={cn(
            "fixed top-0 left-0 z-50 bg-bg-base border border-border-primary rounded-md shadow-lg p-2 space-y-1",
            "transform transition-transform duration-200",
            showSkipLinks ? "translate-y-2" : "-translate-y-full",
          )}
        >
          <button
            onClick={focusFirst}
            className="block w-full text-left px-2 py-1 text-sm hover:bg-bg-elevated rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Skip to first interactive element
          </button>
          <button
            onClick={() => {
              const mainContent = document.querySelector(
                '[role="main"]',
              ) as HTMLElement;
              mainContent?.focus();
            }}
            className="block w-full text-left px-2 py-1 text-sm hover:bg-bg-elevated rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Skip to main content
          </button>
          {skipLinks.map((link, index) => (
            <a
              key={index}
              href={link.href}
              className="block w-full text-left px-2 py-1 text-sm hover:bg-bg-elevated rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}

      {children}

      {/* Focus indicator overlay for debugging (only in development) */}
      {process.env.NODE_ENV === "development" && currentFocusId && (
        <div className="fixed bottom-4 right-4 bg-primary-600 text-white px-2 py-1 rounded text-xs font-mono z-50">
          Focus: {currentFocusId}
        </div>
      )}
    </FocusManagerContext.Provider>
  );
}

// Hook to use focus manager
export function useFocusManager() {
  const context = useContext(FocusManagerContext);
  if (!context) {
    throw new Error("useFocusManager must be used within a FocusManager");
  }
  return context;
}

// Hook to register focusable elements
export function useFocusable(
  id: string,
  priority = 0,
  dependencies: any[] = [],
) {
  const { registerFocusable, unregisterFocusable } = useFocusManager();
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (elementRef.current) {
      registerFocusable(elementRef.current, id, priority);
      return () => unregisterFocusable(id);
    }
  }, [id, priority, registerFocusable, unregisterFocusable, ...dependencies]);

  return elementRef;
}

// Enhanced focus indicator component
export function FocusIndicator({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 rounded-md transition-all duration-200",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Accessibility announcer component
export function AccessibilityAnnouncer({
  message,
  priority = "polite",
}: {
  message: string;
  priority?: "polite" | "assertive";
}) {
  const { announceToScreenReader } = useFocusManager();

  useEffect(() => {
    if (message) {
      announceToScreenReader(message, priority);
    }
  }, [message, priority, announceToScreenReader]);

  return null;
}
