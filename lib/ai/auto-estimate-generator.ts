import OpenAI from "openai";
import { ExtractedData } from "./extraction";
import {
  FinalEstimate,
  ServiceEstimate,
  ProjectTimeline,
  ContractTerms,
  AIExtractedData,
} from "../types/estimate-types";
import {
  safeAIOperation,
  mapOpenAIError,
  checkContentSafety,
  ValidationError,
  AuthenticationError,
} from "./ai-error-handler";
import { getAIConfig } from "./ai-config";
import {
  validateInput,
  autoEstimateRequestSchema,
} from "./ai-validation-schemas";

// Service baselines for pricing calculations
const SERVICE_BASELINES = {
  WC: { baseRate: 3, setupTime: 30, laborRate: 50 },
  PW: { baseRate: 0.25, setupTime: 60, laborRate: 50 },
  SW: { baseRate: 0.45, setupTime: 45, laborRate: 50 },
  BF: { baseRate: 0.75, setupTime: 60, laborRate: 60 },
  GR: { baseRate: 15, setupTime: 90, laborRate: 70 },
  FR: { baseRate: 25, setupTime: 45, laborRate: 60 },
  HD: { baseRate: 0.5, setupTime: 30, laborRate: 50 },
  FC: { baseRate: 70, setupTime: 15, laborRate: 70 },
  GRC: { baseRate: 1.75, setupTime: 120, laborRate: 75 },
  PWS: { baseRate: 1.3, setupTime: 75, laborRate: 55 },
  PD: { baseRate: 20, setupTime: 30, laborRate: 50 },
};

// Lazy OpenAI client initialization
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const config = getAIConfig();
    if (!config.isAIAvailable()) {
      throw new AuthenticationError(
        "AI features are not available - missing API configuration",
      );
    }
    openai = new OpenAI({
      apiKey: config.getAIConfig().openaiApiKey,
    });
  }
  return openai;
}

// Auto-estimate generation interface
export interface AutoEstimateRequest {
  extractedData: AIExtractedData;
  buildingPhotos?: string[]; // URLs to building photos for analysis
  competitorEstimates?: string[]; // Competitor pricing data
  customPricing?: Partial<typeof SERVICE_BASELINES>;
  overrides?: {
    markup?: number; // percentage
    urgencyMultiplier?: number;
    riskMultiplier?: number;
  };
}

export interface AutoEstimateResult {
  estimate: FinalEstimate;
  aiAnalysis: {
    confidence: number;
    recommendations: string[];
    warnings: string[];
    pricingStrategy: string;
    competitivePosition?: string;
    expectedWinRate: number;
  };
  breakdown: {
    baseCalculation: ServiceEstimate[];
    adjustments: Array<{
      type: string;
      description: string;
      multiplier: number;
    }>;
    finalCalculation: ServiceEstimate[];
  };
}

// Main auto-estimate generation function
export async function generateAutoEstimate(
  request: AutoEstimateRequest,
  userId?: string,
): Promise<AutoEstimateResult> {
  // Validate input
  const validatedRequest = validateInput(autoEstimateRequestSchema, {
    ...request,
    userId,
  });

  return safeAIOperation(
    async () => {
      const {
        extractedData,
        buildingPhotos,
        competitorEstimates,
        customPricing,
        overrides,
      } = validatedRequest;

      // Step 1: Analyze building requirements and generate base estimates
      const baseEstimates = await generateBaseEstimates(
        extractedData,
        customPricing,
      );

      // Step 2: Analyze building photos for additional insights
      let photoAnalysis = null;
      if (buildingPhotos && buildingPhotos.length > 0) {
        photoAnalysis = await analyzePhotosForEstimating(
          buildingPhotos,
          extractedData.requirements.services,
        );
      }

      // Step 3: Competitive analysis if provided
      let competitiveAnalysis = null;
      if (competitorEstimates && competitorEstimates.length > 0) {
        competitiveAnalysis = await analyzeCompetitorPricing(
          competitorEstimates,
          extractedData,
        );
      }

      // Step 4: Apply AI-driven adjustments
      const adjustedEstimates = await applyIntelligentAdjustments(
        baseEstimates,
        extractedData,
        photoAnalysis,
        competitiveAnalysis,
        overrides,
      );

      // Step 5: Generate timeline and terms
      const timeline = await generateProjectTimeline(
        adjustedEstimates.services,
        extractedData,
      );
      const terms = generateContractTerms(
        extractedData,
        adjustedEstimates.total,
      );

      // Step 6: Create final estimate
      const estimate: FinalEstimate = {
        id: `auto-estimate-${Date.now()}`,
        summary: {
          totalPrice: adjustedEstimates.total,
          totalTime: adjustedEstimates.totalHours,
          totalArea: calculateTotalArea(extractedData),
          serviceCount: extractedData.requirements.services.length,
          complexityScore: adjustedEstimates.complexityScore,
        },
        services: adjustedEstimates.services,
        timeline,
        terms,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        approval: {
          status: "pending",
        },
      };

      // Step 7: Generate AI analysis and recommendations
      const aiAnalysis = await generateEstimateAnalysis(
        estimate,
        extractedData,
        competitiveAnalysis,
      );

      return {
        estimate,
        aiAnalysis,
        breakdown: {
          baseCalculation: baseEstimates.services,
          adjustments: adjustedEstimates.adjustments,
          finalCalculation: adjustedEstimates.services,
        },
      };
    },
    {
      operationName: "generateAutoEstimate",
      userId: validatedRequest.userId,
      rateLimitKey: validatedRequest.userId || "anonymous",
      validateOutput: (result) => {
        if (!result.estimate || !result.aiAnalysis || !result.breakdown) {
          throw new ValidationError(
            "Invalid auto-estimate result structure",
            [],
          );
        }
        if (result.estimate.summary.totalPrice <= 0) {
          throw new ValidationError(
            "Estimate total price must be positive",
            [],
          );
        }
        return result;
      },
    },
  );
}

