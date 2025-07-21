// Advanced Business Rule Engine for Guided Estimation Flow
// Provides comprehensive validation, business logic, and decision support

import { GuidedFlowData, PricingCalculation } from "@/lib/types/estimate-types";
import { z } from "zod";

// Rule execution context
export interface RuleContext {
  flowData: GuidedFlowData;
  currentStep: number;
  userProfile?: {
    experienceLevel: "novice" | "intermediate" | "expert";
    role: "estimator" | "manager" | "admin";
    preferences: Record<string, any>;
  };
  projectType?: string;
  businessSettings?: Record<string, any>;
}

// Rule definition interfaces
export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  category:
    | "validation"
    | "calculation"
    | "pricing"
    | "safety"
    | "compliance"
    | "optimization";
  priority: "critical" | "high" | "medium" | "low";
  condition: (context: RuleContext) => boolean;
  action: (context: RuleContext) => RuleResult;
  enabled: boolean;
  appliesTo: number[]; // Step numbers this rule applies to
}

export interface RuleResult {
  type: "error" | "warning" | "info" | "suggestion";
  message: string;
  code: string;
  severity: 1 | 2 | 3 | 4 | 5; // 1 = low, 5 = critical
  autoFix?: {
    canFix: boolean;
    description: string;
    action: (context: RuleContext) => Partial<GuidedFlowData>;
  };
  compliance?: {
    standard: string;
    requirement: string;
    impact: string;
  };
  recommendations?: string[];
}

export interface ValidationReport {
  isValid: boolean;
  errors: RuleResult[];
  warnings: RuleResult[];
  suggestions: RuleResult[];
  complianceIssues: RuleResult[];
  totalScore: number; // 0-100, quality score
  stepScores: Record<number, number>;
  autoFixAvailable: boolean;
  executedRules: string[];
}

// Pre-defined business rules
export class BusinessRuleEngine {
  private static rules: BusinessRule[] = [];
  private static initialized = false;
  private static executionDepth = 0;
  private static readonly MAX_EXECUTION_DEPTH = 10;

