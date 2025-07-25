// Cross-step data population service for auto-populating subsequent steps
// Based on AI-extracted data from Initial Contact step

import {
  GuidedFlowData,
  AIExtractedData,
  ServiceType,
} from "@/lib/types/estimate-types";
import { AIService } from "./ai-service";
import {
  isNotNull,
  safeString,
  safeNumber,
  withDefaultArray,
} from "@/lib/utils/null-safety";

export interface CrossStepPopulationOptions {
  enableServiceSuggestions?: boolean;
  enableScopeGeneration?: boolean;
  enableAddressValidation?: boolean;
  enableTimelineEstimation?: boolean;
}

export interface PopulationResult {
  success: boolean;
  populatedSteps: string[];
  confidence: number;
  warnings: string[];
  suggestions: string[];
}

export class CrossStepPopulationService {
  /**
   * Auto-populate subsequent steps based on extracted data from Initial Contact
   */
  static async populateFromExtractedData(
    flowData: GuidedFlowData,
    options: CrossStepPopulationOptions = {},
  ): Promise<{ updatedFlowData: GuidedFlowData; result: PopulationResult }> {
    const aiExtractedData = flowData.initialContact?.aiExtractedData;

    if (!aiExtractedData) {
      return {
        updatedFlowData: flowData,
        result: {
          success: false,
          populatedSteps: [],
          confidence: 0,
          warnings: ["No extracted data available for auto-population"],
          suggestions: [
            "Complete Initial Contact step with AI extraction first",
          ],
        },
      };
    }

    const updatedFlowData = { ...flowData };
    const populatedSteps: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let totalConfidence = 0;
    let confidenceFactors = 0;

    // 1. Populate Scope Details from extracted services
    if (options.enableServiceSuggestions !== false) {
      const scopeResult = await this.populateScopeDetails(
        updatedFlowData,
        aiExtractedData,
      );
      if (scopeResult.populated) {
        updatedFlowData.scopeDetails = {
          ...updatedFlowData.scopeDetails,
          ...scopeResult.data,
        };
        populatedSteps.push("Scope Details");
        totalConfidence += scopeResult.confidence;
        confidenceFactors++;

        if (scopeResult.warnings) warnings.push(...scopeResult.warnings);
        if (scopeResult.suggestions)
          suggestions.push(...scopeResult.suggestions);
      }
    }

    // 2. Populate Area of Work from building analysis
    const areaResult = this.populateAreaOfWork(
      updatedFlowData,
      aiExtractedData,
    );
    if (areaResult.populated) {
      updatedFlowData.areaOfWork = {
        ...updatedFlowData.areaOfWork,
        ...areaResult.data,
      };
      populatedSteps.push("Area of Work");
      totalConfidence += areaResult.confidence;
      confidenceFactors++;

      if (areaResult.warnings) warnings.push(...areaResult.warnings);
      if (areaResult.suggestions) suggestions.push(...areaResult.suggestions);
    }

    // 3. Populate Duration estimates based on building complexity
    if (options.enableTimelineEstimation !== false) {
      const durationResult = this.populateDuration(
        updatedFlowData,
        aiExtractedData,
      );
      if (durationResult.populated) {
        updatedFlowData.duration = {
          ...updatedFlowData.duration,
          ...durationResult.data,
        };
        populatedSteps.push("Duration");
        totalConfidence += durationResult.confidence;
        confidenceFactors++;

        if (durationResult.warnings) warnings.push(...durationResult.warnings);
        if (durationResult.suggestions)
          suggestions.push(...durationResult.suggestions);
      }
    }

    const result: PopulationResult = {
      success: populatedSteps.length > 0,
      populatedSteps,
      confidence:
        confidenceFactors > 0 ? totalConfidence / confidenceFactors : 0,
      warnings,
      suggestions,
    };

    return { updatedFlowData, result };
  }

