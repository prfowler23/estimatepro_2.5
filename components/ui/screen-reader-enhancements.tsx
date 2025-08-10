/**
 * Screen Reader Enhancement Components for EstimatePro UI
 *
 * This module provides specialized components and utilities for optimizing
 * screen reader experience and improving accessibility beyond basic WCAG compliance.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAnnouncer,
  LiveRegion,
  accessibilityUtils,
} from "./accessibility-utils";

// Context for screen reader optimizations
interface ScreenReaderContextValue {
  /** Whether screen reader is detected */
  screenReaderActive: boolean;
  /** Current reading mode (verbose/concise) */
  readingMode: "verbose" | "concise";
  /** Set reading mode preference */
  setReadingMode: (mode: "verbose" | "concise") => void;
  /** Current navigation level */
  navigationLevel: number;
  /** Set navigation level */
  setNavigationLevel: (level: number) => void;
}

const ScreenReaderContext =
  React.createContext<ScreenReaderContextValue | null>(null);

/**
 * Provider for screen reader optimization context
 */
export interface ScreenReaderProviderProps {
  children: React.ReactNode;
  /** Default reading mode preference */
  defaultReadingMode?: "verbose" | "concise";
}

export const ScreenReaderProvider: React.FC<ScreenReaderProviderProps> = ({
  children,
  defaultReadingMode = "verbose",
}) => {
  const [screenReaderActive, setScreenReaderActive] = React.useState(false);
  const [readingMode, setReadingMode] = React.useState<"verbose" | "concise">(
    defaultReadingMode,
  );
  const [navigationLevel, setNavigationLevel] = React.useState(1);

  // Detect screen reader usage
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Multiple methods to detect screen reader
    const detectScreenReader = () => {
      // Method 1: Check for reduced motion + high contrast
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const highContrast = window.matchMedia(
        "(prefers-contrast: high)",
      ).matches;

      // Method 2: Check for NVDA/JAWS/ORCA user agent indicators
      const userAgent = navigator.userAgent.toLowerCase();
      const hasScreenReaderUA = /nvda|jaws|orca|voiceover/.test(userAgent);

      // Method 3: Test for screen reader-specific APIs
      const hasScreenReaderAPI =
        "speechSynthesis" in window ||
        "webkitSpeechSynthesis" in window ||
        navigator.userAgent.includes("NVDA") ||
        navigator.userAgent.includes("JAWS");

      // Method 4: Check for accessibility preferences
      const prefersAnnouncements =
        localStorage.getItem("prefers-announcements") === "true";

      return (
        prefersReducedMotion ||
        highContrast ||
        hasScreenReaderUA ||
        hasScreenReaderAPI ||
        prefersAnnouncements
      );
    };

    setScreenReaderActive(detectScreenReader());

    // Listen for accessibility preference changes
    const mediaQueries = [
      window.matchMedia("(prefers-reduced-motion: reduce)"),
      window.matchMedia("(prefers-contrast: high)"),
    ];

    const handleChange = () => {
      setScreenReaderActive(detectScreenReader());
    };

    mediaQueries.forEach((mq) => mq.addEventListener("change", handleChange));

    return () => {
      mediaQueries.forEach((mq) =>
        mq.removeEventListener("change", handleChange),
      );
    };
  }, []);

  const contextValue: ScreenReaderContextValue = {
    screenReaderActive,
    readingMode,
    setReadingMode,
    navigationLevel,
    setNavigationLevel,
  };

  return (
    <ScreenReaderContext.Provider value={contextValue}>
      {children}
    </ScreenReaderContext.Provider>
  );
};

/**
 * Hook to access screen reader context
 */
export function useScreenReader() {
  const context = React.useContext(ScreenReaderContext);
  if (!context) {
    return {
      screenReaderActive: false,
      readingMode: "verbose" as const,
      setReadingMode: () => {},
      navigationLevel: 1,
      setNavigationLevel: () => {},
    };
  }
  return context;
}

