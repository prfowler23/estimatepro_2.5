// Service suggestion generation logic extracted from IntelligentServiceSuggestions
import { ServiceSuggestion } from "@/lib/types/ai-types";
import { ServiceType, GuidedFlowData } from "@/lib/types/estimate-types";

// Helper function to generate intelligent service suggestions
export async function generateIntelligentSuggestions(
  flowData: GuidedFlowData,
  currentServices: ServiceType[],
): Promise<ServiceSuggestion[]> {
  const suggestions: ServiceSuggestion[] = [];
  const aiExtractedData = flowData.initialContact?.aiExtractedData;

  if (!aiExtractedData) return suggestions;

  const buildingType = aiExtractedData.requirements.buildingType?.toLowerCase();
  const buildingSize = aiExtractedData.requirements.buildingSize;
  const floors = aiExtractedData.requirements.floors;
  const timeline = aiExtractedData.requirements.timeline?.toLowerCase();

  // Building type specific suggestions
  if (buildingType) {
    const buildingTypeSuggestions = getBuildingTypeSuggestions(
      buildingType,
      currentServices,
    );
    suggestions.push(...buildingTypeSuggestions);
  }

  // Size-based suggestions
  if (buildingSize) {
    const sizeSuggestions = getSizeBasedSuggestions(
      buildingSize,
      currentServices,
    );
    suggestions.push(...sizeSuggestions);
  }

  // Floor-based suggestions
  if (floors && floors > 1) {
    const floorSuggestions = getFloorBasedSuggestions(floors, currentServices);
    suggestions.push(...floorSuggestions);
  }

  // Timeline-based suggestions
  if (timeline) {
    const timelineSuggestions = getTimelineBasedSuggestions(
      timeline,
      currentServices,
    );
    suggestions.push(...timelineSuggestions);
  }

  // Service dependency suggestions
  const dependencySuggestions = getDependencyBasedSuggestions(currentServices);
  suggestions.push(...dependencySuggestions);

  // Photo analysis suggestions (if photos are available)
  if (
    flowData.filesPhotos?.uploadedFiles?.length &&
    flowData.filesPhotos.uploadedFiles.length > 0
  ) {
    const photoSuggestions = await getPhotoBasedSuggestions(
      flowData.filesPhotos.uploadedFiles,
      currentServices,
    );
    suggestions.push(...photoSuggestions);
  }

  // Remove duplicates and sort by priority and confidence
  const uniqueSuggestions = suggestions
    .filter(
      (suggestion, index, self) =>
        self.findIndex((s) => s.serviceType === suggestion.serviceType) ===
        index,
    )
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });

  return uniqueSuggestions.slice(0, 5); // Limit to top 5 suggestions
}

function getBuildingTypeSuggestions(
  buildingType: string,
  currentServices: ServiceType[],
): ServiceSuggestion[] {
  const suggestions: ServiceSuggestion[] = [];

  const buildingTypeMap: Record<string, ServiceSuggestion[]> = {
    office: [
      {
        serviceType: "HD" as ServiceType,
        confidence: 0.9,
        reason:
          "Office buildings typically have extensive HVAC systems that accumulate dust",
        priority: "high",
        estimatedValue: 2500,
        compatibility: ["WC", "FC"],
      },
      {
        serviceType: "FC" as ServiceType,
        confidence: 0.8,
        reason:
          "Professional office environments benefit from detailed final cleaning",
        priority: "medium",
        estimatedValue: 1200,
        compatibility: ["HD", "WC"],
      },
    ],
    retail: [
      {
        serviceType: "GR" as ServiceType,
        confidence: 0.9,
        reason:
          "Retail storefronts rely heavily on pristine glass for customer attraction",
        priority: "high",
        estimatedValue: 3000,
        compatibility: ["WC", "FR"],
      },
      {
        serviceType: "FC" as ServiceType,
        confidence: 0.7,
        reason: "Customer-facing retail spaces need thorough final cleaning",
        priority: "medium",
        estimatedValue: 800,
        compatibility: ["WC", "GR"],
      },
    ],
    restaurant: [
      {
        serviceType: "BF" as ServiceType,
        confidence: 0.8,
        reason:
          "Food service environments are prone to biofilm and bacterial growth",
        priority: "high",
        estimatedValue: 2200,
        compatibility: ["SW", "FC"],
        risks: ["Health department compliance required"],
      },
      {
        serviceType: "HD" as ServiceType,
        confidence: 0.9,
        reason:
          "Restaurant kitchens generate significant grease and dust accumulation",
        priority: "high",
        estimatedValue: 1800,
        compatibility: ["BF", "FC"],
      },
    ],
    hospital: [
      {
        serviceType: "BF" as ServiceType,
        confidence: 0.95,
        reason:
          "Healthcare facilities require biofilm removal for infection control",
        priority: "high",
        estimatedValue: 4500,
        compatibility: ["HD", "FC"],
        risks: ["Special health compliance protocols required"],
      },
      {
        serviceType: "FC" as ServiceType,
        confidence: 0.9,
        reason:
          "Medical environments demand extensive final cleaning protocols",
        priority: "high",
        estimatedValue: 2000,
        compatibility: ["BF", "HD"],
      },
    ],
    industrial: [
      {
        serviceType: "PWS" as ServiceType,
        confidence: 0.8,
        reason:
          "Industrial surfaces benefit from protective sealing after pressure washing",
        priority: "medium",
        estimatedValue: 3500,
        compatibility: ["PW"],
      },
      {
        serviceType: "BF" as ServiceType,
        confidence: 0.7,
        reason: "Industrial environments often have biofilm in humid areas",
        priority: "medium",
        estimatedValue: 2800,
        compatibility: ["PW", "SW"],
      },
    ],
  };

  const typeSuggestions = buildingTypeMap[buildingType] || [];
  return typeSuggestions.filter(
    (suggestion) => !currentServices.includes(suggestion.serviceType),
  );
}