  static initialize() {
    if (this.initialized) return;

    this.rules = [
      // Critical validation rules
      {
        id: "SAFETY_HEIGHT_VALIDATION",
        name: "Safety Height Validation",
        description: "Ensures proper safety protocols for work above 6 feet",
        category: "safety",
        priority: "critical",
        condition: (context) => {
          const takeoffData = context.flowData.takeoff;
          return (
            takeoffData?.takeoffData?.measurements?.some(
              (m: any) => m.category === "elevation" && m.quantity > 6,
            ) || false
          );
        },
        action: (context) => ({
          type: "error",
          message:
            "Work above 6 feet requires additional safety equipment and certification",
          code: "SAFETY_001",
          severity: 5,
          compliance: {
            standard: "OSHA 1926.451",
            requirement: "Fall protection required for work 6+ feet",
            impact: "Legal liability and worker safety",
          },
          recommendations: [
            "Include fall protection equipment in materials",
            "Add safety training time to labor calculations",
            "Verify worker certifications",
          ],
        }),
        enabled: true,
        appliesTo: [5, 7], // Takeoff and Expenses steps
      },

      {
        id: "PRICING_MARGIN_VALIDATION",
        name: "Pricing Margin Validation",
        description: "Validates minimum profit margins",
        category: "pricing",
        priority: "high",
        condition: (context) => {
          const pricingData = context.flowData.pricing;
          return (
            pricingData?.pricingCalculations?.margin !== undefined &&
            pricingData.pricingCalculations.margin < 15
          );
        },
        action: (context) => ({
          type: "warning",
          message: "Profit margin below 15% may not cover overhead and risk",
          code: "PRICING_001",
          severity: 3,
          autoFix: {
            canFix: true,
            description: "Adjust pricing to achieve minimum 15% margin",
            action: (ctx) => {
              const currentTotal =
                ctx.flowData.expenses?.totalCosts?.grand || 0;
              const targetPrice = currentTotal / 0.85; // 15% margin
              return {
                pricing: {
                  ...ctx.flowData.pricing,
                  finalPrice: targetPrice,
                  pricingCalculations: {
                    ...ctx.flowData.pricing?.pricingCalculations,
                    margin: 15,
                  } as PricingCalculation,
                  adjustments: [
                    ...(ctx.flowData.pricing?.adjustments || []),
                    {
                      type: "margin_adjustment",
                      amount:
                        targetPrice -
                        (ctx.flowData.pricing?.basePrice || currentTotal),
                      reason: "Minimum margin requirement",
                    },
                  ],
                },
              };
            },
          },
          recommendations: [
            "Review material costs for optimization opportunities",
            "Consider value-based pricing strategies",
            "Evaluate efficiency improvements",
          ],
        }),
        enabled: true,
        appliesTo: [8], // Pricing step
      },

      {
        id: "CUSTOMER_CONTACT_COMPLETENESS",
        name: "Customer Contact Completeness",
        description: "Ensures adequate customer contact information",
        category: "validation",
        priority: "high",
        condition: (context) => {
          const customer =
            context.flowData.initialContact?.aiExtractedData?.customer;
          return !customer?.email && !customer?.phone;
        },
        action: (context) => ({
          type: "error",
          message: "At least one contact method (email or phone) is required",
          code: "CONTACT_001",
          severity: 4,
          recommendations: [
            "Request customer contact information",
            "Verify contact details before proceeding",
            "Consider adding backup contact person",
          ],
        }),
        enabled: true,
        appliesTo: [1], // Initial contact step
      },

      {
        id: "SERVICE_COMPATIBILITY_CHECK",
        name: "Service Compatibility Check",
        description: "Validates service combinations and sequencing",
        category: "validation",
        priority: "medium",
        condition: (context) => {
          const services =
            context.flowData.scopeDetails?.selectedServices || [];
          // Check for incompatible service combinations
          return (
            services.includes("PW") &&
            services.includes("SW") &&
            !services.includes("PWS")
          ); // Pressure wash + soft wash without combined service
        },
        action: (context) => ({
          type: "suggestion",
          message:
            "Consider using Pressure Wash & Seal service for combined cleaning efficiency",
          code: "SERVICE_001",
          severity: 2,
          autoFix: {
            canFix: true,
            description: "Replace separate PW and SW with combined PWS service",
            action: (ctx) => {
              const currentServices =
                ctx.flowData.scopeDetails?.selectedServices || [];
              const newServices = currentServices
                .filter((s) => s !== "PW" && s !== "SW")
                .concat(["PWS"]);
              return {
                scopeDetails: {
                  ...ctx.flowData.scopeDetails,
                  selectedServices: newServices,
                  autoAddedServices: ["PWS"],
                },
              };
            },
          },
          recommendations: [
            "Combined services often provide better value",
            "Reduces setup time and equipment costs",
            "Ensures consistent quality across treatments",
          ],
        }),
        enabled: true,
        appliesTo: [2], // Scope details step
      },

      {
        id: "TIMELINE_FEASIBILITY_CHECK",
        name: "Timeline Feasibility Check",
        description: "Validates project timeline against scope complexity",
        category: "calculation",
        priority: "medium",
        condition: (context) => {
          const timeline = context.flowData.duration?.timeline;
          const services =
            context.flowData.scopeDetails?.selectedServices?.length || 0;
          const totalArea =
            context.flowData.takeoff?.takeoffData?.measurements?.reduce(
              (sum: number, m: any) => sum + m.quantity,
              0,
            ) || 0;

          if (!timeline?.totalDays || services === 0) return false;

          // Simple heuristic: 1 day per 1000 sq ft + 1 day per service
          const estimatedDays = Math.ceil(totalArea / 1000) + services;
          return timeline.totalDays < estimatedDays * 0.7; // 30% buffer
        },
        action: (context) => ({
          type: "warning",
          message: "Timeline may be too aggressive for project scope",
          code: "TIMELINE_001",
          severity: 3,
          recommendations: [
            "Consider extending timeline for quality assurance",
            "Evaluate need for additional crew members",
            "Plan for weather contingencies",
            "Schedule buffer time for unexpected issues",
          ],
        }),
        enabled: true,
        appliesTo: [6], // Duration step
      },

      {
        id: "MATERIAL_QUANTITY_VALIDATION",
        name: "Material Quantity Validation",
        description: "Validates material quantities against measurements",
        category: "calculation",
        priority: "high",
        condition: (context) => {
          const materials = context.flowData.expenses?.materialCosts || [];
          const totalArea =
            context.flowData.takeoff?.takeoffData?.measurements?.reduce(
              (sum: number, m: any) => sum + m.quantity,
              0,
            ) || 0;

          // Check if chemical quantities seem reasonable for area
          const chemicals = materials.filter(
            (m: any) =>
              m.item.toLowerCase().includes("chemical") ||
              m.item.toLowerCase().includes("solution"),
          );

          return chemicals.some((chemical: any) => {
            const coverage = totalArea / chemical.quantity;
            return coverage > 500 || coverage < 50; // Unrealistic coverage rates
          });
        },
        action: (context) => ({
          type: "warning",
          message: "Material quantities may not match project scope",
          code: "MATERIAL_001",
          severity: 3,
          recommendations: [
            "Verify material coverage rates with manufacturer specs",
            "Consider waste factor in calculations",
            "Review measurement accuracy",
            "Check for bulk purchasing opportunities",
          ],
        }),
        enabled: true,
        appliesTo: [7], // Expenses step
      },

      {
        id: "COMPLIANCE_ENVIRONMENTAL_CHECK",
        name: "Environmental Compliance Check",
        description: "Checks for environmental compliance requirements",
        category: "compliance",
        priority: "high",
        condition: (context) => {
          const buildingType =
            context.flowData.initialContact?.aiExtractedData?.requirements
              ?.buildingType;
          const services =
            context.flowData.scopeDetails?.selectedServices || [];

          // Schools, hospitals, and food service require special compliance
          const sensitiveBuildings = ["school", "hospital", "restaurant"];
          const chemicalServices = ["SW", "GR", "GRC"];

          return (
            sensitiveBuildings.includes(buildingType || "") &&
            services.some((s) => chemicalServices.includes(s))
          );
        },
        action: (context) => ({
          type: "info",
          message:
            "Sensitive building type requires environmental compliance documentation",
          code: "COMPLIANCE_001",
          severity: 3,
          compliance: {
            standard: "EPA Guidelines",
            requirement: "Approved chemicals and disposal procedures",
            impact: "Project approval and legal compliance",
          },
          recommendations: [
            "Verify all chemicals are EPA approved for building type",
            "Include environmental compliance costs",
            "Document waste disposal procedures",
            "Obtain necessary permits before work begins",
          ],
        }),
        enabled: true,
        appliesTo: [2, 7], // Scope and expenses steps
      },

      {
        id: "EXPERIENCE_LEVEL_GUIDANCE",
        name: "Experience Level Guidance",
        description: "Provides guidance based on user experience level",
        category: "optimization",
        priority: "low",
        condition: (context) => {
          return context.userProfile?.experienceLevel === "novice";
        },
        action: (context) => ({
          type: "info",
          message:
            "Consider using workflow templates for consistent estimating",
          code: "GUIDANCE_001",
          severity: 1,
          recommendations: [
            "Review estimation best practices guide",
            "Use conservative estimates until experience grows",
            "Consult with senior estimators on complex projects",
            "Track actual vs estimated performance for learning",
          ],
        }),
        enabled: true,
        appliesTo: [1, 2, 3, 4, 5, 6, 7, 8, 9], // All steps
      },
    ];

    this.initialized = true;
  }