/**
 * Enhanced landmark component with screen reader optimizations
 */
export interface LandmarkProps {
  /** Landmark role */
  role:
    | "main"
    | "navigation"
    | "banner"
    | "contentinfo"
    | "complementary"
    | "region"
    | "search"
    | "form";
  /** Accessible label for the landmark */
  label: string;
  /** Optional description for the landmark */
  description?: string;
  /** Child content */
  children: React.ReactNode;
  /** Whether to announce landmark entry */
  announceEntry?: boolean;
  /** Custom announcement for landmark entry */
  customAnnouncement?: string;
}

export const Landmark: React.FC<LandmarkProps> = ({
  role,
  label,
  description,
  children,
  announceEntry = false,
  customAnnouncement,
}) => {
  const { screenReaderActive, readingMode } = useScreenReader();
  const { announcePolite } = useAnnouncer();
  const landmarkRef = React.useRef<HTMLElement>(null);
  const hasAnnounced = React.useRef(false);

  // Generate accessible IDs
  const labelId = accessibilityUtils.generateId(`${role}-label`);
  const descriptionId = description
    ? accessibilityUtils.generateId(`${role}-description`)
    : undefined;

  // Announce landmark entry when it comes into focus
  React.useEffect(() => {
    if (!announceEntry || !screenReaderActive || hasAnnounced.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnnounced.current) {
          const message =
            customAnnouncement ||
            (readingMode === "verbose"
              ? `Entered ${role} landmark: ${label}. ${description || ""}`
              : `${role}: ${label}`);

          announcePolite(message, 500);
          hasAnnounced.current = true;
        }
      },
      { threshold: 0.1 },
    );

    if (landmarkRef.current) {
      observer.observe(landmarkRef.current);
    }

    return () => observer.disconnect();
  }, [
    announceEntry,
    screenReaderActive,
    readingMode,
    role,
    label,
    description,
    customAnnouncement,
    announcePolite,
  ]);

  const Element =
    role === "main"
      ? "main"
      : role === "navigation"
        ? "nav"
        : role === "banner"
          ? "header"
          : role === "contentinfo"
            ? "footer"
            : "section";

  return (
    <>
      <Element
        ref={landmarkRef}
        role={
          role === "main" ||
          role === "navigation" ||
          role === "banner" ||
          role === "contentinfo"
            ? undefined
            : role
        }
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
      >
        {/* Hidden label for screen readers */}
        <h2 id={labelId} className="sr-only">
          {label}
        </h2>

        {/* Hidden description for screen readers */}
        {description && (
          <div id={descriptionId} className="sr-only">
            {description}
          </div>
        )}

        {children}
      </Element>
    </>
  );
};

/**
 * Progress announcer for dynamic content updates
 */
export interface ProgressAnnouncerProps {
  /** Current progress value (0-100) */
  progress: number;
  /** Activity being tracked */
  activity?: string;
  /** Announcement frequency (every N percent) */
  announceEvery?: number;
  /** Whether to announce completion */
  announceCompletion?: boolean;
  /** Custom completion message */
  completionMessage?: string;
}

export const ProgressAnnouncer: React.FC<ProgressAnnouncerProps> = ({
  progress,
  activity = "Loading",
  announceEvery = 25,
  announceCompletion = true,
  completionMessage,
}) => {
  const { screenReaderActive } = useScreenReader();
  const { announcePolite, announceSuccess } = useAnnouncer();
  const [lastAnnouncedProgress, setLastAnnouncedProgress] = React.useState(-1);

  React.useEffect(() => {
    if (!screenReaderActive) return;

    const roundedProgress =
      Math.floor(progress / announceEvery) * announceEvery;

    // Announce progress milestones
    if (roundedProgress > lastAnnouncedProgress && roundedProgress < 100) {
      announcePolite(`${activity} ${roundedProgress}% complete`);
      setLastAnnouncedProgress(roundedProgress);
    }

    // Announce completion
    if (progress >= 100 && lastAnnouncedProgress < 100 && announceCompletion) {
      const message = completionMessage || `${activity} completed`;
      announceSuccess(message);
      setLastAnnouncedProgress(100);
    }
  }, [
    progress,
    activity,
    announceEvery,
    announceCompletion,
    completionMessage,
    screenReaderActive,
    announcePolite,
    announceSuccess,
    lastAnnouncedProgress,
  ]);

  return (
    <LiveRegion politeness="polite" aria-live="polite">
      <span className="sr-only">
        {progress < 100
          ? `${activity} ${Math.round(progress)}% complete`
          : completionMessage || `${activity} completed`}
      </span>
    </LiveRegion>
  );
};