function getSizeBasedSuggestions(
  buildingSize: string,
  currentServices: ServiceType[],
): ServiceSuggestion[] {
  const suggestions: ServiceSuggestion[] = [];
  const sizeValue = parseInt(buildingSize.replace(/[^\d]/g, ""));

  if (sizeValue > 100000) {
    // Large buildings
    if (!currentServices.includes("HD")) {
      suggestions.push({
        serviceType: "HD" as ServiceType,
        confidence: 0.85,
        reason:
          "Large buildings require extensive high dusting for HVAC efficiency",
        priority: "high",
        estimatedValue: 4000,
        compatibility: ["WC", "FC"],
      });
    }

    if (!currentServices.includes("FC")) {
      suggestions.push({
        serviceType: "FC" as ServiceType,
        confidence: 0.8,
        reason: "Large facilities need comprehensive final cleaning",
        priority: "medium",
        estimatedValue: 3000,
        compatibility: ["HD", "WC"],
      });
    }
  } else if (sizeValue > 50000) {
    // Medium buildings
    if (!currentServices.includes("HD")) {
      suggestions.push({
        serviceType: "HD" as ServiceType,
        confidence: 0.7,
        reason: "Medium-sized buildings benefit from high dusting services",
        priority: "medium",
        estimatedValue: 2500,
        compatibility: ["WC"],
      });
    }
  }

  return suggestions;
}

function getFloorBasedSuggestions(
  floors: number,
  currentServices: ServiceType[],
): ServiceSuggestion[] {
  const suggestions: ServiceSuggestion[] = [];

  if (floors > 10) {
    // High-rise buildings
    if (!currentServices.includes("PWS")) {
      suggestions.push({
        serviceType: "PWS" as ServiceType,
        confidence: 0.8,
        reason:
          "High-rise buildings benefit from protective sealing due to weather exposure",
        priority: "medium",
        estimatedValue: 5000,
        compatibility: ["PW"],
      });
    }
  }

  if (floors > 3) {
    // Multi-story buildings
    if (!currentServices.includes("HD")) {
      suggestions.push({
        serviceType: "HD" as ServiceType,
        confidence: 0.75,
        reason:
          "Multi-story buildings have extensive ductwork requiring high dusting",
        priority: "medium",
        estimatedValue: 2000,
        compatibility: ["WC", "FC"],
      });
    }
  }

  return suggestions;
}

function getTimelineBasedSuggestions(
  timeline: string,
  currentServices: ServiceType[],
): ServiceSuggestion[] {
  const suggestions: ServiceSuggestion[] = [];

  if (timeline.includes("urgent") || timeline.includes("rush")) {
    // For urgent projects, suggest efficiency-focused services
    if (!currentServices.includes("FC")) {
      suggestions.push({
        serviceType: "FC" as ServiceType,
        confidence: 0.6,
        reason:
          "Urgent projects benefit from final cleaning to ensure complete results",
        priority: "low",
        estimatedValue: 1500,
        compatibility: ["WC", "PW"],
        risks: ["May require overtime rates for urgent completion"],
      });
    }
  }

  return suggestions;
}

function getDependencyBasedSuggestions(
  currentServices: ServiceType[],
): ServiceSuggestion[] {
  const suggestions: ServiceSuggestion[] = [];

  // Service synergy suggestions
  if (currentServices.includes("GR") && !currentServices.includes("FR")) {
    suggestions.push({
      serviceType: "FR" as ServiceType,
      confidence: 0.85,
      reason:
        "Frame restoration pairs perfectly with glass restoration for complete window renewal",
      priority: "high",
      estimatedValue: 2500,
      compatibility: ["GR"],
    });
  }

  if (currentServices.includes("PW") && !currentServices.includes("PWS")) {
    suggestions.push({
      serviceType: "PWS" as ServiceType,
      confidence: 0.7,
      reason: "Protective sealing extends the life of pressure washing results",
      priority: "medium",
      estimatedValue: 1800,
      compatibility: ["PW"],
    });
  }

  if (
    (currentServices.includes("HD") || currentServices.includes("PW")) &&
    !currentServices.includes("FC")
  ) {
    suggestions.push({
      serviceType: "FC" as ServiceType,
      confidence: 0.75,
      reason:
        "Final cleaning ensures all dust and debris from other services is removed",
      priority: "medium",
      estimatedValue: 1200,
      compatibility: ["HD", "PW", "WC"],
    });
  }

  return suggestions;
}

async function getPhotoBasedSuggestions(
  photos: any[],
  currentServices: ServiceType[],
): Promise<ServiceSuggestion[]> {
  // This would typically analyze uploaded photos using AI
  // For now, return basic suggestions based on photo presence
  const suggestions: ServiceSuggestion[] = [];

  if (photos.length > 0) {
    // Assume photos show building condition
    if (!currentServices.includes("GR")) {
      suggestions.push({
        serviceType: "GR" as ServiceType,
        confidence: 0.6,
        reason:
          "Photo analysis suggests glass surfaces may benefit from restoration",
        priority: "medium",
        estimatedValue: 2000,
        compatibility: ["WC", "FR"],
      });
    }
  }

  return suggestions;
}
