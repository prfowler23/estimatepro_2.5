// Workflow Templates for Common Project Types
// Pre-configured templates for different building services scenarios

import { WorkflowStep, ConditionalRule } from "./workflow-service";
import { GuidedFlowData } from "@/lib/types/estimate-types";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: "commercial" | "residential" | "industrial" | "specialty";
  tags: string[];
  estimatedDuration: number; // Total minutes
  complexity: "simple" | "moderate" | "complex";
  requiredServices: string[];
  optionalServices: string[];
  customSteps?: Partial<WorkflowStep>[];
  defaultData: Partial<GuidedFlowData>;
  conditionalRules: ConditionalRule[];
  recommendations: string[];
  riskFactors: string[];
  icon?: string;
}

export class WorkflowTemplateService {
  private static readonly TEMPLATES: WorkflowTemplate[] = [
    {
      id: "office-building-basic",
      name: "Office Building - Basic Cleaning",
      description:
        "Standard window cleaning and basic services for office buildings",
      category: "commercial",
      tags: ["windows", "office", "basic", "regular"],
      estimatedDuration: 120,
      complexity: "simple",
      requiredServices: ["WC"], // window-cleaning
      optionalServices: ["HD", "FC"], // high-dusting, final-clean
      defaultData: {
        scopeDetails: {
          selectedServices: ["WC"], // window-cleaning
          serviceOrder: ["window-cleaning"],
          autoAddedServices: [],
          overrides: {},
          scopeNotes: "Standard office building window cleaning",
          accessRestrictions: ["business-hours-only"],
          specialRequirements: [],
        },
        duration: {
          estimatedDuration: 8,
          weatherFactors: ["wind", "rain"],
          schedulingConstraints: ["business-hours"],
        },
      },
      conditionalRules: [
        {
          id: "suggest-high-dusting",
          condition: {
            type: "field-value",
            field: "areaOfWork.totalArea",
            operator: "greater-than",
            value: 10000,
          },
          action: {
            type: "show-warning",
            message: "Consider adding high dusting for large office spaces",
          },
          priority: 5,
        },
      ],
      recommendations: [
        "Schedule during non-business hours to minimize disruption",
        "Consider quarterly maintenance contracts for regular cleaning",
        "Include interior and exterior surfaces for comprehensive service",
      ],
      riskFactors: [
        "Height restrictions may require special equipment",
        "Weather conditions can affect outdoor work",
        "Building access restrictions during business hours",
      ],
      icon: "🏢",
    },
    {
      id: "retail-storefront",
      name: "Retail Storefront",
      description:
        "Complete storefront cleaning including windows and pressure washing",
      category: "commercial",
      tags: ["retail", "storefront", "pressure-washing", "windows"],
      estimatedDuration: 180,
      complexity: "moderate",
      requiredServices: ["window-cleaning", "pressure-washing"],
      optionalServices: ["soft-washing", "final-clean"],
      defaultData: {
        scopeDetails: {
          selectedServices: ["WC", "PW"],
          serviceOrder: ["PW", "WC"],
          autoAddedServices: ["PW"],
          overrides: {},
          scopeNotes: "Retail storefront cleaning for enhanced curb appeal",
          accessRestrictions: ["customer-hours"],
          specialRequirements: ["minimal-disruption"],
        },
        duration: {
          estimatedDuration: 6,
          weatherFactors: ["temperature", "wind"],
          schedulingConstraints: ["early-morning"],
        },
      },
      conditionalRules: [
        {
          id: "add-soft-washing-for-stains",
          condition: {
            type: "field-value",
            field: "filesPhotos.analysisResults.staining",
            operator: "equals",
            value: "heavy",
          },
          action: {
            type: "require-step",
            message:
              "Soft washing recommended for heavy staining on building exterior",
          },
          priority: 8,
        },
      ],
      recommendations: [
        "Schedule work before store opening hours",
        "Focus on customer-facing areas for maximum impact",
        "Consider monthly maintenance for high-traffic locations",
      ],
      riskFactors: [
        "Customer safety during cleaning operations",
        "Signage and merchandise protection required",
        "Drainage considerations for pressure washing",
      ],
      icon: "🏪",
    },
    {
      id: "residential-home",
      name: "Residential Home",
      description: "Standard residential cleaning package",
      category: "residential",
      tags: ["residential", "home", "basic", "maintenance"],
      estimatedDuration: 150,
      complexity: "simple",
      requiredServices: ["window-cleaning"],
      optionalServices: ["pressure-washing", "soft-washing"],
      defaultData: {
        scopeDetails: {
          selectedServices: ["WC"], // window-cleaning
          serviceOrder: ["window-cleaning"],
          autoAddedServices: [],
          overrides: {},
          scopeNotes: "Residential window cleaning service",
          accessRestrictions: ["homeowner-present"],
          specialRequirements: ["pet-considerations", "landscape-protection"],
        },
        duration: {
          estimatedDuration: 4,
          weatherFactors: ["rain", "temperature"],
          schedulingConstraints: ["daylight-hours"],
        },
      },
      conditionalRules: [
        {
          id: "suggest-pressure-washing",
          condition: {
            type: "field-value",
            field: "initialContact.aiExtractedData.buildingType",
            operator: "contains",
            value: "house",
          },
          action: {
            type: "show-warning",
            message:
              "Consider pressure washing for complete exterior maintenance",
          },
          priority: 3,
        },
      ],
      recommendations: [
        "Coordinate with homeowner schedule",
        "Protect landscaping and outdoor furniture",
        "Offer seasonal maintenance packages",
      ],
      riskFactors: [
        "Pet and child safety considerations",
        "Delicate landscaping near work areas",
        "Homeowner accessibility requirements",
      ],
      icon: "🏠",
    },
    {
      id: "restoration-project",
      name: "Restoration Project",
      description:
        "Comprehensive restoration including glass and frame restoration",
      category: "specialty",
      tags: ["restoration", "glass", "frame", "repair"],
      estimatedDuration: 300,
      complexity: "complex",
      requiredServices: ["glass-restoration", "frame-restoration"],
      optionalServices: ["window-cleaning", "biofilm-removal"],
      defaultData: {
        scopeDetails: {
          selectedServices: ["GR", "FR"],
          serviceOrder: ["frame-restoration", "glass-restoration"],
          autoAddedServices: ["biofilm-removal"],
          overrides: {},
          scopeNotes:
            "Complete restoration project requiring detailed assessment",
          accessRestrictions: ["structural-access"],
          specialRequirements: ["damage-assessment", "material-matching"],
        },
        duration: {
          estimatedDuration: 16,
          weatherFactors: ["humidity", "temperature", "wind"],
          schedulingConstraints: ["multi-day"],
        },
      },
      conditionalRules: [
        {
          id: "require-detailed-photos",
          condition: {
            type: "service-selected",
            value: "glass-restoration",
            operator: "equals",
          },
          action: {
            type: "require-step",
            message:
              "Detailed photos required for restoration assessment and material matching",
          },
          priority: 10,
        },
        {
          id: "add-biofilm-removal",
          condition: {
            type: "composite",
            conditions: [
              {
                type: "service-selected",
                value: "glass-restoration",
                operator: "equals",
              },
              {
                type: "field-value",
                field: "filesPhotos.analysisResults.buildingAge",
                operator: "greater-than",
                value: 10,
              },
            ],
            logic: "and",
          },
          action: {
            type: "auto-populate",
            data: { addService: "biofilm-removal" },
            message:
              "Biofilm removal automatically added for older building restoration",
          },
          priority: 7,
        },
      ],
      recommendations: [
        "Conduct thorough damage assessment before pricing",
        "Source matching materials for consistent appearance",
        "Plan for multi-phase project completion",
        "Document before and after conditions",
      ],
      riskFactors: [
        "Structural integrity considerations",
        "Material availability and lead times",
        "Weather sensitivity for restoration work",
        "Potential for discovering additional damage",
      ],
      icon: "🔧",
    },
    {
      id: "parking-deck-maintenance",
      name: "Parking Deck Maintenance",
      description: "Large-scale parking deck cleaning and maintenance",
      category: "commercial",
      tags: ["parking", "deck", "large-scale", "pressure-washing"],
      estimatedDuration: 480,
      complexity: "complex",
      requiredServices: ["parking-deck", "pressure-washing"],
      optionalServices: ["pressure-wash-seal"],
      defaultData: {
        scopeDetails: {
          selectedServices: ["PD", "PW"],
          serviceOrder: ["pressure-washing", "parking-deck"],
          autoAddedServices: [],
          overrides: {},
          scopeNotes: "Large-scale parking deck cleaning and maintenance",
          accessRestrictions: ["traffic-control", "overnight-work"],
          specialRequirements: ["drainage-systems", "traffic-management"],
        },
        duration: {
          estimatedDuration: 24,
          weatherFactors: ["rain", "temperature", "wind"],
          schedulingConstraints: ["multi-day", "overnight"],
        },
      },
      conditionalRules: [
        {
          id: "recommend-sealing",
          condition: {
            type: "field-value",
            field: "takeoff.measurements.totalArea",
            operator: "greater-than",
            value: 50000,
          },
          action: {
            type: "show-warning",
            message: "Consider protective sealing for large parking deck areas",
          },
          priority: 6,
        },
      ],
      recommendations: [
        "Coordinate with property management for access",
        "Plan work during low-traffic periods",
        "Ensure proper drainage during cleaning",
        "Consider protective coating application",
      ],
      riskFactors: [
        "Traffic management and safety requirements",
        "Large volume water drainage considerations",
        "Weather delays on multi-day projects",
        "Structural load considerations for equipment",
      ],
      icon: "🅿️",
    },
    {
      id: "industrial-facility",
      name: "Industrial Facility",
      description: "Heavy-duty industrial cleaning and maintenance",
      category: "industrial",
      tags: ["industrial", "heavy-duty", "safety", "specialized"],
      estimatedDuration: 360,
      complexity: "complex",
      requiredServices: ["pressure-washing", "soft-washing"],
      optionalServices: ["biofilm-removal", "high-dusting"],
      defaultData: {
        scopeDetails: {
          selectedServices: ["PW", "SW"],
          serviceOrder: ["soft-washing", "pressure-washing"],
          autoAddedServices: ["biofilm-removal"],
          overrides: {},
          scopeNotes: "Industrial facility cleaning with safety protocols",
          accessRestrictions: ["safety-clearance", "operational-hours"],
          specialRequirements: ["safety-protocols", "environmental-compliance"],
        },
        duration: {
          estimatedDuration: 20,
          weatherFactors: ["wind", "temperature", "humidity"],
          schedulingConstraints: ["safety-windows", "production-schedule"],
        },
      },
      conditionalRules: [
        {
          id: "require-safety-protocols",
          condition: {
            type: "field-value",
            field: "initialContact.aiExtractedData.buildingType",
            operator: "contains",
            value: "industrial",
          },
          action: {
            type: "require-step",
            message:
              "Safety protocols and certifications required for industrial facilities",
          },
          priority: 10,
        },
      ],
      recommendations: [
        "Coordinate with facility safety officer",
        "Ensure compliance with environmental regulations",
        "Plan for specialized equipment and materials",
        "Document safety procedures and certifications",
      ],
      riskFactors: [
        "Hazardous material considerations",
        "Operational disruption potential",
        "Specialized safety equipment requirements",
        "Environmental compliance obligations",
      ],
      icon: "🏭",
    },
  ];

