// AI service layer for photo analysis and content extraction

import { withAIRetry } from "@/lib/utils/retry-logic";
import {
  isNotNull,
  safeString,
  safeNumber,
  withDefaultArray,
} from "@/lib/utils/null-safety";
import {
  AIExtractedData,
  AIAnalysisResult,
  ServiceType,
  UploadedFile,
  WorkArea,
  ServiceDependency,
} from "@/lib/types/estimate-types";
import {
  getBuildingAnalysisPrompt,
  getContactExtractionPrompt,
  getServiceRecommendationPrompt,
  getScopeValidationPrompt,
  getFacadeAnalysisPrompt,
} from "../ai/prompts/prompt-constants";

export interface PhotoAnalysisParams {
  imageUrl: string;
  analysisType: "building" | "scope" | "damage" | "measurement";
  buildingContext?: {
    buildingType?: string;
    stories?: number;
    address?: string;
  };
}

export interface ContactExtractionParams {
  content: string;
  contentType: "email" | "document" | "message";
}

export interface ServiceRecommendationParams {
  buildingAnalysis: AIAnalysisResult;
  userPreferences?: string[];
  budgetRange?: {
    min: number;
    max: number;
  };
}

export interface SimilarProjectsParams {
  projectType: string;
  budget?: {
    min?: number;
    max?: number;
  };
  features?: string[];
  userId?: string;
}

export interface SimilarProject {
  id: string;
  name: string;
  type: string;
  totalCost: number;
  features: string[];
  completionDate: string;
  similarity: number;
}

export interface AIValidationResult {
  isValid: boolean;
  confidence: number;
  warnings: string[];
  suggestions: string[];
}

export class AIService {
  private static readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private static readonly API_BASE_URL = "https://api.openai.com/v1";

