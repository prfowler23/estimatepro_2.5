import { GuidedFlowData } from "@/lib/types/estimate-types";
import {
  UserExperience,
  HelpContext,
  HelpTrigger,
  HelpContent,
  InteractiveTutorial,
  TutorialStep,
} from "./help-types";
import { HelpCache, helpContentCache, tutorialCache } from "./help-performance";
import { getHelpConfig } from "./help-config";

// Re-export types for backward compatibility
export type {
  UserExperience,
  HelpContext,
  HelpTrigger,
  HelpContent,
  InteractiveTutorial,
  TutorialStep,
};

export class HelpContextEngine {
  private static helpDatabase: Map<string, HelpContent> = new Map();
  private static tutorialDatabase: Map<string, InteractiveTutorial> = new Map();
  private static userBehaviorTracking: Map<string, any> = new Map();

  /**
   * Initialize the help system with content
   */
  static initialize() {
    this.loadHelpContent();
    this.loadTutorials();
  }

  /**
   * Get contextual help for current state
   */
  static getContextualHelp(
    context: HelpContext,
    userProfile: UserExperience,
    flowData?: GuidedFlowData,
  ): HelpContent[] {
    // Create cache key based on context and user profile
    const cacheKey = `contextual_${context.stepId}_${userProfile.experienceLevel}_${context.formState || "unknown"}`;

    // Check cache first
    const cached = helpContentCache.get(cacheKey);
    if (cached) {
      return cached as HelpContent[];
    }

    const relevantHelp: HelpContent[] = [];

    for (const [, helpContent] of this.helpDatabase) {
      if (this.isHelpRelevant(helpContent, context, userProfile, flowData)) {
        relevantHelp.push(helpContent);
      }
    }

    // Sort by priority and user experience level
    const result = relevantHelp.sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;

      // Prefer content for user's experience level
      const aHasUserLevel = a.audience.includes(userProfile.experienceLevel);
      const bHasUserLevel = b.audience.includes(userProfile.experienceLevel);

      if (aHasUserLevel && !bHasUserLevel) return -1;
      if (!aHasUserLevel && bHasUserLevel) return 1;

      return 0;
    });

    // Cache the result
    helpContentCache.set(cacheKey, result);

    return result;
  }

  /**
   * Get smart help suggestions based on current form state
   */
  static getSmartSuggestions(
    context: HelpContext,
    userProfile: UserExperience,
    flowData: GuidedFlowData,
  ): HelpContent[] {
    // Create cache key
    const cacheKey = `suggestions_${context.stepId}_${userProfile.experienceLevel}_${context.formState || "unknown"}`;

    // Check cache
    const cached = helpContentCache.get(cacheKey);
    if (cached) {
      return cached as HelpContent[];
    }

    const suggestions: HelpContent[] = [];

    // Analyze form completeness
    const completionAnalysis = this.analyzeFormCompletion(
      context.stepNumber,
      flowData,
    );

    // Get suggestions based on what's missing or could be improved
    if (completionAnalysis.missingRequired.length > 0) {
      suggestions.push(
        ...this.getRequiredFieldHelp(
          completionAnalysis.missingRequired,
          userProfile,
        ),
      );
    }

    if (completionAnalysis.improvementOpportunities.length > 0) {
      suggestions.push(
        ...this.getImprovementHelp(
          completionAnalysis.improvementOpportunities,
          userProfile,
        ),
      );
    }

    // Add experience-level specific suggestions
    suggestions.push(
      ...this.getExperienceLevelSuggestions(context, userProfile, flowData),
    );

    const result = suggestions.slice(0, 5); // Limit to top 5 suggestions

    // Cache the result
    helpContentCache.set(cacheKey, result);

    return result;
  }

  /**
   * Get available tutorials for current context
   */
  static getAvailableTutorials(
    context: HelpContext,
    userProfile: UserExperience,
  ): InteractiveTutorial[] {
    // Create cache key
    const cacheKey = `tutorials_${context.stepId}_${userProfile.experienceLevel}`;

    // Check cache
    const cached = tutorialCache.get(cacheKey);
    if (cached) {
      return cached as InteractiveTutorial[];
    }

    const tutorials: InteractiveTutorial[] = [];

    for (const [, tutorial] of this.tutorialDatabase) {
      if (this.isTutorialRelevant(tutorial, context, userProfile)) {
        tutorials.push(tutorial);
      }
    }

    return tutorials.sort((a, b) => {
      // Sort by difficulty (easier first for novices, harder first for experts)
      const difficultyOrder =
        userProfile.experienceLevel === "novice"
          ? ["beginner", "intermediate", "advanced"]
          : ["advanced", "intermediate", "beginner"];

      return (
        difficultyOrder.indexOf(a.difficulty) -
        difficultyOrder.indexOf(b.difficulty)
      );
    });

    // Cache the result
    tutorialCache.set(cacheKey, tutorials);

    return tutorials;
  }

  /**
   * Track user behavior for smart help triggers
   */
  static trackUserBehavior(
    userId: string,
    context: HelpContext,
    behavior: {
      action: string;
      timestamp: number;
      data?: any;
    },
  ) {
    const userKey = `${userId}-${context.stepId}`;
    const tracking = this.userBehaviorTracking.get(userKey) || {
      timeOnStep: 0,
      errorCount: 0,
      hesitationIndicators: [],
      actions: [],
    };

    tracking.actions.push(behavior);

    // Update metrics
    if (behavior.action === "error") {
      tracking.errorCount++;
    }

    if (behavior.action === "hesitation") {
      tracking.hesitationIndicators.push(behavior.data);
    }

    // Calculate time on step
    const stepActions = tracking.actions.filter(
      (a: any) => a.action === "step_enter",
    );
    if (stepActions.length > 0) {
      tracking.timeOnStep = behavior.timestamp - stepActions[0].timestamp;
    }

    this.userBehaviorTracking.set(userKey, tracking);
  }

  /**
   * Get help triggers that should fire now
   */
  static getTriggeredHelp(
    context: HelpContext,
    userProfile: UserExperience,
    userId: string,
  ): HelpContent[] {
    const userKey = `${userId}-${context.stepId}`;
    const behavior = this.userBehaviorTracking.get(userKey);
    const triggered: HelpContent[] = [];

    for (const [, helpContent] of this.helpDatabase) {
      for (const trigger of helpContent.triggers) {
        if (this.shouldTriggerHelp(trigger, context, behavior, userProfile)) {
          triggered.push(helpContent);
          break; // Only trigger once per help content
        }
      }
    }

    return triggered.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Analyze form completion for smart suggestions
   */
  private static analyzeFormCompletion(
    stepNumber: number,
    flowData: GuidedFlowData,
  ) {
    const analysis = {
      missingRequired: [] as string[],
      improvementOpportunities: [] as string[],
      completionScore: 0,
    };

    switch (stepNumber) {
      case 1: // Initial Contact
        if (!flowData.initialContact?.extractedData?.customer?.name) {
          analysis.missingRequired.push("customer.name");
        }
        if (!flowData.initialContact?.extractedData?.customer?.email) {
          analysis.missingRequired.push("customer.email");
        }
        if (
          !flowData.initialContact?.extractedData?.requirements?.buildingType
        ) {
          analysis.improvementOpportunities.push("building_type_helps_ai");
        }
        break;

      case 2: // Scope Details
        if (!flowData.scopeDetails?.selectedServices?.length) {
          analysis.missingRequired.push("selected_services");
        }
        if (flowData.scopeDetails?.selectedServices?.length === 1) {
          analysis.improvementOpportunities.push("consider_bundled_services");
        }
        break;

      case 3: // Files/Photos
        if (!flowData.filesPhotos?.files?.length) {
          analysis.missingRequired.push("building_photos");
        }
        if (
          flowData.filesPhotos?.files?.length &&
          flowData.filesPhotos.files.length < 3
        ) {
          analysis.improvementOpportunities.push("more_photos_better_analysis");
        }
        break;

      // Add cases for other steps...
    }

    // Calculate completion score
    const totalFields =
      analysis.missingRequired.length +
      analysis.improvementOpportunities.length +
      5; // baseline
    const completedFields = totalFields - analysis.missingRequired.length;
    analysis.completionScore = (completedFields / totalFields) * 100;

    return analysis;
  }

  /**
   * Check if help content is relevant to current context
   */
  private static isHelpRelevant(
    helpContent: HelpContent,
    context: HelpContext,
    userProfile: UserExperience,
    flowData?: GuidedFlowData,
  ): boolean {
    // Check audience
    if (!helpContent.audience.includes(userProfile.experienceLevel)) {
      return false;
    }

    // Check context matching
    if (
      helpContent.context.stepId &&
      helpContent.context.stepId !== context.stepId
    ) {
      return false;
    }

    if (
      helpContent.context.stepNumber &&
      helpContent.context.stepNumber !== context.stepNumber
    ) {
      return false;
    }

    if (
      helpContent.context.fieldId &&
      helpContent.context.fieldId !== context.fieldId
    ) {
      return false;
    }

    // Check conditional logic
    if (
      helpContent.context.hasErrors !== undefined &&
      helpContent.context.hasErrors !== context.hasErrors
    ) {
      return false;
    }

    return true;
  }

  /**
   * Check if tutorial is relevant
   */
  private static isTutorialRelevant(
    tutorial: InteractiveTutorial,
    context: HelpContext,
    userProfile: UserExperience,
  ): boolean {
    // Check difficulty vs experience level
    const difficultyMap = {
      novice: ["beginner", "intermediate"],
      intermediate: ["intermediate", "advanced"],
      expert: ["advanced"],
    };

    return difficultyMap[userProfile.experienceLevel].includes(
      tutorial.difficulty,
    );
  }

  /**
   * Check if help should be triggered
   */
  private static shouldTriggerHelp(
    trigger: HelpTrigger,
    context: HelpContext,
    behavior: any,
    userProfile: UserExperience,
  ): boolean {
    switch (trigger.type) {
      case "onLoad":
        return true; // Always trigger on load

      case "onError":
        return context.hasErrors === true;

      case "onHesitation":
        return behavior?.hesitationIndicators?.length > 0;

      case "onTimeout":
        return behavior?.timeOnStep > (trigger.delay || 30000); // 30 seconds default

      case "onEmpty":
        return context.formState === "empty";

      default:
        return false;
    }
  }

  /**
   * Get help for required fields
   */
  private static getRequiredFieldHelp(
    fields: string[],
    userProfile: UserExperience,
  ): HelpContent[] {
    return fields.map((field) => ({
      id: `required-${field}`,
      title: `${field.replace("_", " ").replace(".", " ")} is required`,
      content: this.getFieldHelpContent(field, userProfile.experienceLevel),
      type: "tooltip" as const,
      triggers: [{ type: "onEmpty" as const, priority: 10 }],
      audience: [userProfile.experienceLevel],
      context: { fieldId: field },
      priority: 10,
      tags: ["required", "field-help"],
      lastUpdated: new Date().toISOString(),
    }));
  }

  /**
   * Get improvement suggestions
   */
  private static getImprovementHelp(
    opportunities: string[],
    userProfile: UserExperience,
  ): HelpContent[] {
    return opportunities.map((opportunity) => ({
      id: `improvement-${opportunity}`,
      title: this.getImprovementTitle(opportunity),
      content: this.getImprovementContent(
        opportunity,
        userProfile.experienceLevel,
      ),
      type: "panel" as const,
      triggers: [{ type: "onLoad" as const, priority: 5 }],
      audience: [userProfile.experienceLevel],
      context: {},
      priority: 5,
      tags: ["improvement", "suggestion"],
      lastUpdated: new Date().toISOString(),
    }));
  }

  /**
   * Get experience-level specific suggestions
   */
  private static getExperienceLevelSuggestions(
    context: HelpContext,
    userProfile: UserExperience,
    flowData: GuidedFlowData,
  ): HelpContent[] {
    const suggestions: HelpContent[] = [];

    if (userProfile.experienceLevel === "novice") {
      // Add beginner-friendly tips
      suggestions.push({
        id: "novice-tip-ai-assistance",
        title: "Let AI help you",
        content:
          "Look for the ✨ sparkle icon throughout the form - it indicates AI-powered suggestions that can save you time and improve accuracy.",
        type: "panel",
        triggers: [{ type: "onLoad", priority: 8 }],
        audience: ["novice"],
        context: {},
        priority: 8,
        tags: ["ai", "beginner-tip"],
        lastUpdated: new Date().toISOString(),
      });
    }

    if (userProfile.experienceLevel === "expert") {
      // Add advanced shortcuts and tips
      suggestions.push({
        id: "expert-tip-keyboard-shortcuts",
        title: "Keyboard shortcuts available",
        content:
          "Press Tab to navigate between fields quickly, or use Ctrl+Enter to proceed to the next step.",
        type: "tooltip",
        triggers: [{ type: "onLoad", priority: 3 }],
        audience: ["expert"],
        context: {},
        priority: 3,
        tags: ["shortcuts", "efficiency"],
        lastUpdated: new Date().toISOString(),
      });
    }

    return suggestions;
  }

  /**
   * Load help content database
   */
  private static loadHelpContent() {
    // This would typically load from a database or CMS
    // For now, we'll initialize with core content
    this.loadStepSpecificHelp();
    this.loadFieldSpecificHelp();
    this.loadFeatureHelp();
  }

  /**
   * Load tutorial database
   */
  private static loadTutorials() {
    // Initialize with core tutorials
    this.loadBasicTutorials();
    this.loadAdvancedTutorials();
  }

  /**
   * Load step-specific help content
   */
  private static loadStepSpecificHelp() {
    const stepHelp: HelpContent[] = [
      {
        id: "step1-overview",
        title: "Initial Contact Overview",
        content:
          "This step captures how you received the project inquiry. The AI can extract customer details and project requirements from emails, meeting notes, or phone conversations.",
        type: "panel",
        triggers: [{ type: "onLoad", priority: 7 }],
        audience: ["novice", "intermediate"],
        context: { stepId: "initial-contact", stepNumber: 1 },
        priority: 7,
        tags: ["step-overview", "ai-extraction"],
        lastUpdated: new Date().toISOString(),
      },
      {
        id: "step2-services",
        title: "Selecting Services",
        content:
          "Choose all services that apply to this project. Consider bundling complementary services for better value and efficiency.",
        type: "panel",
        triggers: [{ type: "onLoad", priority: 6 }],
        audience: ["novice", "intermediate"],
        context: { stepId: "scope-details", stepNumber: 2 },
        priority: 6,
        tags: ["services", "bundling"],
        lastUpdated: new Date().toISOString(),
      },
      {
        id: "step3-photos",
        title: "Photo Requirements",
        content:
          "Take clear photos of the building facade, focusing on windows, surfaces, and any damage. More photos lead to better AI analysis and more accurate estimates.",
        type: "panel",
        triggers: [{ type: "onLoad", priority: 6 }],
        audience: ["novice", "intermediate", "expert"],
        context: { stepId: "files-photos", stepNumber: 3 },
        priority: 6,
        tags: ["photos", "ai-analysis"],
        lastUpdated: new Date().toISOString(),
      },
    ];

    stepHelp.forEach((help) => this.helpDatabase.set(help.id, help));
  }

  /**
   * Load field-specific help content
   */
  private static loadFieldSpecificHelp() {
    const fieldHelp: HelpContent[] = [
      {
        id: "customer-name-help",
        title: "Customer Name",
        content:
          "Enter the primary contact person for this project. This should be the decision maker or main point of contact.",
        type: "tooltip",
        triggers: [{ type: "onFocus", priority: 5 }],
        audience: ["novice"],
        context: { fieldId: "customer.name" },
        priority: 5,
        tags: ["customer-info"],
        lastUpdated: new Date().toISOString(),
      },
      {
        id: "building-type-help",
        title: "Building Type",
        content:
          "Selecting the correct building type helps AI provide more accurate analysis and service recommendations.",
        type: "tooltip",
        triggers: [{ type: "onFocus", priority: 5 }],
        audience: ["novice", "intermediate"],
        context: { fieldId: "requirements.buildingType" },
        priority: 5,
        tags: ["building-info", "ai-enhancement"],
        lastUpdated: new Date().toISOString(),
      },
    ];

    fieldHelp.forEach((help) => this.helpDatabase.set(help.id, help));
  }

  /**
   * Load feature-specific help content
   */
  private static loadFeatureHelp() {
    const featureHelp: HelpContent[] = [
      {
        id: "ai-extraction-feature",
        title: "AI Information Extraction",
        content:
          'Paste your email conversation or meeting notes, then click "Extract Information with AI" to automatically fill customer details and project requirements.',
        type: "panel",
        triggers: [{ type: "onLoad", priority: 8 }],
        audience: ["novice"],
        context: { stepId: "initial-contact" },
        priority: 8,
        tags: ["ai-feature", "extraction"],
        lastUpdated: new Date().toISOString(),
      },
    ];

    featureHelp.forEach((help) => this.helpDatabase.set(help.id, help));
  }

  /**
   * Load basic tutorials
   */
  private static loadBasicTutorials() {
    const basicTutorial: InteractiveTutorial = {
      id: "first-estimate-tutorial",
      title: "Create Your First Estimate",
      description:
        "Learn how to create a professional estimate using AI-powered assistance.",
      estimatedTime: 10,
      difficulty: "beginner",
      steps: [
        {
          id: "step1",
          title: "Start with Contact Method",
          content: "Select how you received this project inquiry.",
          targetElement: '[data-tutorial="contact-method"]',
          position: "bottom",
          action: "click",
        },
        {
          id: "step2",
          title: "Use AI Extraction",
          content: "Paste your communication and let AI extract the details.",
          targetElement: '[data-tutorial="ai-extract"]',
          position: "top",
          action: "click",
        },
      ],
    };

    this.tutorialDatabase.set(basicTutorial.id, basicTutorial);
  }

  /**
   * Load advanced tutorials
   */
  private static loadAdvancedTutorials() {
    const advancedTutorial: InteractiveTutorial = {
      id: "advanced-ai-features",
      title: "Advanced AI Features",
      description:
        "Learn to leverage advanced AI capabilities for complex estimates.",
      estimatedTime: 15,
      difficulty: "advanced",
      steps: [
        {
          id: "step1",
          title: "Smart Defaults",
          content:
            "Understand how AI generates smart defaults based on context.",
          targetElement: '[data-tutorial="smart-defaults"]',
          position: "left",
        },
      ],
    };

    this.tutorialDatabase.set(advancedTutorial.id, advancedTutorial);
  }

  /**
   * Get field-specific help content
   */
  private static getFieldHelpContent(
    field: string,
    experienceLevel: string,
  ): string {
    const helpMap: Record<string, Record<string, string>> = {
      "customer.name": {
        novice:
          "Enter the main contact person for this project. This should be the person who will make decisions about the work.",
        intermediate:
          "Primary contact for project decisions and communication.",
        expert: "Decision maker contact.",
      },
      "customer.email": {
        novice:
          "A valid email address is required for sending the estimate and future communication.",
        intermediate: "Email for estimate delivery and project communication.",
        expert: "Contact email for estimate delivery.",
      },
    };

    return (
      helpMap[field]?.[experienceLevel] || "This field is required to continue."
    );
  }

  /**
   * Get improvement opportunity titles
   */
  private static getImprovementTitle(opportunity: string): string {
    const titleMap: Record<string, string> = {
      building_type_helps_ai: "Building Type Enhances AI Analysis",
      consider_bundled_services: "Consider Service Bundling",
      more_photos_better_analysis: "More Photos Improve Accuracy",
    };

    return titleMap[opportunity] || "Improvement Opportunity";
  }

  /**
   * Get improvement opportunity content
   */
  private static getImprovementContent(
    opportunity: string,
    experienceLevel: string,
  ): string {
    const contentMap: Record<string, Record<string, string>> = {
      building_type_helps_ai: {
        novice:
          "Selecting the building type helps our AI provide more accurate analysis of your photos and better service recommendations.",
        intermediate: "Building type selection improves AI analysis accuracy.",
        expert: "Specify building type for optimized AI analysis.",
      },
      consider_bundled_services: {
        novice:
          "Bundling related services often provides better value for customers and more efficient scheduling for you.",
        intermediate:
          "Service bundling can improve project efficiency and customer value.",
        expert: "Consider service bundling for efficiency gains.",
      },
    };

    return (
      contentMap[opportunity]?.[experienceLevel] ||
      "This could be improved for better results."
    );
  }
}