  // Helper method to execute rules for a specific step without calculating step scores
  private static executeRulesForStep(context: RuleContext): {
    results: RuleResult[];
    executedRules: string[];
  } {
    this.initialize();

    const applicableRules = this.rules.filter(
      (rule) => rule.enabled && rule.appliesTo.includes(context.currentStep),
    );

    const results: RuleResult[] = [];
    const executedRules: string[] = [];

    for (const rule of applicableRules) {
      try {
        if (rule.condition(context)) {
          const result = rule.action(context);
          results.push(result);
          executedRules.push(rule.id);
        }
      } catch (error) {
        console.error(`Error executing rule ${rule.id}:`, error);
        results.push({
          type: "error",
          message: `Rule execution failed: ${rule.name}`,
          code: "RULE_ERROR",
          severity: 2,
        });
      }
    }

    return { results, executedRules };
  }

  // Execute all applicable rules for current context
  static executeRules(context: RuleContext): ValidationReport {
    // Recursion detection guard
    this.executionDepth++;

    if (this.executionDepth > this.MAX_EXECUTION_DEPTH) {
      console.error(
        "BusinessRuleEngine: Maximum execution depth exceeded, preventing infinite recursion",
      );
      this.executionDepth--;
      return {
        isValid: false,
        errors: [
          {
            type: "error",
            message:
              "Rule execution exceeded maximum depth - possible infinite recursion",
            code: "RECURSION_ERROR",
            severity: 5,
          },
        ],
        warnings: [],
        suggestions: [],
        complianceIssues: [],
        totalScore: 0,
        stepScores: {},
        autoFixAvailable: false,
        executedRules: [],
      };
    }

    try {
      const { results, executedRules } = this.executeRulesForStep(context);

      // Categorize results
      const errors = results.filter((r) => r.type === "error");
      const warnings = results.filter((r) => r.type === "warning");
      const suggestions = results.filter((r) => r.type === "suggestion");
      const complianceIssues = results.filter((r) => r.compliance);

      // Calculate quality score
      const totalScore = this.calculateQualityScore(results, context);
      const stepScores = this.calculateStepScores(context);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        complianceIssues,
        totalScore,
        stepScores,
        autoFixAvailable: results.some((r) => r.autoFix?.canFix),
        executedRules,
      };
    } finally {
      this.executionDepth--;
    }
  }

  // Apply auto-fixes for rules that support it
  static applyAutoFixes(
    context: RuleContext,
    ruleCodes?: string[],
  ): GuidedFlowData {
    this.initialize();

    const applicableRules = this.rules.filter(
      (rule) =>
        rule.enabled &&
        rule.appliesTo.includes(context.currentStep) &&
        (!ruleCodes || ruleCodes.includes(rule.id)),
    );

    let updatedData = { ...context.flowData };

    for (const rule of applicableRules) {
      try {
        if (rule.condition(context)) {
          const result = rule.action(context);
          if (result.autoFix?.canFix) {
            const contextWithUpdates = { ...context, flowData: updatedData };
            const fixes = result.autoFix.action(contextWithUpdates);
            updatedData = this.mergeDeep(updatedData, fixes);
          }
        }
      } catch (error) {
        console.error(`Error applying auto-fix for rule ${rule.id}:`, error);
      }
    }

    return updatedData;
  }

  // Calculate overall quality score
  private static calculateQualityScore(
    results: RuleResult[],
    context: RuleContext,
  ): number {
    let baseScore = 100;

    for (const result of results) {
      switch (result.type) {
        case "error":
          baseScore -= result.severity * 5;
          break;
        case "warning":
          baseScore -= result.severity * 2;
          break;
        case "suggestion":
          // Suggestions don't reduce score
          break;
      }
    }

    // Additional scoring based on completeness
    const completenessScore = this.calculateCompletenessScore(context);
    return Math.max(0, Math.min(100, baseScore * (completenessScore / 100)));
  }

  // Calculate step-by-step scores
  private static calculateStepScores(
    context: RuleContext,
  ): Record<number, number> {
    const stepScores: Record<number, number> = {};

    for (let step = 1; step <= 9; step++) {
      const stepContext = { ...context, currentStep: step };
      const { results } = this.executeRulesForStep(stepContext);

      // Calculate quality score for this step
      const stepScore = this.calculateQualityScore(results, stepContext);
      stepScores[step] = stepScore;
    }

    return stepScores;
  }

  // Calculate completeness score based on required data
  private static calculateCompletenessScore(context: RuleContext): number {
    const data = context.flowData;
    let score = 0;
    let maxScore = 0;

    // Step 1: Initial Contact
    maxScore += 20;
    if (data.initialContact?.aiExtractedData?.customer?.name) score += 5;
    if (
      data.initialContact?.aiExtractedData?.customer?.email ||
      data.initialContact?.aiExtractedData?.customer?.phone
    )
      score += 5;
    if (data.initialContact?.aiExtractedData?.requirements?.services?.length)
      score += 5;
    if (data.initialContact?.aiExtractedData?.requirements?.buildingType)
      score += 5;

    // Step 2: Scope Details
    maxScore += 15;
    if (data.scopeDetails?.selectedServices?.length) score += 10;
    if (data.scopeDetails?.scopeNotes) score += 5;

    // Step 3: Files/Photos
    maxScore += 10;
    if (data.filesPhotos?.uploadedFiles?.length) score += 10;

    // Step 4: Area of Work
    maxScore += 10;
    if (data.areaOfWork?.workAreas?.length) score += 10;

    // Step 5: Takeoff
    maxScore += 15;
    if (data.takeoff?.takeoffData?.measurements?.length) score += 15;

    // Step 6: Duration
    maxScore += 10;
    if (data.duration?.timeline?.totalDays) score += 10;

    // Step 7: Expenses
    maxScore += 15;
    if (data.expenses?.totalCosts?.grand) score += 15;

    // Step 8: Pricing
    maxScore += 10;
    if (data.pricing?.finalPrice) score += 10;

    // Step 9: Summary
    maxScore += 5;
    if (data.summary?.proposalGenerated) score += 5;

    return maxScore > 0 ? (score / maxScore) * 100 : 0;
  }

  // Deep merge utility for applying fixes
  private static mergeDeep(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.mergeDeep(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  // Get rule by ID
  static getRule(ruleId: string): BusinessRule | undefined {
    this.initialize();
    return this.rules.find((rule) => rule.id === ruleId);
  }

  // Get all rules for a category
  static getRulesByCategory(
    category: BusinessRule["category"],
  ): BusinessRule[] {
    this.initialize();
    return this.rules.filter(
      (rule) => rule.category === category && rule.enabled,
    );
  }

  // Add custom rule
  static addRule(rule: BusinessRule): void {
    this.initialize();
    this.rules.push(rule);
  }

  // Update rule configuration
  static updateRule(ruleId: string, updates: Partial<BusinessRule>): boolean {
    this.initialize();
    const ruleIndex = this.rules.findIndex((rule) => rule.id === ruleId);
    if (ruleIndex !== -1) {
      this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
      return true;
    }
    return false;
  }

  // Get rules summary for UI
  static getRulesSummary(): {
    total: number;
    enabled: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  } {
    this.initialize();

    const enabled = this.rules.filter((r) => r.enabled).length;
    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    this.rules.forEach((rule) => {
      byCategory[rule.category] = (byCategory[rule.category] || 0) + 1;
      byPriority[rule.priority] = (byPriority[rule.priority] || 0) + 1;
    });

    return {
      total: this.rules.length,
      enabled,
      byCategory,
      byPriority,
    };
  }
}

export default BusinessRuleEngine;