  private static async fetchOpenAI(
    model: string,
    messages: any[],
    max_tokens: number,
  ) {
    if (!this.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    const result = await withAIRetry(async () => {
      const response = await fetch(`${this.API_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    });

    return result.success ? result.data || null : null;
  }

  // Photo analysis methods
  static async analyzeBuilding(
    params: PhotoAnalysisParams,
  ): Promise<AIAnalysisResult | null> {
    const content = await this.fetchOpenAI(
      "gpt-4o",
      [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: getBuildingAnalysisPrompt(params),
            },
            {
              type: "image_url",
              image_url: {
                url: params.imageUrl,
              },
            },
          ],
        },
      ],
      1000,
    );

    return this.parseBuildingAnalysis(content);
  }

  static async extractContactInfo(
    params: ContactExtractionParams,
  ): Promise<AIExtractedData | null> {
    const content = await this.fetchOpenAI(
      "gpt-4",
      [
        {
          role: "system",
          content: getContactExtractionPrompt(params.contentType),
        },
        {
          role: "user",
          content: params.content,
        },
      ],
      800,
    );

    return this.parseContactExtraction(content);
  }

  static async recommendServices(
    params: ServiceRecommendationParams,
  ): Promise<ServiceType[]> {
    const content = await this.fetchOpenAI(
      "gpt-4",
      [
        {
          role: "system",
          content: getServiceRecommendationPrompt(),
        },
        {
          role: "user",
          content: JSON.stringify({
            buildingAnalysis: params.buildingAnalysis,
            userPreferences: params.userPreferences,
            budgetRange: params.budgetRange,
          }),
        },
      ],
      600,
    );

    return this.parseServiceRecommendations(content);
  }

  static async analyzeFacadeComprehensive(
    imageUrl: string,
    buildingType: string = "commercial",
  ): Promise<any> {
    const content = await this.fetchOpenAI(
      "gpt-4o",
      [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: getFacadeAnalysisPrompt(buildingType),
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      2000,
    );

    return this.parseFacadeAnalysis(content);
  }

  static async validateScope(content: string): Promise<AIValidationResult> {
    const validationContent = await this.fetchOpenAI(
      "gpt-4",
      [
        {
          role: "system",
          content: getScopeValidationPrompt(),
        },
        {
          role: "user",
          content: content,
        },
      ],
      500,
    );

    return this.parseScopeValidation(validationContent);
  }

  // Business logic methods
  static calculateConfidenceScore(analysisResult: AIAnalysisResult): number {
    let score = 0;
    let factors = 0;

    // Building identification confidence
    if (
      analysisResult.findings.surfaceArea &&
      analysisResult.findings.surfaceArea > 0
    ) {
      score += 0.3;
      factors++;
    }

    // Service requirements confidence
    if (
      analysisResult.findings.recommendations &&
      analysisResult.findings.recommendations.length > 0
    ) {
      score += 0.4;
      factors++;
    }

    // Risk assessment confidence
    if (
      analysisResult.findings.complications &&
      analysisResult.findings.complications.length > 0
    ) {
      score += 0.2;
      factors++;
    }

    // Measurement confidence
    if (
      analysisResult.findings.buildingHeight &&
      analysisResult.findings.buildingHeight > 0
    ) {
      score += 0.1;
      factors++;
    }

    return factors > 0 ? (score / factors) * 100 : 0;
  }

  static generateServiceDependencies(
    services: ServiceType[],
  ): ServiceDependency[] {
    const dependencies: ServiceDependency[] = [];

    // Define dependency rules
    const dependencyRules = {
      "glass-restoration": ["window-cleaning"],
      "frame-restoration": ["window-cleaning"],
      "pressure-wash-seal": ["pressure-washing"],
      "final-clean": ["high-dusting", "window-cleaning"],
      "granite-reconditioning": ["pressure-washing"],
    };

    services.forEach((service) => {
      const requiredServices =
        dependencyRules[service as keyof typeof dependencyRules];
      if (requiredServices) {
        requiredServices.forEach((required) => {
          if (services.includes(required as ServiceType)) {
            dependencies.push({
              serviceType: service,
              dependsOn: [required],
              mustPrecedeBy: 24, // 24 hours
            });
          }
        });
      }
    });

    return dependencies;
  }

  static prioritizeServices(services: ServiceType[]): ServiceType[] {
    const priorityOrder = [
      "high-dusting",
      "pressure-washing",
      "soft-washing",
      "biofilm-removal",
      "window-cleaning",
      "glass-restoration",
      "frame-restoration",
      "granite-reconditioning",
      "pressure-wash-seal",
      "final-clean",
      "parking-deck",
    ];

    return services.sort((a, b) => {
      const indexA = priorityOrder.indexOf(a);
      const indexB = priorityOrder.indexOf(b);

      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  }

  // Utility methods
  static formatAnalysisForUser(analysis: AIAnalysisResult): string {
    const sections = [];

    if (analysis.findings.surfaceArea) {
      sections.push(`Surface Area: ${analysis.findings.surfaceArea} sq ft`);
    }

    if (
      analysis.findings.recommendations &&
      analysis.findings.recommendations.length > 0
    ) {
      sections.push(
        `Recommendations: ${analysis.findings.recommendations.join(", ")}`,
      );
    }

    if (
      analysis.findings.complications &&
      analysis.findings.complications.length > 0
    ) {
      sections.push(
        `Complications: ${analysis.findings.complications.join(", ")}`,
      );
    }

    if (analysis.findings.buildingHeight) {
      sections.push(
        `Building Height: ${analysis.findings.buildingHeight} stories`,
      );
    }

    if (analysis.findings.windowCount) {
      sections.push(`Windows: ${analysis.findings.windowCount}`);
    }

    return sections.join("\n\n");
  }

  static mergeAnalysisResults(results: AIAnalysisResult[]): AIAnalysisResult {
    const merged: AIAnalysisResult = {
      id: crypto.randomUUID(),
      fileId: results[0]?.fileId || "merged",
      analysisType: "facade",
      confidence: 0,
      findings: {
        surfaceArea: 0,
        buildingHeight: 0,
        windowCount: 0,
        accessPoints: [],
        complications: [],
        recommendations: [],
      },
      processedAt: new Date(),
      processingTime: 0,
    };

    results.forEach((result) => {
      // Merge surface areas
      if (result.findings.surfaceArea) {
        merged.findings.surfaceArea =
          (merged.findings.surfaceArea || 0) + result.findings.surfaceArea;
      }

      // Take maximum building height
      if (result.findings.buildingHeight) {
        merged.findings.buildingHeight = Math.max(
          merged.findings.buildingHeight || 0,
          result.findings.buildingHeight,
        );
      }

      // Sum window counts
      if (result.findings.windowCount) {
        merged.findings.windowCount =
          (merged.findings.windowCount || 0) + result.findings.windowCount;
      }

      // Merge arrays
      if (result.findings.accessPoints) {
        merged.findings.accessPoints = [
          ...(merged.findings.accessPoints || []),
          ...result.findings.accessPoints,
        ];
      }

      if (result.findings.complications) {
        merged.findings.complications = [
          ...(merged.findings.complications || []),
          ...result.findings.complications,
        ];
      }

      if (result.findings.recommendations) {
        merged.findings.recommendations = [
          ...(merged.findings.recommendations || []),
          ...result.findings.recommendations,
        ];
      }

      // Take maximum confidence
      merged.confidence = Math.max(merged.confidence, result.confidence || 0);

      // Sum processing times
      merged.processingTime += result.processingTime || 0;
    });

    // Remove duplicates
    merged.findings.accessPoints = [...new Set(merged.findings.accessPoints)];
    merged.findings.complications = [...new Set(merged.findings.complications)];
    merged.findings.recommendations = [
      ...new Set(merged.findings.recommendations),
    ];

    // Calculate average confidence
    const confidenceSum = results.reduce(
      (sum, r) => sum + (r.confidence || 0),
      0,
    );
    merged.confidence = results.length > 0 ? confidenceSum / results.length : 0;

    return merged;
  }

  // Private helper methods
  private static parseBuildingAnalysis(content: string): AIAnalysisResult {
    try {
      const parsed = JSON.parse(content);
      return {
        id: crypto.randomUUID(),
        fileId: parsed.fileId || "unknown",
        analysisType: parsed.analysisType || "facade",
        confidence: safeNumber(parsed.confidence),
        findings: {
          surfaceArea: safeNumber(parsed.surfaceArea),
          buildingHeight: safeNumber(parsed.buildingHeight),
          windowCount: safeNumber(parsed.windowCount),
          accessPoints: withDefaultArray(parsed.accessPoints),
          complications: withDefaultArray(parsed.complications),
          recommendations: withDefaultArray(parsed.recommendations),
        },
        processedAt: new Date(),
        processingTime: 0,
      };
    } catch (error) {
      console.error("Error parsing building analysis:", error);
      return {
        id: crypto.randomUUID(),
        fileId: "error",
        analysisType: "facade",
        confidence: 0,
        findings: {
          surfaceArea: 0,
          buildingHeight: 0,
          windowCount: 0,
          accessPoints: [],
          complications: [],
          recommendations: [],
        },
        processedAt: new Date(),
        processingTime: 0,
      };
    }
  }

  private static parseContactExtraction(content: string): AIExtractedData {
    try {
      const parsed = JSON.parse(content);
      return {
        customer: {
          name: safeString(parsed.customerName || parsed.customer?.name),
          company: safeString(parsed.companyName || parsed.customer?.company),
          email: safeString(parsed.customerEmail || parsed.customer?.email),
          phone: safeString(parsed.customerPhone || parsed.customer?.phone),
          address: safeString(
            parsed.buildingAddress || parsed.customer?.address,
          ),
        },
        requirements: {
          services: withDefaultArray(
            parsed.serviceRequests || parsed.requirements?.services,
          ),
          buildingType: safeString(
            parsed.buildingType || parsed.requirements?.buildingType,
          ),
          buildingSize: safeString(
            parsed.buildingSize || parsed.requirements?.buildingSize,
          ),
          floors: safeNumber(parsed.floors || parsed.requirements?.floors),
          timeline: safeString(
            parsed.timeline || parsed.requirements?.timeline,
          ),
          budget: safeString(parsed.budget || parsed.requirements?.budget),
        },
        urgencyScore: safeNumber(parsed.urgencyScore),
        confidence: safeNumber(parsed.confidence),
        extractionDate: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error parsing contact extraction:", error);
      return {
        customer: {
          name: "",
          company: "",
          email: "",
          phone: "",
          address: "",
        },
        requirements: {
          services: [],
          buildingType: "",
          buildingSize: "",
          floors: 0,
          timeline: "",
          budget: "",
        },
        urgencyScore: 0,
        confidence: 0,
        extractionDate: new Date().toISOString(),
      };
    }
  }

  private static parseFacadeAnalysis(content: string): any {
    try {
      const parsed = JSON.parse(content);
      return {
        windows: {
          count: safeNumber(parsed.windows?.count),
          totalArea: safeNumber(parsed.windows?.totalArea),
          gridPattern: safeString(parsed.windows?.gridPattern),
          confidence: safeNumber(parsed.windows?.confidence),
          cleaningDifficulty:
            safeString(parsed.windows?.cleaningDifficulty) || "medium",
        },
        materials: {
          breakdown: parsed.materials?.breakdown || {},
          conditions: withDefaultArray(parsed.materials?.conditions),
          cleaningDifficulty: safeNumber(parsed.materials?.cleaningDifficulty),
          dominant: safeString(parsed.materials?.dominant),
          weathering: safeString(parsed.materials?.weathering) || "light",
        },
        damage: {
          staining: withDefaultArray(parsed.damage?.staining),
          oxidation: withDefaultArray(parsed.damage?.oxidation),
          damage: withDefaultArray(parsed.damage?.damage),
          severity: safeString(parsed.damage?.severity) || "low",
          affectedArea: safeNumber(parsed.damage?.affectedArea),
          repairUrgency: safeString(parsed.damage?.repairUrgency) || "none",
        },
        safety: {
          hazards: withDefaultArray(parsed.safety?.hazards),
          requirements: withDefaultArray(parsed.safety?.requirements),
          riskLevel: safeString(parsed.safety?.riskLevel) || "medium",
          accessChallenges: withDefaultArray(parsed.safety?.accessChallenges),
          equipmentNeeded: withDefaultArray(parsed.safety?.equipmentNeeded),
        },
        measurements: {
          buildingHeight: safeNumber(parsed.measurements?.buildingHeight),
          facadeWidth: safeNumber(parsed.measurements?.facadeWidth),
          confidence: safeNumber(parsed.measurements?.confidence),
          estimatedSqft: safeNumber(parsed.measurements?.estimatedSqft),
          stories: safeNumber(parsed.measurements?.stories),
        },
        recommendations: {
          services: withDefaultArray(parsed.recommendations?.services),
          timeline: safeString(parsed.recommendations?.timeline),
          priority: safeString(parsed.recommendations?.priority) || "medium",
          estimatedCost: {
            min: safeNumber(parsed.recommendations?.estimatedCost?.min),
            max: safeNumber(parsed.recommendations?.estimatedCost?.max),
          },
        },
        analysisDate: new Date().toISOString(),
        confidence: safeNumber(parsed.confidence) || 0.8,
      };
    } catch (error) {
      console.error("Error parsing facade analysis:", error);
      return {
        windows: {
          count: 0,
          totalArea: 0,
          gridPattern: "",
          confidence: 0,
          cleaningDifficulty: "medium",
        },
        materials: {
          breakdown: {},
          conditions: [],
          cleaningDifficulty: 0,
          dominant: "",
          weathering: "light",
        },
        damage: {
          staining: [],
          oxidation: [],
          damage: [],
          severity: "low",
          affectedArea: 0,
          repairUrgency: "none",
        },
        safety: {
          hazards: [],
          requirements: [],
          riskLevel: "medium",
          accessChallenges: [],
          equipmentNeeded: [],
        },
        measurements: {
          buildingHeight: 0,
          facadeWidth: 0,
          confidence: 0,
          estimatedSqft: 0,
          stories: 0,
        },
        recommendations: {
          services: [],
          timeline: "",
          priority: "medium",
          estimatedCost: { min: 0, max: 0 },
        },
        analysisDate: new Date().toISOString(),
        confidence: 0,
      };
    }
  }

  private static parseServiceRecommendations(content: string): ServiceType[] {
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Error parsing service recommendations:", error);
      return [];
    }
  }

  private static parseScopeValidation(content: string): AIValidationResult {
    try {
      const parsed = JSON.parse(content);
      return {
        isValid: Boolean(parsed.isValid),
        confidence: safeNumber(parsed.confidence),
        warnings: withDefaultArray(parsed.warnings),
        suggestions: withDefaultArray(parsed.suggestions),
      };
    } catch (error) {
      console.error("Error parsing scope validation:", error);
      return {
        isValid: false,
        confidence: 0,
        warnings: ["Failed to validate scope"],
        suggestions: [],
      };
    }
  }

  // Template recommendation service
  static async generateTemplateRecommendations(params: {
    buildingType?: string;
    services?: string[];
    existingData?: any;
    projectContext?: string;
  }): Promise<{
    score: number;
    reasoning: string;
    pros: string[];
    cons: string[];
    alternatives: string[];
    confidence: number;
  }> {
    try {
      const content = await this.fetchOpenAI(
        "gpt-4",
        [
          {
            role: "system",
            content: this.getTemplateRecommendationPrompt(),
          },
          {
            role: "user",
            content: JSON.stringify({
              buildingType: params.buildingType,
              services: params.services,
              existingData: params.existingData,
              projectContext: params.projectContext,
            }),
          },
        ],
        800,
      );

      return this.parseTemplateRecommendation(content);
    } catch (error) {
      console.error("Error generating template recommendations:", error);
      return {
        score: 50,
        reasoning: "Unable to generate AI recommendation at this time",
        pros: ["Template provides structured workflow"],
        cons: ["Unable to analyze specific match"],
        alternatives: [],
        confidence: 30,
      };
    }
  }

  private static getTemplateRecommendationPrompt(): string {
    return `You are an AI assistant specialized in analyzing building service projects and recommending workflow templates.

Your task is to analyze project requirements and provide template recommendations with detailed reasoning.

Analyze the provided project data and return a JSON response with this structure:
{
  "score": 85,
  "reasoning": "This template scores highly because...",
  "pros": [
    "Template includes all required services",
    "Optimized for this building type",
    "Well-tested workflow"
  ],
  "cons": [
    "May include unnecessary optional services",
    "Complex workflow requires more time"
  ],
  "alternatives": ["alternative-template-1", "alternative-template-2"],
  "confidence": 85
}

Scoring criteria:
- Service match (30%): How well template services align with required services
- Building type compatibility (25%): Template category matches building type
- Complexity appropriateness (20%): Template complexity suits project requirements
- Risk mitigation (15%): Template addresses project-specific risks
- Efficiency (10%): Template optimizes workflow for this scenario

Consider:
- Required vs optional services
- Building type and complexity
- Timeline constraints
- Risk factors
- Historical success rates
- User experience level

Provide practical, actionable insights that help users make informed template decisions.`;
  }

  private static parseTemplateRecommendation(content: string): {
    score: number;
    reasoning: string;
    pros: string[];
    cons: string[];
    alternatives: string[];
    confidence: number;
  } {
    try {
      const parsed = JSON.parse(content);
      return {
        score: Math.max(0, Math.min(100, safeNumber(parsed.score))),
        reasoning:
          safeString(parsed.reasoning) || "Template analysis completed",
        pros: withDefaultArray(parsed.pros),
        cons: withDefaultArray(parsed.cons),
        alternatives: withDefaultArray(parsed.alternatives),
        confidence: Math.max(0, Math.min(100, safeNumber(parsed.confidence))),
      };
    } catch (error) {
      console.error("Error parsing template recommendation:", error);
      return {
        score: 50,
        reasoning: "Template analysis could not be completed",
        pros: ["Structured workflow approach"],
        cons: ["Limited analysis available"],
        alternatives: [],
        confidence: 30,
      };
    }
  }

  // Find similar projects method
  static async findSimilarProjects(
    params: SimilarProjectsParams,
  ): Promise<{ projects: SimilarProject[] }> {
    try {
      // Simulate finding similar projects
      // In production, this would query the database or use AI embeddings
      const mockProjects: SimilarProject[] = [
        {
          id: crypto.randomUUID(),
          name: `${params.projectType} - Downtown Office Complex`,
          type: params.projectType,
          totalCost: 45000,
          features: ["High-rise", "Glass facade", "Monthly service"],
          completionDate: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          similarity: 0.92,
        },
        {
          id: crypto.randomUUID(),
          name: `${params.projectType} - Corporate Campus`,
          type: params.projectType,
          totalCost: 38000,
          features: ["Multi-building", "Mixed materials", "Quarterly service"],
          completionDate: new Date(
            Date.now() - 60 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          similarity: 0.85,
        },
        {
          id: crypto.randomUUID(),
          name: `${params.projectType} - Medical Center`,
          type: params.projectType,
          totalCost: 52000,
          features: ["Specialized cleaning", "24/7 access", "Monthly service"],
          completionDate: new Date(
            Date.now() - 45 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          similarity: 0.78,
        },
      ];

      // Filter by budget if provided
      let filteredProjects = mockProjects;
      if (params.budget) {
        filteredProjects = mockProjects.filter((p) => {
          if (params.budget?.min && p.totalCost < params.budget.min)
            return false;
          if (params.budget?.max && p.totalCost > params.budget.max)
            return false;
          return true;
        });
      }

      // Filter by features if provided
      if (params.features && params.features.length > 0) {
        filteredProjects = filteredProjects.map((p) => {
          const matchingFeatures = p.features.filter((f) =>
            params.features?.some((pf) =>
              f.toLowerCase().includes(pf.toLowerCase()),
            ),
          );
          return {
            ...p,
            similarity:
              p.similarity *
              (matchingFeatures.length / params.features!.length),
          };
        });
      }

      // Sort by similarity
      filteredProjects.sort((a, b) => b.similarity - a.similarity);

      return { projects: filteredProjects };
    } catch (error) {
      console.error("Error finding similar projects:", error);
      return { projects: [] };
    }
  }
}

export const aiService = AIService;
export default AIService;