/**
 * Dynamic content announcer for live updates
 */
export interface ContentAnnouncerProps {
  /** Content to announce */
  children: React.ReactNode;
  /** How to announce changes */
  changeType?: "added" | "removed" | "updated" | "error" | "success";
  /** Custom announcement prefix */
  prefix?: string;
  /** Delay before announcement */
  delay?: number;
  /** Whether to only announce if content actually changed */
  announceOnChange?: boolean;
}

export const ContentAnnouncer: React.FC<ContentAnnouncerProps> = ({
  children,
  changeType = "updated",
  prefix,
  delay = 0,
  announceOnChange = true,
}) => {
  const { screenReaderActive } = useScreenReader();
  const { announcePolite, announceSuccess, announceError } = useAnnouncer();
  const [previousContent, setPreviousContent] = React.useState<string>("");

  // Convert children to string for comparison
  const contentString = React.useMemo(() => {
    if (typeof children === "string") return children;
    if (React.isValidElement(children)) {
      return children.props?.children?.toString() || "";
    }
    return String(children);
  }, [children]);

  React.useEffect(() => {
    if (!screenReaderActive) return;
    if (announceOnChange && contentString === previousContent) return;

    const announceContent = () => {
      const message = prefix
        ? `${prefix}: ${contentString}`
        : `Content ${changeType}: ${contentString}`;

      switch (changeType) {
        case "error":
          announceError(message);
          break;
        case "success":
          announceSuccess(message);
          break;
        default:
          announcePolite(message);
      }
    };

    if (delay > 0) {
      const timer = setTimeout(announceContent, delay);
      return () => clearTimeout(timer);
    } else {
      announceContent();
    }

    setPreviousContent(contentString);
  }, [
    contentString,
    previousContent,
    screenReaderActive,
    changeType,
    prefix,
    delay,
    announceOnChange,
    announcePolite,
    announceSuccess,
    announceError,
  ]);

  return (
    <LiveRegion politeness={changeType === "error" ? "assertive" : "polite"}>
      {children}
    </LiveRegion>
  );
};

/**
 * Loading state announcer with intelligent messaging
 */
export interface LoadingAnnouncerProps {
  /** Whether loading state is active */
  loading: boolean;
  /** Activity description */
  activity?: string;
  /** Estimated duration in seconds */
  estimatedDuration?: number;
  /** Custom loading message */
  loadingMessage?: string;
  /** Custom completion message */
  completionMessage?: string;
}

export const LoadingAnnouncer: React.FC<LoadingAnnouncerProps> = ({
  loading,
  activity = "Loading",
  estimatedDuration,
  loadingMessage,
  completionMessage,
}) => {
  const { screenReaderActive } = useScreenReader();
  const { announcePolite, announceSuccess } = useAnnouncer();
  const [hasAnnounced, setHasAnnounced] = React.useState(false);

  React.useEffect(() => {
    if (!screenReaderActive) return;

    if (loading && !hasAnnounced) {
      const message =
        loadingMessage ||
        (estimatedDuration
          ? `${activity}, estimated ${estimatedDuration} seconds`
          : `${activity}...`);

      announcePolite(message, 500);
      setHasAnnounced(true);
    } else if (!loading && hasAnnounced) {
      const message = completionMessage || `${activity} complete`;
      announceSuccess(message);
      setHasAnnounced(false);
    }
  }, [
    loading,
    activity,
    estimatedDuration,
    loadingMessage,
    completionMessage,
    screenReaderActive,
    announcePolite,
    announceSuccess,
    hasAnnounced,
  ]);

  return null;
};