// Generate base estimates from extracted data
async function generateBaseEstimates(
  extractedData: ExtractedData,
  customPricing?: any,
) {
  const configPricing = getAIConfig().getServicePricing() as any;
  const pricing = { ...configPricing, ...customPricing };
  const buildingSize = extractBuildingSize(
    extractedData.requirements.buildingSize || "",
  );
  const floors = extractedData.requirements.floors || 1;
  const buildingMultiplier = getAIConfig().getBuildingMultiplier(
    extractedData.requirements.buildingType,
  );

  const services: ServiceEstimate[] = [];
  let totalHours = 0;

  for (const serviceCode of extractedData.requirements.services) {
    const serviceData = pricing[serviceCode];
    if (serviceData) {
      const area = buildingSize * floors;

      // Apply complexity factors
      const heightMultiplier = Math.pow(
        serviceData.complexityFactors?.height || 1.1,
        Math.max(0, floors - 3),
      );
      const basePrice = area * serviceData.baseRate * heightMultiplier;

      const laborHours = serviceData.setupTime + area / 100; // 100 sq ft per hour baseline
      const laborCost = laborHours * serviceData.laborRate;
      const equipmentCost =
        Math.ceil(laborHours / 8) * serviceData.equipmentDaily;
      const materialCost = basePrice * (serviceData.materialMultiplier || 1.0);

      const totalPrice =
        (basePrice + laborCost + equipmentCost + materialCost) *
        buildingMultiplier;
      totalHours += laborHours;

      services.push({
        serviceType: serviceCode,
        description: getServiceDescription(serviceCode),
        quantity: area,
        unit: "sq ft",
        unitPrice: totalPrice / area,
        totalPrice,
        duration: laborHours,
        dependencies: getServiceDependencies(serviceCode),
        notes: `Base calculation for ${getServiceDescription(serviceCode)} (Height factor: ${heightMultiplier.toFixed(2)}, Building factor: ${buildingMultiplier.toFixed(2)})`,
      });
    }
  }

  return {
    services,
    total: services.reduce((sum, service) => sum + service.totalPrice, 0),
    totalHours,
    complexityScore: calculateComplexityScore(extractedData),
  };
}