  /**
   * Suggest services based on building type and extracted requirements
   */
  static async suggestServicesFromBuilding(
    buildingType: string,
    buildingSize?: string,
    floors?: number,
    extractedServices?: string[],
  ): Promise<ServiceType[]> {
    const suggestions: ServiceType[] = [];

    // Base service mapping by building type
    const buildingServiceMap: Record<string, ServiceType[]> = {
      office: ["WC", "PW", "HD"],
      retail: ["WC", "PW", "GR"],
      restaurant: ["WC", "PW", "HD", "FC"],
      hospital: ["WC", "HD", "FC", "SW"],
      school: ["WC", "PW", "FC"],
      industrial: ["PW", "SW", "BF"],
      residential: ["WC", "PW"],
    };

    // Add base services for building type
    const baseServices = buildingServiceMap[buildingType.toLowerCase()] || [
      "WC",
      "PW",
    ];
    suggestions.push(...baseServices);

    // Add services based on building size
    if (buildingSize) {
      const sizeValue = this.extractNumericValue(buildingSize);
      if (sizeValue > 50000) {
        // Large buildings need more comprehensive cleaning
        if (!suggestions.includes("HD")) suggestions.push("HD");
        if (!suggestions.includes("FC")) suggestions.push("FC");
      }
    }

    // Add services based on floor count
    if (floors && floors > 3) {
      // High-rise buildings need specialized services
      if (!suggestions.includes("HD")) suggestions.push("HD");
      if (floors > 10 && !suggestions.includes("PWS")) suggestions.push("PWS");
    }

    // Match extracted service keywords to our service types
    if (extractedServices && extractedServices.length > 0) {
      const serviceKeywords = {
        WC: ["window", "glass", "cleaning"],
        PW: ["pressure", "washing", "power wash"],
        SW: ["soft", "gentle", "chemical"],
        HD: ["dust", "dusting", "high"],
        GR: ["glass", "restoration", "restore"],
        FR: ["frame", "restoration", "repair"],
        BR: ["biofilm", "biological", "mold"],
        GC: ["granite", "stone", "reconditioning"],
        PWS: ["seal", "sealing", "protective"],
        FC: ["final", "post", "cleanup"],
        PD: ["parking", "deck", "garage"],
      };

      extractedServices.forEach((service) => {
        const lowerService = service.toLowerCase();
        Object.entries(serviceKeywords).forEach(([serviceType, keywords]) => {
          if (keywords.some((keyword) => lowerService.includes(keyword))) {
            const serviceTypeKey = serviceType as ServiceType;
            if (!suggestions.includes(serviceTypeKey)) {
              suggestions.push(serviceTypeKey);
            }
          }
        });
      });
    }

    // Remove duplicates and validate services
    return [...new Set(suggestions)];
  }

  /**
   * Generate intelligent scope details based on extracted data
   */
  private static async populateScopeDetails(
    flowData: GuidedFlowData,
    aiExtractedData: AIExtractedData,
  ) {
    const confidence = aiExtractedData.confidence || 0;
    const populated =
      aiExtractedData.requirements.services.length > 0 ||
      aiExtractedData.requirements.buildingType;

    if (!populated) {
      return { populated: false, confidence: 0 };
    }

    const suggestions: string[] = [];
    const warnings: string[] = [];

    // Map extracted services to our service types
    const mappedServices = this.mapExtractedServices(
      aiExtractedData.requirements.services,
    );

    // Add building-type specific services
    const buildingServices = await this.suggestServicesFromBuilding(
      aiExtractedData.requirements.buildingType,
      aiExtractedData.requirements.buildingSize,
      aiExtractedData.requirements.floors,
      aiExtractedData.requirements.services,
    );

    const combinedServices = [
      ...new Set([...mappedServices, ...buildingServices]),
    ];

    // Generate scope notes based on extracted data
    let scopeNotes = `Auto-generated from initial contact:\n`;

    if (aiExtractedData.requirements.buildingType) {
      scopeNotes += `- Building Type: ${aiExtractedData.requirements.buildingType}\n`;
    }

    if (aiExtractedData.requirements.buildingSize) {
      scopeNotes += `- Building Size: ${aiExtractedData.requirements.buildingSize}\n`;
    }

    if (aiExtractedData.requirements.floors) {
      scopeNotes += `- Floors: ${aiExtractedData.requirements.floors}\n`;
    }

    if (aiExtractedData.requirements.timeline) {
      scopeNotes += `- Timeline: ${aiExtractedData.requirements.timeline}\n`;
    }

    if (aiExtractedData.requirements.budget) {
      scopeNotes += `- Budget: ${aiExtractedData.requirements.budget}\n`;
    }

    // Add confidence warnings
    if (confidence < 0.7) {
      warnings.push(
        "AI extraction confidence is low - please verify auto-populated services",
      );
    }

    if (combinedServices.length > 5) {
      suggestions.push(
        "Multiple services detected - consider creating a service bundle for better pricing",
      );
    }

    return {
      populated: true,
      confidence,
      warnings,
      suggestions,
      data: {
        selectedServices: combinedServices,
        scopeNotes:
          (flowData.scopeDetails?.scopeNotes || "") + "\n\n" + scopeNotes,
        autoPopulated: true,
        autoPopulationSource: "initial-contact-extraction",
        autoPopulationDate: new Date().toISOString(),
      },
    };
  }

