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

export interface AIValidationResult {
  isValid: boolean;
  confidence: number;
  warnings: string[];
  suggestions: string[];
}

export class AIService {
  private static readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private static readonly API_BASE_URL = "https://api.openai.com/v1";

  // Photo analysis methods
  static async analyzeBuilding(
    params: PhotoAnalysisParams,
  ): Promise<AIAnalysisResult | null> {
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
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: this.getBuildingAnalysisPrompt(params),
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
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseBuildingAnalysis(data.choices[0].message.content);
    });

    return result.success ? result.data || null : null;
  }

  static async extractContactInfo(
    params: ContactExtractionParams,
  ): Promise<AIExtractedData | null> {
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
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: this.getContactExtractionPrompt(params.contentType),
            },
            {
              role: "user",
              content: params.content,
            },
          ],
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseContactExtraction(data.choices[0].message.content);
    });

    return result.success ? result.data || null : null;
  }

  static async recommendServices(
    params: ServiceRecommendationParams,
  ): Promise<ServiceType[]> {
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
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: this.getServiceRecommendationPrompt(),
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
          max_tokens: 600,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseServiceRecommendations(data.choices[0].message.content);
    });

    return result.success ? result.data || [] : [];
  }

  static async analyzeFacadeComprehensive(
    imageUrl: string,
    buildingType: string = "commercial",
  ): Promise<any> {
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
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: this.getFacadeAnalysisPrompt(buildingType),
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
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseFacadeAnalysis(data.choices[0].message.content);
    });

    return result.success ? result.data || null : null;
  }

  static async validateScope(content: string): Promise<AIValidationResult> {
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
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: this.getScopeValidationPrompt(),
            },
            {
              role: "user",
              content: content,
            },
          ],
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseScopeValidation(data.choices[0].message.content);
    });

    return result.success
      ? result.data || {
          isValid: false,
          confidence: 0,
          warnings: ["AI validation failed"],
          suggestions: [],
        }
      : {
          isValid: false,
          confidence: 0,
          warnings: ["AI validation failed"],
          suggestions: [],
        };
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
  private static getBuildingAnalysisPrompt(
    params: PhotoAnalysisParams,
  ): string {
    const context = params.buildingContext || {};

    return `Analyze this building image and provide a JSON response with the following structure:
{
  "buildingFeatures": ["list of visible building features"],
  "serviceRequirements": ["list of recommended cleaning services"],
  "riskFactors": [{"factor": "description", "severity": "low|medium|high"}],
  "measurements": {"approximate_height": "value", "window_count": "value", "surface_area": "value"},
  "confidence": 0.85,
  "analysisType": "${params.analysisType}"
}

Building context: ${JSON.stringify(context)}

Focus on identifying cleaning and maintenance needs, potential hazards, and measurable dimensions.`;
  }

  private static getContactExtractionPrompt(contentType: string): string {
    return `Extract contact information and project details from this ${contentType} and return as JSON:
{
  "customerName": "extracted name",
  "customerEmail": "extracted email",
  "customerPhone": "extracted phone",
  "companyName": "extracted company",
  "buildingName": "extracted building name",
  "buildingAddress": "extracted address",
  "serviceRequests": ["list of requested services"],
  "timeline": "extracted timeline",
  "budget": "extracted budget info",
  "notes": "additional context",
  "confidence": 0.90
}

Return null for any field that cannot be reliably extracted.`;
  }

  private static getServiceRecommendationPrompt(): string {
    return `Based on the building analysis and user preferences, recommend appropriate cleaning services.
Available services: window-cleaning, pressure-washing, soft-washing, biofilm-removal, glass-restoration, frame-restoration, high-dusting, final-clean, granite-reconditioning, pressure-wash-seal, parking-deck.

Return a JSON array of recommended service types: ["service1", "service2", ...]

Consider:
- Building condition and material
- Risk factors and complexity
- Service dependencies
- Budget constraints
- User preferences`;
  }

  private static getScopeValidationPrompt(): string {
    return `Validate this project scope and provide feedback as JSON:
{
  "isValid": true,
  "confidence": 0.85,
  "warnings": ["list of potential issues"],
  "suggestions": ["list of improvements"]
}

Check for:
- Completeness of scope
- Realistic timeline
- Service compatibility
- Safety considerations
- Cost reasonableness`;
  }

  private static getFacadeAnalysisPrompt(buildingType: string): string {
    const buildingTypeModifier =
      buildingType === "commercial"
        ? "This appears to be a commercial building. Consider larger window sizes (typically 3-5ft wide), higher floor-to-floor heights (12-14ft), professional appearance requirements, and business hour access restrictions."
        : buildingType === "residential"
          ? "This appears to be a residential building. Consider smaller window sizes (typically 2-3ft wide), standard floor heights (8-10ft), privacy concerns during cleaning, and residential safety considerations."
          : "This appears to be an industrial building. Consider large window sizes, high ceilings, industrial safety requirements, and specialized cleaning needs.";

    return `Perform a complete building facade analysis covering all aspects. ${buildingTypeModifier}

WINDOWS:
- Count all visible windows including partially obscured ones
- Identify grid pattern and window types
- Estimate total glass area for cleaning calculations

MATERIALS:
- Identify and quantify all facade materials by percentage
- Assess material condition and weathering
- Rate cleaning difficulty based on material type and condition

DAMAGE & STAINING:
- Document all visible staining, oxidation, and physical damage
- Rate severity and repair urgency
- Note areas requiring special attention

SAFETY CONSIDERATIONS:
- Identify all potential hazards for cleaning crews
- Assess access challenges and required safety equipment
- Rate overall safety risk level

MEASUREMENTS:
- Estimate building dimensions using available reference points
- Calculate total facade square footage
- Provide confidence rating based on visual cues available

Return comprehensive JSON with this exact structure:
{
  "windows": {
    "count": number,
    "totalArea": number,
    "gridPattern": "string",
    "confidence": number,
    "cleaningDifficulty": "low|medium|high"
  },
  "materials": {
    "breakdown": {"material": percentage},
    "conditions": ["list of conditions"],
    "cleaningDifficulty": number,
    "dominant": "string",
    "weathering": "none|light|moderate|heavy"
  },
  "damage": {
    "staining": ["list of staining types"],
    "oxidation": ["list of oxidation issues"],
    "damage": ["list of physical damage"],
    "severity": "low|medium|high",
    "affectedArea": number,
    "repairUrgency": "none|minor|moderate|urgent"
  },
  "safety": {
    "hazards": ["list of hazards"],
    "requirements": ["list of safety requirements"],
    "riskLevel": "low|medium|high",
    "accessChallenges": ["list of access issues"],
    "equipmentNeeded": ["list of required equipment"]
  },
  "measurements": {
    "buildingHeight": number,
    "facadeWidth": number,
    "confidence": number,
    "estimatedSqft": number,
    "stories": number
  },
  "recommendations": {
    "services": ["list of recommended services"],
    "timeline": "string",
    "priority": "low|medium|high",
    "estimatedCost": {"min": number, "max": number}
  }
}`;
  }

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
}

export const aiService = AIService;
export default AIService;