// Analyze photos for estimating insights
async function analyzePhotosForEstimating(
  photoUrls: string[],
  services: string[],
) {
  const prompt = `Analyze these building photos to provide insights for accurate service estimating:

SERVICES TO ESTIMATE: ${services.join(", ")}

For each photo, assess:
1. Building complexity and access challenges
2. Surface conditions requiring additional work
3. Safety considerations affecting pricing
4. Equipment requirements and setup complexity
5. Potential areas of increased labor time
6. Quality standards that may affect pricing

Return JSON with:
{
  "complexity_multiplier": number (0.8 to 2.0),
  "access_challenges": ["list of access issues"],
  "surface_conditions": ["condition observations"],
  "safety_requirements": ["safety considerations"],
  "equipment_needs": ["special equipment required"],
  "time_adjustments": {"service_code": hours_adjustment},
  "price_adjustments": {"service_code": multiplier},
  "recommendations": ["pricing strategy recommendations"]
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a building services estimator expert. Analyze photos to provide accurate pricing insights.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...photoUrls.map((url) => ({
              type: "image_url" as const,
              image_url: { url, detail: "high" as const },
            })),
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 2000,
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error analyzing photos for estimating:", error);
    return null;
  }
}

// Analyze competitor pricing
async function analyzeCompetitorPricing(
  competitorEstimates: string[],
  extractedData: ExtractedData,
) {
  const prompt = `Analyze these competitor estimates to inform our pricing strategy:

OUR PROJECT: ${JSON.stringify(extractedData, null, 2)}

COMPETITOR ESTIMATES:
${competitorEstimates.join("\n\n---\n\n")}

Provide competitive analysis with JSON:
{
  "market_rates": {"service_code": "price_range"},
  "competitor_strategies": ["observed pricing strategies"],
  "our_position": "below|competitive|above",
  "win_probability": number (0-1),
  "recommended_adjustments": {"service_code": multiplier},
  "competitive_advantages": ["our advantages to emphasize"],
  "pricing_recommendations": ["strategic pricing advice"]
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a competitive pricing analyst for building services. Provide strategic pricing insights.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 2000,
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error analyzing competitor pricing:", error);
    return null;
  }
}

// Apply intelligent adjustments to base estimates
async function applyIntelligentAdjustments(
  baseEstimates: any,
  extractedData: ExtractedData,
  photoAnalysis: any,
  competitiveAnalysis: any,
  overrides?: any,
) {
  const adjustments: Array<{
    type: string;
    description: string;
    multiplier: number;
  }> = [];
  const services = [...baseEstimates.services];

  // Apply urgency adjustments
  if (extractedData.urgencyScore >= 8) {
    adjustments.push({
      type: "urgency",
      description: "Rush job premium",
      multiplier: 1.25,
    });
  } else if (extractedData.urgencyScore <= 3) {
    adjustments.push({
      type: "flexible_timeline",
      description: "Flexible timeline discount",
      multiplier: 0.95,
    });
  }

  // Apply photo analysis adjustments
  if (photoAnalysis?.complexity_multiplier) {
    adjustments.push({
      type: "complexity",
      description: "Building complexity adjustment",
      multiplier: photoAnalysis.complexity_multiplier,
    });
  }

  // Apply competitive adjustments
  if (competitiveAnalysis?.recommended_adjustments) {
    Object.entries(competitiveAnalysis.recommended_adjustments).forEach(
      ([serviceCode, multiplier]) => {
        adjustments.push({
          type: "competitive",
          description: `Market competitive adjustment for ${serviceCode}`,
          multiplier: multiplier as number,
        });
      },
    );
  }

  // Apply overrides
  if (overrides?.urgencyMultiplier) {
    adjustments.push({
      type: "override",
      description: "Manual urgency override",
      multiplier: overrides.urgencyMultiplier,
    });
  }

  if (overrides?.riskMultiplier) {
    adjustments.push({
      type: "risk",
      description: "Risk assessment adjustment",
      multiplier: overrides.riskMultiplier,
    });
  }

  // Apply all adjustments to services
  const totalMultiplier = adjustments.reduce(
    (acc, adj) => acc * adj.multiplier,
    1.0,
  );

  services.forEach((service) => {
    service.totalPrice *= totalMultiplier;
    service.unitPrice *= totalMultiplier;
  });

  return {
    services,
    total: services.reduce(
      (sum: number, service: any) => sum + service.totalPrice,
      0,
    ),
    totalHours: baseEstimates.totalHours,
    complexityScore: baseEstimates.complexityScore,
    adjustments,
  };
}

// Generate project timeline
async function generateProjectTimeline(
  services: ServiceEstimate[],
  extractedData: ExtractedData,
): Promise<ProjectTimeline> {
  const startDate = new Date();
  if (extractedData.timeline.requestedDate) {
    const requestedDate = new Date(extractedData.timeline.requestedDate);
    if (requestedDate > startDate) {
      startDate.setTime(requestedDate.getTime());
    }
  }

  const totalDuration = services.reduce(
    (sum, service) => sum + service.duration,
    0,
  );
  const workDaysNeeded = Math.ceil(totalDuration / 8); // 8-hour work days

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + workDaysNeeded);

  return {
    startDate,
    endDate,
    totalDuration: workDaysNeeded,
    phases: [
      {
        id: "execution",
        name: "Service Execution",
        startDate,
        endDate,
        duration: workDaysNeeded,
        services: services.map((s) => s.serviceType),
        dependencies: [],
        resources: [],
      },
    ],
    milestones: [
      {
        id: "completion",
        name: "Project Completion",
        date: endDate,
        description: "All services completed",
        deliverables: ["Quality inspection", "Final cleanup"],
        dependencies: [],
      },
    ],
    criticalPath: services.map((s) => s.serviceType),
  };
}