/**
 * Form field announcer for validation states
 */
export interface FormFieldAnnouncerProps {
  /** Field name */
  fieldName: string;
  /** Field value */
  value?: string | number;
  /** Validation state */
  validationState?: "valid" | "invalid" | "pending";
  /** Error message */
  error?: string;
  /** Success message */
  successMessage?: string;
  /** Whether field is required */
  required?: boolean;
  /** Character limit */
  maxLength?: number;
}

export const FormFieldAnnouncer: React.FC<FormFieldAnnouncerProps> = ({
  fieldName,
  value,
  validationState,
  error,
  successMessage,
  required,
  maxLength,
}) => {
  const { screenReaderActive, readingMode } = useScreenReader();
  const { announcePolite, announceError, announceSuccess } = useAnnouncer();
  const [previousValidationState, setPreviousValidationState] = React.useState<
    string | undefined
  >();

  // Announce validation state changes
  React.useEffect(() => {
    if (!screenReaderActive || validationState === previousValidationState)
      return;

    const announceValidation = () => {
      switch (validationState) {
        case "invalid":
          if (error) {
            announceError(`${fieldName}: ${error}`);
          }
          break;
        case "valid":
          if (successMessage && readingMode === "verbose") {
            announceSuccess(`${fieldName}: ${successMessage}`);
          }
          break;
        case "pending":
          if (readingMode === "verbose") {
            announcePolite(`${fieldName}: Validating...`);
          }
          break;
      }
    };

    announceValidation();
    setPreviousValidationState(validationState);
  }, [
    validationState,
    previousValidationState,
    fieldName,
    error,
    successMessage,
    screenReaderActive,
    readingMode,
    announcePolite,
    announceError,
    announceSuccess,
  ]);

  // Announce character count for long fields
  React.useEffect(() => {
    if (
      !screenReaderActive ||
      !maxLength ||
      !value ||
      readingMode !== "verbose"
    )
      return;

    const currentLength = String(value).length;
    const remaining = maxLength - currentLength;

    if (remaining <= 20 && remaining > 0) {
      announcePolite(`${remaining} characters remaining`);
    } else if (remaining === 0) {
      announceError("Character limit reached");
    }
  }, [
    value,
    maxLength,
    screenReaderActive,
    readingMode,
    announcePolite,
    announceError,
  ]);

  return null;
};

/**
 * Navigation announcer for route changes
 */
export interface NavigationAnnouncerProps {
  /** Current page title */
  currentPage: string;
  /** Previous page title */
  previousPage?: string;
  /** Navigation level (1-6) */
  level?: number;
  /** Custom announcement message */
  customMessage?: string;
}

export const NavigationAnnouncer: React.FC<NavigationAnnouncerProps> = ({
  currentPage,
  previousPage,
  level = 1,
  customMessage,
}) => {
  const { screenReaderActive, readingMode } = useScreenReader();
  const { announcePolite } = useAnnouncer();

  React.useEffect(() => {
    if (!screenReaderActive) return;

    const message =
      customMessage ||
      (readingMode === "verbose"
        ? `Navigated to ${currentPage}${previousPage ? ` from ${previousPage}` : ""}`
        : `Page: ${currentPage}`);

    announcePolite(message, 1000);
  }, [
    currentPage,
    previousPage,
    customMessage,
    screenReaderActive,
    readingMode,
    announcePolite,
  ]);

  return (
    <LiveRegion politeness="polite">
      <span className="sr-only">Current page: {currentPage}</span>
    </LiveRegion>
  );
};
