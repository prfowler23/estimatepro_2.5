/**
 * Comprehensive TypeScript types for the Help System
 * Enhanced type definitions with strict typing and validation
 */

// Base types for help system
export type ExperienceLevel = "novice" | "intermediate" | "expert";
export type UserRole = "estimator" | "manager" | "admin";
export type HelpContentType =
  | "tooltip"
  | "panel"
  | "tutorial"
  | "video"
  | "demo";
export type TutorialDifficulty = "beginner" | "intermediate" | "advanced";
export type TriggerType =
  | "onLoad"
  | "onError"
  | "onHesitation"
  | "onEmpty"
  | "onFocus"
  | "onTimeout";
export type FormState = "empty" | "partial" | "complete";
export type TooltipPosition = "top" | "bottom" | "left" | "right" | "auto";
export type PanelPosition = "floating" | "sidebar" | "inline";
export type TutorialPosition = "top" | "bottom" | "left" | "right" | "center";

// Enhanced User Experience interface
export interface UserExperience {
  readonly experienceLevel: ExperienceLevel;
  readonly role: UserRole;
  readonly preferences?: Readonly<{
    showDetailedHelp?: boolean;
    enableTutorials?: boolean;
    helpAnimations?: boolean;
    compactMode?: boolean;
    keyboardShortcuts?: boolean;
  }>;
}

// Enhanced Help Context interface
export interface HelpContext {
  readonly stepId: string;
  readonly stepNumber: number;
  readonly fieldId?: string;
  readonly hasErrors?: boolean;
  readonly formState?: FormState;
  readonly userBehavior?: Readonly<{
    timeOnStep?: number;
    errorCount?: number;
    hesitationIndicators?: readonly string[];
    clickCount?: number;
    scrollDepth?: number;
  }>;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// Enhanced Help Trigger interface
export interface HelpTrigger {
  readonly type: TriggerType;
  readonly condition?: string;
  readonly delay?: number;
  readonly priority: number;
  readonly once?: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// Enhanced Help Content interface
export interface HelpContent {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly type: HelpContentType;
  readonly triggers: readonly HelpTrigger[];
  readonly audience: readonly ExperienceLevel[];
  readonly context: Partial<HelpContext>;
  readonly priority: number;
  readonly tags: readonly string[];
  readonly lastUpdated: string;
  readonly analytics?: Readonly<{
    views: number;
    helpful: number;
    notHelpful: number;
    dismissed: number;
    avgTimeViewed: number;
  }>;
  readonly accessibility?: Readonly<{
    ariaLabel?: string;
    ariaDescription?: string;
    keyboardShortcut?: string;
    screenReaderOnly?: boolean;
  }>;
  readonly conditions?: Readonly<{
    minScreenWidth?: number;
    maxScreenWidth?: number;
    requiresFeature?: string[];
    excludeDeviceTypes?: readonly ("mobile" | "tablet" | "desktop")[];
  }>;
}

// Enhanced Interactive Tutorial interface
export interface InteractiveTutorial {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly steps: readonly TutorialStep[];
  readonly prerequisites?: readonly string[];
  readonly estimatedTime: number;
  readonly difficulty: TutorialDifficulty;
  readonly category?: string;
  readonly version?: string;
  readonly analytics?: Readonly<{
    starts: number;
    completions: number;
    abandons: number;
    averageTime: number;
  }>;
  readonly conditions?: Readonly<{
    minExperienceLevel?: ExperienceLevel;
    requiredFeatures?: readonly string[];
    deviceCompatibility?: readonly ("mobile" | "tablet" | "desktop")[];
  }>;
}

// Enhanced Tutorial Step interface
export interface TutorialStep {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly targetElement?: string;
  readonly position?: TutorialPosition;
  readonly action?: "click" | "type" | "scroll" | "wait" | "custom";
  readonly validation?: string | ((element: HTMLElement) => boolean);
  readonly nextCondition?: string | (() => boolean);
  readonly delay?: number;
  readonly optional?: boolean;
  readonly skipCondition?: string | (() => boolean);
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// User Behavior Tracking
export interface UserBehaviorEvent {
  readonly action: string;
  readonly timestamp: number;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly context?: Partial<HelpContext>;
  readonly sessionId?: string;
  readonly userId?: string;
}

export interface UserBehaviorTracking {
  readonly timeOnStep: number;
  readonly errorCount: number;
  readonly hesitationIndicators: readonly unknown[];
  readonly actions: readonly UserBehaviorEvent[];
  readonly sessionStart: number;
  readonly lastActivity: number;
}

// Help System State Management
export interface HelpState {
  readonly currentContext: HelpContext | null;
  readonly availableHelp: readonly HelpContent[];
  readonly activeTutorial: InteractiveTutorial | null;
  readonly tutorialStep: number;
  readonly isHelpPanelOpen: boolean;
  readonly triggeredHelp: readonly HelpContent[];
  readonly workflowId?: string;
  readonly userBehavior: Readonly<{
    startTime: number;
    errorCount: number;
    hesitationIndicators: readonly string[];
    totalInteractions: number;
  }>;
  readonly performance?: Readonly<{
    renderTime: number;
    apiCallCount: number;
    cacheHitRate: number;
  }>;
}

// Help Context Provider Interface
export interface HelpContextType {
  readonly state: HelpState;
  readonly userProfile: UserExperience;
  readonly flowData?: unknown; // GuidedFlowData type would be imported
  readonly config?: unknown; // HelpSystemConfig would be imported

  // Context management
  readonly setContext: (context: HelpContext) => void;
  readonly updateUserProfile: (profile: Partial<UserExperience>) => void;
  readonly updateFlowData: (data: unknown) => void;
  readonly setWorkflowId: (workflowId: string) => void;