  /**
   * Populate area of work based on building analysis
   */
  private static populateAreaOfWork(
    flowData: GuidedFlowData,
    aiExtractedData: AIExtractedData,
  ) {
    const buildingType = aiExtractedData.requirements.buildingType;
    const buildingSize = aiExtractedData.requirements.buildingSize;
    const floors = aiExtractedData.requirements.floors;

    if (!buildingType && !buildingSize) {
      return { populated: false, confidence: 0 };
    }

    const suggestions: string[] = [];
    const warnings: string[] = [];

    // Estimate square footage if not provided
    let estimatedSqft = 0;
    if (buildingSize) {
      estimatedSqft = this.extractNumericValue(buildingSize);
    } else if (floors) {
      // Rough estimate: 10,000 sq ft per floor for commercial buildings
      estimatedSqft = floors * 10000;
      suggestions.push(
        "Square footage estimated based on floor count - please verify measurements",
      );
    }

    // Generate work areas based on building type
    const workAreas = this.generateWorkAreas(buildingType, floors);

    return {
      populated: true,
      confidence: buildingSize ? 0.8 : 0.6,
      warnings,
      suggestions,
      data: {
        totalSquareFeet: estimatedSqft,
        workAreas: workAreas,
        autoPopulated: true,
        autoPopulationSource: "initial-contact-extraction",
        notes: `Auto-generated work areas based on ${buildingType} building type`,
      },
    };
  }

  /**
   * Populate duration estimates based on building complexity
   */
  private static populateDuration(
    flowData: GuidedFlowData,
    aiExtractedData: AIExtractedData,
  ) {
    const buildingSize = aiExtractedData.requirements.buildingSize;
    const floors = aiExtractedData.requirements.floors;
    const services = aiExtractedData.requirements.services;
    const timeline = aiExtractedData.requirements.timeline;

    if (!buildingSize && !floors && services.length === 0) {
      return { populated: false, confidence: 0 };
    }

    const suggestions: string[] = [];
    const warnings: string[] = [];

    // Calculate estimated duration based on building complexity
    let estimatedDays = 1; // Base duration

    // Add time based on building size
    if (buildingSize) {
      const sqft = this.extractNumericValue(buildingSize);
      if (sqft > 100000) estimatedDays += 3;
      else if (sqft > 50000) estimatedDays += 2;
      else if (sqft > 20000) estimatedDays += 1;
    }

    // Add time based on floor count
    if (floors && floors > 5) {
      estimatedDays += Math.ceil(floors / 5);
    }

    // Add time based on service complexity
    const complexServices = ["GR", "FR", "BF", "GC"];
    const hasComplexServices = services.some((service) =>
      complexServices.some((complex) =>
        service.toLowerCase().includes(complex.toLowerCase()),
      ),
    );

    if (hasComplexServices) {
      estimatedDays += 1;
      suggestions.push(
        "Complex restoration services detected - additional time allocated",
      );
    }

    // Check against requested timeline
    if (timeline) {
      const urgentKeywords = ["urgent", "asap", "rush", "emergency"];
      const isUrgent = urgentKeywords.some((keyword) =>
        timeline.toLowerCase().includes(keyword),
      );

      if (isUrgent) {
        warnings.push(
          "Urgent timeline requested - may require additional crews or overtime",
        );
      }
    }

    return {
      populated: true,
      confidence: 0.7,
      warnings,
      suggestions,
      data: {
        estimatedDuration: {
          days: estimatedDays,
          hours: estimatedDays * 8, // 8 hours per day
        },
        autoPopulated: true,
        autoPopulationSource: "initial-contact-extraction",
        notes: `Duration estimated based on building complexity and service requirements`,
      },
    };
  }

