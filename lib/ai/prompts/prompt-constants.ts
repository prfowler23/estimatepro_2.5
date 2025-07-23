import {
  PhotoAnalysisParams,
  ContactExtractionParams,
} from "@/lib/services/ai-service";

export const getBuildingAnalysisPrompt = (
  params: PhotoAnalysisParams,
): string => {
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
};

export const getContactExtractionPrompt = (contentType: string): string => {
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
};

export const getServiceRecommendationPrompt = (): string => {
  return `Based on the building analysis and user preferences, recommend appropriate cleaning services.
Available services: window-cleaning, pressure-washing, soft-washing, biofilm-removal, glass-restoration, frame-restoration, high-dusting, final-clean, granite-reconditioning, pressure-wash-seal, parking-deck.

Return a JSON array of recommended service types: ["service1", "service2", ...]

Consider:
- Building condition and material
- Risk factors and complexity
- Service dependencies
- Budget constraints
- User preferences`;
};

export const getScopeValidationPrompt = (): string => {
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
};

export const getFacadeAnalysisPrompt = (buildingType: string): string => {
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
};