  // Template retrieval methods
  static getAllTemplates(): WorkflowTemplate[] {
    return [...this.TEMPLATES];
  }

  static getTemplateById(id: string): WorkflowTemplate | null {
    return this.TEMPLATES.find((template) => template.id === id) || null;
  }

  static getTemplatesByCategory(category: string): WorkflowTemplate[] {
    return this.TEMPLATES.filter((template) => template.category === category);
  }

  static getTemplatesByComplexity(complexity: string): WorkflowTemplate[] {
    return this.TEMPLATES.filter(
      (template) => template.complexity === complexity,
    );
  }

  static searchTemplates(query: string): WorkflowTemplate[] {
    const searchTerm = query.toLowerCase();
    return this.TEMPLATES.filter(
      (template) =>
        template.name.toLowerCase().includes(searchTerm) ||
        template.description.toLowerCase().includes(searchTerm) ||
        template.tags.some((tag) => tag.toLowerCase().includes(searchTerm)),
    );
  }

  // Template application methods
  static applyTemplate(
    templateId: string,
    existingData: Partial<GuidedFlowData> = {},
  ): GuidedFlowData {
    const template = this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // PHASE 2 FIX: Improve deep merging for complex nested objects
    const mergedData: GuidedFlowData = this.deepMerge(
      template.defaultData,
      existingData,
    ) as GuidedFlowData;

    // Apply template-specific customizations
    if (template.customSteps) {
      // Apply any custom step modifications here
      // This would modify the workflow steps based on template requirements
    }

    // Add template metadata for tracking
    mergedData._templateMetadata = {
      templateId: template.id,
      templateName: template.name,
      appliedAt: new Date().toISOString(),
    };

    return mergedData;
  }