// Generate contract terms
function generateContractTerms(
  extractedData: ExtractedData,
  totalPrice: number,
): ContractTerms {
  return {
    paymentSchedule: [
      {
        description: "Deposit upon contract signing",
        percentage: 25,
        amount: totalPrice * 0.25,
        dueDate: new Date(),
        conditions: ["Signed contract required"],
      },
      {
        description: "Progress payment at 50% completion",
        percentage: 50,
        amount: totalPrice * 0.5,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        conditions: ["Work progress verification"],
      },
      {
        description: "Final payment upon completion",
        percentage: 25,
        amount: totalPrice * 0.25,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        conditions: ["Quality inspection passed"],
      },
    ],
    warranties: [
      {
        type: "workmanship",
        duration: 90,
        unit: "days",
        coverage: "All work performed according to industry standards",
        limitations: ["Normal wear and tear excluded"],
      },
    ],
    limitations: [
      "Weather delays may affect schedule",
      "Client must provide site access",
      "Additional charges for scope changes",
    ],
    changeOrderPolicy:
      "All changes must be approved in writing with revised pricing",
    cancellationPolicy: "48-hour notice required, deposit non-refundable",
    insuranceRequirements: [
      "General liability insurance coverage",
      "Workers compensation coverage",
      "Bonding available upon request",
    ],
  };
}

// Generate estimate analysis
async function generateEstimateAnalysis(
  estimate: FinalEstimate,
  extractedData: ExtractedData,
  competitiveAnalysis: any,
) {
  const prompt = `Analyze this auto-generated estimate and provide business insights:

ESTIMATE: ${JSON.stringify(estimate, null, 2)}
CUSTOMER DATA: ${JSON.stringify(extractedData, null, 2)}
COMPETITIVE DATA: ${competitiveAnalysis ? JSON.stringify(competitiveAnalysis, null, 2) : "None"}

Provide analysis with JSON:
{
  "confidence": number (0-1),
  "recommendations": ["strategic recommendations"],
  "warnings": ["potential issues to address"],
  "pricing_strategy": "description of pricing approach",
  "competitive_position": "our position vs competition",
  "expected_win_rate": number (0-1)
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a business development expert analyzing estimates for win probability and strategic positioning.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1500,
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error generating estimate analysis:", error);
    return {
      confidence: 0.7,
      recommendations: ["Review estimate manually for accuracy"],
      warnings: ["Auto-generated estimate requires validation"],
      pricing_strategy: "Standard pricing applied",
      competitive_position: "Unknown",
      expected_win_rate: 0.5,
    };
  }
}

// Helper functions
function extractBuildingSize(sizeString: string): number {
  const match = sizeString.match(/(\d+(?:,\d+)*)/);
  if (match) {
    return parseInt(match[1].replace(/,/g, ""));
  }
  return 10000; // Default size
}

function calculateTotalArea(extractedData: ExtractedData): number {
  const buildingSize = extractBuildingSize(
    extractedData.requirements.buildingSize || "",
  );
  return buildingSize * (extractedData.requirements.floors || 1);
}

function calculateComplexityScore(extractedData: ExtractedData): number {
  let score = 5; // Base complexity

  if (extractedData.requirements.floors > 3) score += 2;
  if (extractedData.requirements.specialRequirements.length > 0) score += 1;
  if (extractedData.urgencyScore > 7) score += 1;
  if (extractedData.requirements.services.length > 3) score += 1;

  return Math.min(10, score);
}

function getServiceDescription(serviceCode: string): string {
  const descriptions: Record<string, string> = {
    WC: "Window Cleaning",
    PW: "Pressure Washing",
    SW: "Soft Washing",
    GR: "Glass Restoration",
    FR: "Frame Restoration",
    HD: "High Dusting",
    FC: "Final Clean",
    GRC: "Granite Reconditioning",
    PWS: "Pressure Wash & Seal",
    PD: "Parking Deck Cleaning",
  };
  return descriptions[serviceCode] || serviceCode;
}

function getServiceDependencies(serviceCode: string): string[] {
  const dependencies: Record<string, string[]> = {
    WC: ["HD"], // Window cleaning after high dusting
    FC: ["WC", "PW", "SW"], // Final clean after other services
    PWS: ["PW"], // Sealing after pressure washing
    GR: ["WC"], // Glass restoration after cleaning
    FR: ["GR"], // Frame restoration after glass restoration
  };
  return dependencies[serviceCode] || [];
}
