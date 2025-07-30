"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  HelpContextEngine,
  HelpContent,
  type HelpContext,
  UserExperience,
  InteractiveTutorial,
} from "@/lib/help/help-context-engine";
import { GuidedFlowData } from "@/lib/types/estimate-types";

interface HelpState {
  currentContext: HelpContext | null;
  availableHelp: HelpContent[];
  activeTutorial: InteractiveTutorial | null;
  tutorialStep: number;
  isHelpPanelOpen: boolean;
  triggeredHelp: HelpContent[];
  workflowId?: string;
  userBehavior: {
    startTime: number;
    errorCount: number;
    hesitationIndicators: string[];
  };
}

interface HelpContextType {
  state: HelpState;
  userProfile: UserExperience;
  flowData?: GuidedFlowData;

  // Context management
  setContext: (context: HelpContext) => void;
  updateUserProfile: (profile: Partial<UserExperience>) => void;
  updateFlowData: (data: GuidedFlowData) => void;
  setWorkflowId: (workflowId: string) => void;

  // Help panel management
  openHelpPanel: () => void;
  closeHelpPanel: () => void;
  toggleHelpPanel: () => void;

  // Tutorial management
  startTutorial: (tutorialId: string) => void;
  nextTutorialStep: () => void;
  previousTutorialStep: () => void;
  exitTutorial: () => void;

  // User behavior tracking
  trackBehavior: (
    action: string,
    data?: Record<string, string | number | boolean>,
  ) => void;
  markHelpful: (helpId: string) => void;
  markNotHelpful: (helpId: string) => void;
  dismissHelp: (helpId: string) => void;

  // Content retrieval
  getContextualHelp: () => HelpContent[];
  getSmartSuggestions: () => HelpContent[];
  getAvailableTutorials: () => InteractiveTutorial[];
}

const HelpContext = createContext<HelpContextType | null>(null);

interface HelpProviderProps {
  children: ReactNode;
  userProfile: UserExperience;
  flowData?: GuidedFlowData;
  userId?: string;
}