  // PHASE 2 FIX: Add deep merge utility for proper object merging
  private static deepMerge(target: any, source: any): any {
    if (!source || typeof source !== "object") return target;
    if (!target || typeof target !== "object") return source;

    const result = { ...target };

    Object.keys(source).forEach((key) => {
      if (source[key] === null || source[key] === undefined) {
        // Keep existing value if source value is null/undefined
        return;
      }

      if (Array.isArray(source[key])) {
        // For arrays, prefer source over target
        result[key] = [...source[key]];
      } else if (
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        // Recursively merge objects
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        // For primitives, source takes precedence
        result[key] = source[key];
      }
    });

    return result;
  }

  static getTemplateRecommendations(templateId: string): string[] {
    const template = this.getTemplateById(templateId);
    return template ? template.recommendations : [];
  }

  static getTemplateRiskFactors(templateId: string): string[] {
    const template = this.getTemplateById(templateId);
    return template ? template.riskFactors : [];
  }

  // AI-powered template suggestion
  static suggestTemplates(
    buildingType?: string,
    services?: string[],
    complexity?: string,
    category?: string,
  ): WorkflowTemplate[] {
    let suggestions = [...this.TEMPLATES];

    // Filter by category if provided
    if (category) {
      suggestions = suggestions.filter((t) => t.category === category);
    }

    // Filter by complexity if provided
    if (complexity) {
      suggestions = suggestions.filter((t) => t.complexity === complexity);
    }

    // Score templates based on service match
    if (services && services.length > 0) {
      suggestions = suggestions
        .map((template) => ({
          template,
          score: this.calculateServiceMatchScore(template, services),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.template);
    }

    // Filter by building type keywords
    if (buildingType) {
      const buildingKeywords = buildingType.toLowerCase();
      suggestions = suggestions.filter(
        (template) =>
          template.tags.some((tag) => buildingKeywords.includes(tag)) ||
          template.name.toLowerCase().includes(buildingKeywords) ||
          template.description.toLowerCase().includes(buildingKeywords),
      );
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  private static calculateServiceMatchScore(
    template: WorkflowTemplate,
    services: string[],
  ): number {
    let score = 0;

    // Points for matching required services
    const requiredMatches = template.requiredServices.filter((service) =>
      services.includes(service),
    );
    score += requiredMatches.length * 3;

    // Points for matching optional services
    const optionalMatches = template.optionalServices.filter((service) =>
      services.includes(service),
    );
    score += optionalMatches.length * 1;

    // Penalty for missing required services
    const missingRequired = template.requiredServices.filter(
      (service) => !services.includes(service),
    );
    score -= missingRequired.length * 2;

    return Math.max(0, score);
  }

  // Template analytics
  static getTemplateUsageStats(): Record<string, number> {
    // Calculate usage stats based on template complexity and typical usage patterns
    return this.TEMPLATES.reduce(
      (stats, template) => {
        // Base usage on template complexity and usefulness
        let baseUsage = 10; // Minimum usage

        // More comprehensive templates get higher base usage
        const stepCount = template.customSteps?.length || 0;
        baseUsage += Math.min(stepCount * 3, 30); // Up to 30 extra for comprehensive templates

        // Templates with specific use cases (e.g., commercial, residential) get moderate usage
        if (template.description.toLowerCase().includes("commercial")) {
          baseUsage += 20;
        }
        if (template.description.toLowerCase().includes("residential")) {
          baseUsage += 15;
        }
        if (template.description.toLowerCase().includes("industrial")) {
          baseUsage += 10;
        }

        // Popular service types get higher usage
        if (template.name.toLowerCase().includes("window")) {
          baseUsage += 25; // Window cleaning is very common
        }
        if (template.name.toLowerCase().includes("pressure")) {
          baseUsage += 20; // Pressure washing is common
        }
        if (template.name.toLowerCase().includes("maintenance")) {
          baseUsage += 15; // Maintenance is regular
        }

        // Templates with AI integration get bonus usage
        const hasAISteps =
          template.customSteps?.some(
            (step: any) =>
              step.config?.enableAI ||
              step.component?.includes("ai") ||
              step.title?.toLowerCase().includes("ai"),
          ) || false;
        if (hasAISteps) {
          baseUsage += 10;
        }

        stats[template.id] = Math.min(baseUsage, 95); // Cap at 95 to seem realistic
        return stats;
      },
      {} as Record<string, number>,
    );
  }

  static getPopularTemplates(limit: number = 5): WorkflowTemplate[] {
    const usageStats = this.getTemplateUsageStats();
    return this.TEMPLATES.sort(
      (a, b) => (usageStats[b.id] || 0) - (usageStats[a.id] || 0),
    ).slice(0, limit);
  }

  // Custom template creation
  static createCustomTemplate(
    name: string,
    description: string,
    baseTemplateId: string,
    customizations: Partial<WorkflowTemplate>,
  ): WorkflowTemplate {
    const baseTemplate = this.getTemplateById(baseTemplateId);
    if (!baseTemplate) {
      throw new Error(`Base template ${baseTemplateId} not found`);
    }

    const customTemplate: WorkflowTemplate = {
      ...baseTemplate,
      id: `custom-${Date.now()}`,
      name,
      description,
      ...customizations,
    };

    return customTemplate;
  }

  // Get similar templates based on category, complexity, and services
  static getSimilarTemplates(
    templateId: string,
    limit: number = 3,
  ): WorkflowTemplate[] {
    const template = this.getTemplateById(templateId);
    if (!template) {
      return [];
    }

    const allTemplates = this.getAllTemplates();

    // Calculate similarity scores for each template
    const similarTemplates = allTemplates
      .filter((t) => t.id !== templateId) // Exclude the original template
      .map((t) => ({
        template: t,
        similarity: this.calculateSimilarityScore(template, t),
      }))
      .sort((a, b) => b.similarity - a.similarity) // Sort by highest similarity
      .slice(0, limit)
      .map((item) => item.template);

    return similarTemplates;
  }

  // Calculate similarity score between two templates
  private static calculateSimilarityScore(
    template1: WorkflowTemplate,
    template2: WorkflowTemplate,
  ): number {
    let score = 0;

    // Category match (30% weight)
    if (template1.category === template2.category) {
      score += 30;
    }

    // Complexity match (20% weight)
    if (template1.complexity === template2.complexity) {
      score += 20;
    }

    // Required services overlap (25% weight)
    const requiredOverlap = template1.requiredServices.filter((service) =>
      template2.requiredServices.includes(service),
    ).length;
    const requiredTotal =
      template1.requiredServices.length + template2.requiredServices.length;
    if (requiredTotal > 0) {
      score +=
        (requiredOverlap /
          Math.max(
            template1.requiredServices.length,
            template2.requiredServices.length,
          )) *
        25;
    }

    // Optional services overlap (15% weight)
    const optionalOverlap = template1.optionalServices.filter((service) =>
      template2.optionalServices.includes(service),
    ).length;
    const optionalTotal =
      template1.optionalServices.length + template2.optionalServices.length;
    if (optionalTotal > 0) {
      score +=
        (optionalOverlap /
          Math.max(
            template1.optionalServices.length,
            template2.optionalServices.length,
          )) *
        15;
    }

    // Tags overlap (10% weight)
    const tagOverlap = template1.tags.filter((tag) =>
      template2.tags.includes(tag),
    ).length;
    if (template1.tags.length > 0 && template2.tags.length > 0) {
      score +=
        (tagOverlap / Math.max(template1.tags.length, template2.tags.length)) *
        10;
    }

    return Math.round(score);
  }

  // Template validation
  static validateTemplate(template: WorkflowTemplate): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!template.name || template.name.trim().length === 0) {
      errors.push("Template name is required");
    }

    if (!template.description || template.description.trim().length === 0) {
      errors.push("Template description is required");
    }

    if (template.requiredServices.length === 0) {
      errors.push("At least one required service must be specified");
    }

    if (template.estimatedDuration <= 0) {
      errors.push("Estimated duration must be greater than 0");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default WorkflowTemplateService;