  // Help panel management
  readonly openHelpPanel: () => void;
  readonly closeHelpPanel: () => void;
  readonly toggleHelpPanel: () => void;

  // Tutorial management
  readonly startTutorial: (tutorialId: string) => void;
  readonly nextTutorialStep: () => void;
  readonly previousTutorialStep: () => void;
  readonly exitTutorial: () => void;
  readonly skipTutorialStep: () => void;

  // User behavior tracking
  readonly trackBehavior: (
    action: string,
    data?: Record<string, unknown>,
  ) => void;
  readonly markHelpful: (helpId: string) => Promise<void>;
  readonly markNotHelpful: (helpId: string) => Promise<void>;
  readonly dismissHelp: (helpId: string) => Promise<void>;

  // Content retrieval
  readonly getContextualHelp: () => readonly HelpContent[];
  readonly getSmartSuggestions: () => readonly HelpContent[];
  readonly getAvailableTutorials: () => readonly InteractiveTutorial[];
  readonly getTriggeredHelp: () => readonly HelpContent[];

  // Performance methods
  readonly clearCache: () => void;
  readonly getPerformanceMetrics: () => Record<string, number>;
}

// Component Props Interfaces
export interface HelpProviderProps {
  readonly children: React.ReactNode;
  readonly userProfile: UserExperience;
  readonly flowData?: unknown;
  readonly userId?: string;
  readonly config?: unknown; // HelpSystemConfig
  readonly onError?: (error: Error) => void;
}

export interface ContextualHelpPanelProps {
  readonly className?: string;
  readonly position?: PanelPosition;
  readonly compact?: boolean;
  readonly maxItems?: number;
  readonly enableAnimations?: boolean;
  readonly onHelpInteraction?: (helpId: string, interaction: string) => void;
}

export interface HelpTooltipProps {
  readonly children: React.ReactNode;
  readonly fieldId?: string;
  readonly trigger?: "hover" | "click" | "focus" | "auto";
  readonly position?: TooltipPosition;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly showIcon?: boolean;
  readonly helpContent?: HelpContent;
  readonly delay?: number;
  readonly maxWidth?: number;
  readonly onShow?: () => void;
  readonly onHide?: () => void;
}

export interface InteractiveTutorialProps {
  readonly className?: string;
  readonly onComplete?: (tutorialId: string) => void;
  readonly onExit?: (tutorialId: string, step: number) => void;
  readonly enableKeyboard?: boolean;
  readonly showProgress?: boolean;
  readonly allowSkip?: boolean;
}

export interface HelpIntegratedFlowProps {
  readonly children: React.ReactNode;
  readonly currentStep: number;
  readonly flowData: unknown;
  readonly validationErrors?: readonly string[];
  readonly className?: string;
  readonly onStepChange?: (step: number) => void;
  readonly onValidationChange?: (errors: readonly string[]) => void;
}

// Analytics and Metrics
export interface HelpAnalytics {
  readonly helpId: string;
  readonly interaction:
    | "view"
    | "helpful"
    | "not_helpful"
    | "dismissed"
    | "timeout";
  readonly timestamp: number;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly context?: Partial<HelpContext>;
  readonly duration?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface HelpMetrics {
  readonly totalViews: number;
  readonly helpfulRating: number;
  readonly averageViewTime: number;
  readonly dismissalRate: number;
  readonly completionRate: number;
  readonly errorRate: number;
  readonly performanceScore: number;
}

// Error Handling
export interface HelpError {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly stack?: string;
  readonly timestamp: number;
  readonly recoverable: boolean;
}

// Validation and Safety
export type ValidationResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly errors: readonly string[] };

export interface HelpContentValidator {
  readonly validate: (content: unknown) => ValidationResult<HelpContent>;
  readonly sanitize: (content: HelpContent) => HelpContent;
}

export interface TutorialValidator {
  readonly validate: (
    tutorial: unknown,
  ) => ValidationResult<InteractiveTutorial>;
  readonly sanitize: (tutorial: InteractiveTutorial) => InteractiveTutorial;
}

// Performance Monitoring
export interface PerformanceMetrics {
  readonly componentRenderTime: number;
  readonly helpLoadTime: number;
  readonly tutorialStepTime: number;
  readonly memoryUsage: number;
  readonly cacheHitRate: number;
  readonly apiResponseTime: number;
  readonly errorRate: number;
}

// Utility Types
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Type Guards
export const isValidExperienceLevel = (
  value: unknown,
): value is ExperienceLevel => {
  return (
    typeof value === "string" &&
    ["novice", "intermediate", "expert"].includes(value)
  );
};

export const isValidHelpContent = (value: unknown): value is HelpContent => {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "title" in value &&
    "content" in value &&
    "type" in value &&
    "triggers" in value &&
    "audience" in value &&
    "priority" in value
  );
};

export const isValidTutorial = (
  value: unknown,
): value is InteractiveTutorial => {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "title" in value &&
    "description" in value &&
    "steps" in value &&
    "difficulty" in value
  );
};

// Event Types
export type HelpSystemEvent =
  | { type: "help_show"; payload: { helpId: string; context: HelpContext } }
  | { type: "help_hide"; payload: { helpId: string; duration: number } }
  | { type: "tutorial_start"; payload: { tutorialId: string; userId?: string } }
  | {
      type: "tutorial_complete";
      payload: { tutorialId: string; duration: number };
    }
  | { type: "tutorial_abandon"; payload: { tutorialId: string; step: number } }
  | { type: "user_behavior"; payload: UserBehaviorEvent }
  | { type: "performance_metric"; payload: PerformanceMetrics }
  | { type: "error"; payload: HelpError };

export default HelpContent;