export function HelpProvider({
  children,
  userProfile: initialUserProfile,
  flowData: initialFlowData,
  userId = "anonymous",
}: HelpProviderProps) {
  const [state, setState] = useState<HelpState>({
    currentContext: null,
    availableHelp: [],
    activeTutorial: null,
    tutorialStep: 0,
    isHelpPanelOpen: false,
    triggeredHelp: [],
    workflowId: undefined,
    userBehavior: {
      startTime: Date.now(),
      errorCount: 0,
      hesitationIndicators: [],
    },
  });

  const [userProfile, setUserProfile] =
    useState<UserExperience>(initialUserProfile);
  const [flowData, setFlowData] = useState<GuidedFlowData | undefined>(
    initialFlowData,
  );

  // Initialize help system
  useEffect(() => {
    HelpContextEngine.initialize();
  }, []);

  // Update available help when context changes
  useEffect(() => {
    if (state.currentContext) {
      const contextualHelp = HelpContextEngine.getContextualHelp(
        state.currentContext,
        userProfile,
        flowData,
      );

      const triggeredHelp = HelpContextEngine.getTriggeredHelp(
        state.currentContext,
        userProfile,
        userId,
      );

      setState((prev) => ({
        ...prev,
        availableHelp: contextualHelp,
        triggeredHelp,
      }));
    }
  }, [state.currentContext, userProfile, flowData, userId]);

  // Behavior tracking with hesitation detection
  useEffect(() => {
    let hesitationTimer: NodeJS.Timeout;
    let lastActivity = Date.now();

    const trackActivity = () => {
      lastActivity = Date.now();
      clearTimeout(hesitationTimer);

      // Set hesitation timer (30 seconds of inactivity)
      hesitationTimer = setTimeout(() => {
        if (state.currentContext) {
          trackBehavior("hesitation", {
            duration: Date.now() - lastActivity,
            context: state.currentContext,
          });
        }
      }, 30000);
    };

    // Track various user activities
    const events = ["click", "keydown", "scroll", "focus"];
    events.forEach((event) => {
      document.addEventListener(event, trackActivity, true);
    });

    return () => {
      clearTimeout(hesitationTimer);
      events.forEach((event) => {
        document.removeEventListener(event, trackActivity, true);
      });
    };
  }, [state.currentContext]);

  const setContext = (context: HelpContext) => {
    setState((prev) => ({
      ...prev,
      currentContext: context,
      userBehavior: {
        ...prev.userBehavior,
        startTime: Date.now(),
        errorCount: 0,
        hesitationIndicators: [],
      },
    }));

    // Track step entry
    trackBehavior("step_enter", {
      stepId: context.stepId,
      stepNumber: context.stepNumber,
    });
  };

  const updateUserProfile = (profile: Partial<UserExperience>) => {
    setUserProfile((prev) => ({ ...prev, ...profile }));
  };

  const updateFlowData = (data: GuidedFlowData) => {
    setFlowData(data);
  };

  const setWorkflowId = (workflowId: string) => {
    setState((prev) => ({ ...prev, workflowId }));
  };

  const openHelpPanel = () => {
    setState((prev) => ({ ...prev, isHelpPanelOpen: true }));
    trackBehavior("help_panel_open");
  };

  const closeHelpPanel = () => {
    setState((prev) => ({ ...prev, isHelpPanelOpen: false }));
    trackBehavior("help_panel_close");
  };

  const toggleHelpPanel = () => {
    setState((prev) => ({ ...prev, isHelpPanelOpen: !prev.isHelpPanelOpen }));
    trackBehavior(
      state.isHelpPanelOpen ? "help_panel_close" : "help_panel_open",
    );
  };

  const startTutorial = (tutorialId: string) => {
    const tutorials = HelpContextEngine.getAvailableTutorials(
      state.currentContext!,
      userProfile,
    );

    const tutorial = tutorials.find((t) => t.id === tutorialId);
    if (tutorial) {
      setState((prev) => ({
        ...prev,
        activeTutorial: tutorial,
        tutorialStep: 0,
      }));
      trackBehavior("tutorial_start", { tutorialId });
    }
  };

  const nextTutorialStep = () => {
    if (
      state.activeTutorial &&
      state.tutorialStep < state.activeTutorial.steps.length - 1
    ) {
      setState((prev) => ({
        ...prev,
        tutorialStep: prev.tutorialStep + 1,
      }));
      trackBehavior("tutorial_next_step", { step: state.tutorialStep + 1 });
    } else if (state.activeTutorial) {
      // Tutorial completed
      trackBehavior("tutorial_complete", {
        tutorialId: state.activeTutorial.id,
      });
      exitTutorial();
    }
  };

  const previousTutorialStep = () => {
    if (state.tutorialStep > 0) {
      setState((prev) => ({
        ...prev,
        tutorialStep: prev.tutorialStep - 1,
      }));
      trackBehavior("tutorial_previous_step", { step: state.tutorialStep - 1 });
    }
  };

  const exitTutorial = () => {
    const tutorialId = state.activeTutorial?.id;
    setState((prev) => ({
      ...prev,
      activeTutorial: null,
      tutorialStep: 0,
    }));
    if (tutorialId) {
      trackBehavior("tutorial_exit", { tutorialId });
    }
  };

  const trackBehavior = (
    action: string,
    data?: Record<string, string | number | boolean>,
  ) => {
    const behavior = {
      action,
      timestamp: Date.now(),
      data,
    };

    if (state.currentContext) {
      HelpContextEngine.trackUserBehavior(
        userId,
        state.currentContext,
        behavior,
      );
    }

    // Update local state for specific behaviors
    if (action === "error") {
      setState((prev) => ({
        ...prev,
        userBehavior: {
          ...prev.userBehavior,
          errorCount: prev.userBehavior.errorCount + 1,
        },
      }));
    }

    if (action === "hesitation") {
      setState((prev) => ({
        ...prev,
        userBehavior: {
          ...prev.userBehavior,
          hesitationIndicators: [
            ...prev.userBehavior.hesitationIndicators,
            data,
          ],
        },
      }));
    }
  };

  const markHelpful = async (helpId: string) => {
    trackBehavior("help_helpful", { helpId });

    // Update help analytics if we have a workflow ID
    if (state.workflowId) {
      try {
        const analyticsService = new (
          await import("@/lib/services/analytics-service")
        ).AnalyticsService(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );

        const helpContent = state.triggeredHelp.find((h) => h.id === helpId);
        await analyticsService.recordHelpInteraction(
          state.workflowId,
          helpId,
          "helpful",
          {
            helpContent: helpContent?.content || "",
            context:
              typeof state.currentContext === "string"
                ? state.currentContext
                : state.currentContext?.stepId || "",
          },
        );
      } catch (error) {
        console.warn("Failed to record help analytics:", error);
      }
    }
  };

  const markNotHelpful = async (helpId: string) => {
    trackBehavior("help_not_helpful", { helpId });

    // Update help analytics if we have a workflow ID
    if (state.workflowId) {
      try {
        const analyticsService = new (
          await import("@/lib/services/analytics-service")
        ).AnalyticsService(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );

        const helpContent = state.triggeredHelp.find((h) => h.id === helpId);
        await analyticsService.recordHelpInteraction(
          state.workflowId,
          helpId,
          "not_helpful",
          {
            helpContent: helpContent?.content || "",
            context:
              typeof state.currentContext === "string"
                ? state.currentContext
                : state.currentContext?.stepId || "",
          },
        );
      } catch (error) {
        console.warn("Failed to record help analytics:", error);
      }
    }
  };

  const dismissHelp = async (helpId: string) => {
    setState((prev) => ({
      ...prev,
      triggeredHelp: prev.triggeredHelp.filter((h) => h.id !== helpId),
    }));
    trackBehavior("help_dismiss", { helpId });

    // Update help analytics if we have a workflow ID
    if (state.workflowId) {
      try {
        const analyticsService = new (
          await import("@/lib/services/analytics-service")
        ).AnalyticsService(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );

        const helpContent = state.triggeredHelp.find((h) => h.id === helpId);
        await analyticsService.recordHelpInteraction(
          state.workflowId,
          helpId,
          "dismissed",
          {
            helpContent: helpContent?.content || "",
            context:
              typeof state.currentContext === "string"
                ? state.currentContext
                : state.currentContext?.stepId || "",
          },
        );
      } catch (error) {
        console.warn("Failed to record help analytics:", error);
      }
    }
  };

  const getContextualHelp = (): HelpContent[] => {
    if (!state.currentContext) return [];

    return HelpContextEngine.getContextualHelp(
      state.currentContext,
      userProfile,
      flowData,
    );
  };

  const getSmartSuggestions = (): HelpContent[] => {
    if (!state.currentContext || !flowData) return [];

    return HelpContextEngine.getSmartSuggestions(
      state.currentContext,
      userProfile,
      flowData,
    );
  };

  const getAvailableTutorials = (): InteractiveTutorial[] => {
    if (!state.currentContext) return [];

    return HelpContextEngine.getAvailableTutorials(
      state.currentContext,
      userProfile,
    );
  };

  const contextValue: HelpContextType = {
    state,
    userProfile,
    flowData,
    setContext,
    updateUserProfile,
    updateFlowData,
    setWorkflowId,
    openHelpPanel,
    closeHelpPanel,
    toggleHelpPanel,
    startTutorial,
    nextTutorialStep,
    previousTutorialStep,
    exitTutorial,
    trackBehavior,
    markHelpful,
    markNotHelpful,
    dismissHelp,
    getContextualHelp,
    getSmartSuggestions,
    getAvailableTutorials,
  };

  return (
    <HelpContext.Provider value={contextValue}>{children}</HelpContext.Provider>
  );
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error("useHelp must be used within a HelpProvider");
  }
  return context;
}

export default HelpProvider;
