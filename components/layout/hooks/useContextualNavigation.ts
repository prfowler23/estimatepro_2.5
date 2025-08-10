/**
 * Contextual Navigation Hook
 *
 * Provides smart navigation based on user context, workflow state, and behavior patterns
 * Part of Phase 4 Priority 2: Enhanced Mobile Navigation
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { type NavItem } from "../config/navigation.config";

interface UserContext {
  currentWorkflow: string | null;
  workflowStep: number | null;
  lastActivity: string;
  frequentlyUsed: string[];
  urgentTasks: number;
  draftEstimates: number;
  aiSuggestions: number;
  timeOnPage: number;
}

interface ContextualSuggestion {
  id: string;
  type: "workflow_continue" | "quick_action" | "urgent_task" | "ai_help";
  title: string;
  subtitle?: string;
  href: string;
  priority: "high" | "medium" | "low";
  icon?: string;
  badge?: number | boolean;
}

interface SmartBadgeData {
  [key: string]: {
    value: number | boolean;
    type: "count" | "indicator" | "urgent";
    timestamp: number;
    autoExpire?: number; // Seconds
  };
}

/**
 * Hook for contextual navigation with smart suggestions and adaptive UI
 */
export function useContextualNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const [userContext, setUserContext] = useState<UserContext>({
    currentWorkflow: null,
    workflowStep: null,
    lastActivity: "dashboard",
    frequentlyUsed: [],
    urgentTasks: 0,
    draftEstimates: 0,
    aiSuggestions: 0,
    timeOnPage: 0,
  });

  const [smartBadges, setSmartBadges] = useState<SmartBadgeData>({});
  const [suggestions, setSuggestions] = useState<ContextualSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Track user behavior and context
  useEffect(() => {
    const startTime = Date.now();

    // Update current context based on pathname
    const updateContext = () => {
      const newContext: Partial<UserContext> = {
        lastActivity: pathname.split("/")[1] || "dashboard",
        timeOnPage: 0,
      };

      // Detect workflow state
      if (pathname.includes("/estimates/new/guided")) {
        const stepMatch = pathname.match(/step-(\d+)/);
        newContext.currentWorkflow = "estimate_creation";
        newContext.workflowStep = stepMatch ? parseInt(stepMatch[1]) : 1;
      } else if (pathname.includes("/calculator")) {
        newContext.currentWorkflow = "service_calculation";
      } else if (pathname.includes("/ai-assistant")) {
        newContext.currentWorkflow = "ai_assistance";
      } else {
        newContext.currentWorkflow = null;
        newContext.workflowStep = null;
      }

      setUserContext((prev) => ({ ...prev, ...newContext }));
    };

    updateContext();

    // Track time on page
    const interval = setInterval(() => {
      const timeOnPage = Math.floor((Date.now() - startTime) / 1000);
      setUserContext((prev) => ({ ...prev, timeOnPage }));
    }, 1000);

    return () => clearInterval(interval);
  }, [pathname]);

  // Load contextual data
  useEffect(() => {
    const loadContextualData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Simulate API calls for contextual data
        // In real implementation, these would be actual API calls
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Mock contextual data
        const contextData = {
          urgentTasks: 2,
          draftEstimates: 3,
          aiSuggestions: 1,
          frequentlyUsed: ["estimates", "calculator", "dashboard"],
        };

        setUserContext((prev) => ({
          ...prev,
          ...contextData,
        }));

        // Set smart badges with expiration
        setSmartBadges({
          dashboard: {
            value: 2,
            type: "count",
            timestamp: Date.now(),
            autoExpire: 300, // 5 minutes
          },
          estimates: {
            value: contextData.draftEstimates,
            type: "count",
            timestamp: Date.now(),
          },
          "ai-assistant": {
            value: contextData.aiSuggestions > 0,
            type: "indicator",
            timestamp: Date.now(),
            autoExpire: 600, // 10 minutes
          },
        });

        // Generate contextual suggestions
        generateSuggestions(contextData);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load contextual data:", error);
        setIsLoading(false);
      }
    };

    loadContextualData();
  }, [user]);

  // Generate contextual suggestions based on user state
  const generateSuggestions = useCallback(
    (contextData: Partial<UserContext>) => {
      const newSuggestions: ContextualSuggestion[] = [];

      // Workflow continuation suggestions
      if (
        userContext.currentWorkflow === "estimate_creation" &&
        userContext.workflowStep
      ) {
        newSuggestions.push({
          id: "continue_estimate",
          type: "workflow_continue",
          title: "Continue Estimate",
          subtitle: `Step ${userContext.workflowStep} of 6`,
          href: `/estimates/new/guided/step-${userContext.workflowStep}`,
          priority: "high",
          icon: "FileText",
        });
      }

      // Urgent tasks
      if (contextData.urgentTasks && contextData.urgentTasks > 0) {
        newSuggestions.push({
          id: "urgent_tasks",
          type: "urgent_task",
          title: "Urgent Tasks",
          subtitle: `${contextData.urgentTasks} items need attention`,
          href: "/dashboard?filter=urgent",
          priority: "high",
          icon: "AlertTriangle",
          badge: contextData.urgentTasks,
        });
      }

      // Draft estimates
      if (contextData.draftEstimates && contextData.draftEstimates > 0) {
        newSuggestions.push({
          id: "draft_estimates",
          type: "quick_action",
          title: "Complete Drafts",
          subtitle: `${contextData.draftEstimates} drafts waiting`,
          href: "/estimates?status=draft",
          priority: "medium",
          icon: "Edit",
          badge: contextData.draftEstimates,
        });
      }

      // AI suggestions
      if (contextData.aiSuggestions && contextData.aiSuggestions > 0) {
        newSuggestions.push({
          id: "ai_suggestions",
          type: "ai_help",
          title: "AI Insights",
          subtitle: "New suggestions available",
          href: "/ai-assistant",
          priority: "medium",
          icon: "Sparkles",
          badge: true,
        });
      }

      // Time-based suggestions
      const hour = new Date().getHours();
      if (hour >= 9 && hour <= 17 && pathname === "/dashboard") {
        newSuggestions.push({
          id: "create_estimate",
          type: "quick_action",
          title: "Create Estimate",
          subtitle: "Start a new project",
          href: "/estimates/new/guided/step-1",
          priority: "low",
          icon: "Plus",
        });
      }

      setSuggestions(
        newSuggestions.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }),
      );
    },
    [userContext, pathname],
  );

  // Auto-expire badges
  useEffect(() => {
    const expireCheck = setInterval(() => {
      const now = Date.now();
      setSmartBadges((prev) => {
        const updated = { ...prev };
        Object.entries(updated).forEach(([key, badge]) => {
          if (
            badge.autoExpire &&
            now - badge.timestamp > badge.autoExpire * 1000
          ) {
            delete updated[key];
          }
        });
        return updated;
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(expireCheck);
  }, []);

  // Smart navigation based on context
  const getSmartNavigation = useCallback(
    (navItems: NavItem[]) => {
      return navItems.map((item) => {
        const badge = smartBadges[item.id];
        const isHighPriority = suggestions.some(
          (s) => s.href.includes(item.href) && s.priority === "high",
        );

        return {
          ...item,
          badge: badge?.value,
          badgeType: badge?.type,
          isHighPriority,
          isRecommended: userContext.frequentlyUsed.includes(item.id),
        };
      });
    },
    [smartBadges, suggestions, userContext.frequentlyUsed],
  );

  // Update badge programmatically
  const updateBadge = useCallback(
    (
      itemId: string,
      value: number | boolean,
      type: "count" | "indicator" | "urgent" = "count",
    ) => {
      setSmartBadges((prev) => ({
        ...prev,
        [itemId]: {
          value,
          type,
          timestamp: Date.now(),
        },
      }));
    },
    [],
  );

  // Clear badge
  const clearBadge = useCallback((itemId: string) => {
    setSmartBadges((prev) => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  }, []);

  // Navigate with context tracking
  const navigateWithContext = useCallback(
    (href: string, source: "tap" | "swipe" | "suggestion" = "tap") => {
      // Track navigation source for analytics
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "contextual_navigation", {
          navigation_source: source,
          destination: href,
          current_context: userContext.currentWorkflow || "none",
          time_on_page: userContext.timeOnPage,
        });
      }

      // Update frequently used items
      const destination = href.split("/")[1] || "dashboard";
      setUserContext((prev) => ({
        ...prev,
        frequentlyUsed: [
          destination,
          ...prev.frequentlyUsed.filter((item) => item !== destination),
        ].slice(0, 5), // Keep only top 5
      }));

      router.push(href);
    },
    [router, userContext],
  );

  // Get contextual actions for current page
  const getContextualActions = useMemo(() => {
    const actions: ContextualSuggestion[] = [];

    // Add actions based on current page and context
    switch (userContext.lastActivity) {
      case "dashboard":
        if (userContext.urgentTasks > 0) {
          actions.push({
            id: "view_urgent",
            type: "urgent_task",
            title: "View Urgent Items",
            href: "/dashboard?filter=urgent",
            priority: "high",
          });
        }
        break;

      case "estimates":
        actions.push({
          id: "create_new",
          type: "quick_action",
          title: "New Estimate",
          href: "/estimates/new/guided/step-1",
          priority: "medium",
        });
        break;
    }

    return actions;
  }, [userContext]);

  return {
    userContext,
    suggestions,
    smartBadges,
    isLoading,
    getSmartNavigation,
    updateBadge,
    clearBadge,
    navigateWithContext,
    contextualActions: getContextualActions,
  };
}

/**
 * Hook for workflow-aware navigation
 */
export function useWorkflowNavigation() {
  const { userContext, navigateWithContext } = useContextualNavigation();
  const pathname = usePathname();

  // Get next logical step in current workflow
  const getNextStep = useCallback(() => {
    if (
      userContext.currentWorkflow === "estimate_creation" &&
      userContext.workflowStep
    ) {
      const nextStep = Math.min(userContext.workflowStep + 1, 6);
      return `/estimates/new/guided/step-${nextStep}`;
    }
    return null;
  }, [userContext]);

  // Get previous step in current workflow
  const getPreviousStep = useCallback(() => {
    if (
      userContext.currentWorkflow === "estimate_creation" &&
      userContext.workflowStep
    ) {
      const prevStep = Math.max(userContext.workflowStep - 1, 1);
      return `/estimates/new/guided/step-${prevStep}`;
    }
    return null;
  }, [userContext]);

  // Navigate to next step
  const nextStep = useCallback(() => {
    const next = getNextStep();
    if (next) {
      navigateWithContext(next, "tap");
    }
  }, [getNextStep, navigateWithContext]);

  // Navigate to previous step
  const previousStep = useCallback(() => {
    const prev = getPreviousStep();
    if (prev) {
      navigateWithContext(prev, "tap");
    }
  }, [getPreviousStep, navigateWithContext]);

  // Check if user can proceed to next step
  const canProceed = useMemo(() => {
    // Implementation would check validation state
    return true; // Simplified for now
  }, []);

  return {
    currentWorkflow: userContext.currentWorkflow,
    currentStep: userContext.workflowStep,
    nextStep,
    previousStep,
    canProceed,
    getNextStep,
    getPreviousStep,
  };
}

export default useContextualNavigation;