  /**
   * Map extracted service names to our service types
   */
  private static mapExtractedServices(
    extractedServices: string[],
  ): ServiceType[] {
    const serviceMap: Record<string, ServiceType> = {
      "window cleaning": "WC",
      "pressure washing": "PW",
      "soft washing": "SW",
      "high dusting": "HD",
      "glass restoration": "GR",
      "frame restoration": "FR",
      "biofilm removal": "BF",
      "granite reconditioning": "GC",
      "pressure wash seal": "PWS",
      "final clean": "FC",
      "parking deck": "PD",
    };

    const mappedServices: ServiceType[] = [];

    extractedServices.forEach((service) => {
      const lowerService = service.toLowerCase();

      // Direct mapping
      const directMatch = serviceMap[lowerService];
      if (directMatch) {
        mappedServices.push(directMatch);
        return;
      }

      // Fuzzy matching
      Object.entries(serviceMap).forEach(([key, value]) => {
        if (lowerService.includes(key) || key.includes(lowerService)) {
          if (!mappedServices.includes(value)) {
            mappedServices.push(value);
          }
        }
      });
    });

    return mappedServices;
  }

  /**
   * Generate work areas based on building type
   */
  private static generateWorkAreas(buildingType: string, floors?: number) {
    const commonAreas = [
      { name: "Exterior facade", description: "Main building exterior" },
      { name: "Windows", description: "All building windows" },
      { name: "Entrance areas", description: "Main and secondary entrances" },
    ];

    const buildingSpecificAreas: Record<string, any[]> = {
      office: [
        { name: "Lobby", description: "Main lobby area" },
        {
          name: "Conference rooms",
          description: "Meeting and conference spaces",
        },
      ],
      retail: [
        { name: "Storefront", description: "Customer-facing storefront" },
        { name: "Display windows", description: "Product display areas" },
      ],
      restaurant: [
        { name: "Dining area", description: "Customer dining space" },
        { name: "Kitchen areas", description: "Food preparation areas" },
      ],
      hospital: [
        { name: "Patient areas", description: "Patient care spaces" },
        { name: "Common areas", description: "Waiting rooms and corridors" },
      ],
      industrial: [
        { name: "Production areas", description: "Manufacturing spaces" },
        { name: "Loading docks", description: "Shipping and receiving areas" },
      ],
    };

    const areas = [
      ...commonAreas,
      ...(buildingSpecificAreas[buildingType.toLowerCase()] || []),
    ];

    // Add floor-specific areas for multi-story buildings
    if (floors && floors > 1) {
      areas.push({
        name: "Stairwells",
        description: `${floors}-story stairwell cleaning`,
      });

      if (floors > 3) {
        areas.push({
          name: "Elevator areas",
          description: "Elevator lobbies and interiors",
        });
      }
    }

    return areas;
  }

  /**
   * Extract numeric value from text (e.g., "50,000 sq ft" -> 50000)
   */
  private static extractNumericValue(text: string): number {
    const match = text.match(/[\d,]+/);
    if (match) {
      return parseInt(match[0].replace(/,/g, ""));
    }
    return 0;
  }

  /**
   * Check if auto-population should be triggered based on data changes
   */
  static shouldTriggerAutoPopulation(
    previousData: GuidedFlowData,
    newData: GuidedFlowData,
  ): boolean {
    const previousExtracted = previousData.initialContact?.aiExtractedData;
    const newExtracted = newData.initialContact?.aiExtractedData;

    // Trigger if we have new extracted data
    if (!previousExtracted && newExtracted) {
      return true;
    }

    // Trigger if extracted data has changed significantly
    if (previousExtracted && newExtracted) {
      const servicesChanged =
        JSON.stringify(previousExtracted.requirements.services) !==
        JSON.stringify(newExtracted.requirements.services);

      const buildingTypeChanged =
        previousExtracted.requirements.buildingType !==
        newExtracted.requirements.buildingType;

      return servicesChanged || buildingTypeChanged;
    }

    return false;
  }
}

export const crossStepPopulationService = CrossStepPopulationService;
export default CrossStepPopulationService;
