/**
 * Session storage for help system user behavior patterns
 * Persists user behavior and preferences across page reloads
 */

import { UserExperience, HelpContent } from "./help-types";

interface HelpSessionData {
  userId: string;
  userProfile: UserExperience;
  dismissedHelp: string[];
  helpfulRatings: string[];
  notHelpfulRatings: string[];
  completedTutorials: string[];
  behaviorPatterns: {
    averageTimePerStep: Record<string, number>;
    commonErrors: string[];
    preferredHelpType: "tooltip" | "panel" | "tutorial" | "video" | "demo";
    hesitationSteps: string[];
  };
  lastActivity: number;
  sessionStartTime: number;
}

export class HelpSessionStorage {
  private static readonly STORAGE_KEY = "estimatepro_help_session";
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  /**
   * Initialize session storage
   */
  static initialize(userId: string, userProfile: UserExperience): void {
    if (typeof window === "undefined") return;

    const existingData = this.getSessionData();

    // Check if session is still valid
    if (existingData && existingData.userId === userId) {
      const timeSinceLastActivity = Date.now() - existingData.lastActivity;
      if (timeSinceLastActivity < this.SESSION_TIMEOUT) {
        // Update last activity and keep existing data
        existingData.lastActivity = Date.now();
        this.saveSessionData(existingData);
        return;
      }
    }

    // Create new session
    const newSession: HelpSessionData = {
      userId,
      userProfile,
      dismissedHelp: [],
      helpfulRatings: [],
      notHelpfulRatings: [],
      completedTutorials: [],
      behaviorPatterns: {
        averageTimePerStep: {},
        commonErrors: [],
        preferredHelpType: "tooltip",
        hesitationSteps: [],
      },
      lastActivity: Date.now(),
      sessionStartTime: Date.now(),
    };

    this.saveSessionData(newSession);
  }

  /**
   * Get current session data
   */
  static getSessionData(): HelpSessionData | null {
    if (typeof window === "undefined") return null;

    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored) as HelpSessionData;

      // Validate session timeout
      const timeSinceLastActivity = Date.now() - data.lastActivity;
      if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
        this.clearSession();
        return null;
      }

      return data;
    } catch (error) {
      console.error("Failed to parse help session data:", error);
      return null;
    }
  }

  /**
   * Save session data
   */
  private static saveSessionData(data: HelpSessionData): void {
    if (typeof window === "undefined") return;

    try {
      data.lastActivity = Date.now();
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save help session data:", error);
    }
  }

  /**
   * Update user profile
   */
  static updateUserProfile(profile: Partial<UserExperience>): void {
    const data = this.getSessionData();
    if (!data) return;

    data.userProfile = { ...data.userProfile, ...profile };
    this.saveSessionData(data);
  }

  /**
   * Track dismissed help
   */
  static dismissHelp(helpId: string): void {
    const data = this.getSessionData();
    if (!data) return;

    if (!data.dismissedHelp.includes(helpId)) {
      data.dismissedHelp.push(helpId);
      this.saveSessionData(data);
    }
  }

  /**
   * Check if help was dismissed
   */
  static wasHelpDismissed(helpId: string): boolean {
    const data = this.getSessionData();
    return data?.dismissedHelp.includes(helpId) || false;
  }

  /**
   * Track help rating
   */
  static rateHelp(helpId: string, helpful: boolean): void {
    const data = this.getSessionData();
    if (!data) return;

    const ratingArray = helpful ? data.helpfulRatings : data.notHelpfulRatings;
    const oppositeArray = helpful
      ? data.notHelpfulRatings
      : data.helpfulRatings;

    // Remove from opposite array if exists
    const oppositeIndex = oppositeArray.indexOf(helpId);
    if (oppositeIndex > -1) {
      oppositeArray.splice(oppositeIndex, 1);
    }

    // Add to rating array if not exists
    if (!ratingArray.includes(helpId)) {
      ratingArray.push(helpId);
    }

    this.saveSessionData(data);
  }

  /**
   * Get help rating
   */
  static getHelpRating(helpId: string): "helpful" | "not_helpful" | null {
    const data = this.getSessionData();
    if (!data) return null;

    if (data.helpfulRatings.includes(helpId)) return "helpful";
    if (data.notHelpfulRatings.includes(helpId)) return "not_helpful";
    return null;
  }

  /**
   * Track completed tutorial
   */
  static completeTutorial(tutorialId: string): void {
    const data = this.getSessionData();
    if (!data) return;

    if (!data.completedTutorials.includes(tutorialId)) {
      data.completedTutorials.push(tutorialId);
      this.saveSessionData(data);
    }
  }

  /**
   * Check if tutorial was completed
   */
  static wasTutorialCompleted(tutorialId: string): boolean {
    const data = this.getSessionData();
    return data?.completedTutorials.includes(tutorialId) || false;
  }

  /**
   * Track step time
   */
  static trackStepTime(stepId: string, timeSpent: number): void {
    const data = this.getSessionData();
    if (!data) return;

    const currentAverage =
      data.behaviorPatterns.averageTimePerStep[stepId] || 0;
    const currentCount =
      data.behaviorPatterns.averageTimePerStep[stepId + "_count"] || 0;

    // Calculate new average
    const newCount = currentCount + 1;
    const newAverage = (currentAverage * currentCount + timeSpent) / newCount;

    data.behaviorPatterns.averageTimePerStep[stepId] = newAverage;
    data.behaviorPatterns.averageTimePerStep[stepId + "_count"] = newCount;

    this.saveSessionData(data);
  }

  /**
   * Track error
   */
  static trackError(error: string): void {
    const data = this.getSessionData();
    if (!data) return;

    if (!data.behaviorPatterns.commonErrors.includes(error)) {
      data.behaviorPatterns.commonErrors.push(error);

      // Keep only last 10 errors
      if (data.behaviorPatterns.commonErrors.length > 10) {
        data.behaviorPatterns.commonErrors.shift();
      }

      this.saveSessionData(data);
    }
  }

  /**
   * Track hesitation
   */
  static trackHesitation(stepId: string): void {
    const data = this.getSessionData();
    if (!data) return;

    if (!data.behaviorPatterns.hesitationSteps.includes(stepId)) {
      data.behaviorPatterns.hesitationSteps.push(stepId);
      this.saveSessionData(data);
    }
  }

  /**
   * Update preferred help type based on usage
   */
  static updatePreferredHelpType(
    type: "tooltip" | "panel" | "tutorial" | "video" | "demo",
  ): void {
    const data = this.getSessionData();
    if (!data) return;

    data.behaviorPatterns.preferredHelpType = type;
    this.saveSessionData(data);
  }

  /**
   * Get behavior insights
   */
  static getBehaviorInsights(): {
    strugglingSteps: string[];
    quickSteps: string[];
    preferredHelpType: string;
    sessionDuration: number;
    errorRate: number;
  } | null {
    const data = this.getSessionData();
    if (!data) return null;

    const avgTimes = data.behaviorPatterns.averageTimePerStep;
    const times = Object.keys(avgTimes)
      .filter((key) => !key.endsWith("_count"))
      .map((key) => ({ step: key, time: avgTimes[key] }));

    // Sort by time to find struggling and quick steps
    times.sort((a, b) => b.time - a.time);

    const strugglingSteps = times.slice(0, 3).map((t) => t.step);
    const quickSteps = times.slice(-3).map((t) => t.step);

    return {
      strugglingSteps,
      quickSteps,
      preferredHelpType: data.behaviorPatterns.preferredHelpType,
      sessionDuration: Date.now() - data.sessionStartTime,
      errorRate: data.behaviorPatterns.commonErrors.length,
    };
  }

  /**
   * Export session data for analytics
   */
  static exportSessionData(): HelpSessionData | null {
    return this.getSessionData();
  }

  /**
   * Clear session
   */
  static clearSession(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Migrate from old storage format if needed
   */
  static migrate(): void {
    if (typeof window === "undefined") return;

    // Check for old format data
    const oldData = localStorage.getItem("help_session_data");
    if (oldData) {
      try {
        const parsed = JSON.parse(oldData);
        // Convert to new format if needed
        // ... migration logic ...
        localStorage.removeItem("help_session_data");
      } catch (error) {
        console.error("Failed to migrate old help session data:", error);
      }
    }
  }
}
