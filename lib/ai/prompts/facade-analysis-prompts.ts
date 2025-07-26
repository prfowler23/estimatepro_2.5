export const FACADE_ANALYSIS_PROMPTS = {
  analyzeBuilding: (imageType: string, viewAngle: string) => `
You are an expert building estimator analyzing a ${imageType} image taken from a ${viewAngle} angle.

Analyze this building image and provide detailed measurements and material identification following Version 8.0 AI standards.

Required Analysis:
1. Window Detection
   - Count total windows visible
   - Estimate window dimensions (standard commercial window = 24 sq ft)
   - Identify window type (punched, ribbon, curtain wall)
   - Frame material if visible

2. Building Height
   - Count visible stories
   - Estimate height in feet (standard floor = 12 ft, first floor = 14-16 ft)
   - Note any mechanical floors or penthouses

3. Facade Materials
   - Identify all visible materials (brick, stone, concrete, EIFS, metal, glass)
   - Estimate percentage of each material
   - Note material condition and complexity

4. Ground-Level Features
   - Detect sidewalks and walkways
   - Identify covered areas (canopies, breezeways, covered walkways)
   - Count parking spaces if visible
   - Note loading docks or service areas

5. Special Considerations
   - Historic/ornate architectural features
   - Building complexity (simple/moderate/complex)
   - Obstructions blocking view
   - Confidence level for each measurement

Provide response in this exact JSON format:
{
  "window_analysis": {
    "total_windows": number,
    "window_type": "punched|ribbon|curtain_wall",
    "total_glass_sqft": number,
    "frame_material": "aluminum|vinyl|wood|steel|unknown",
    "confidence": number (0-100)
  },
  "height_analysis": {
    "stories_count": number,
    "estimated_height_feet": number,
    "first_floor_height": number,
    "typical_floor_height": number,
    "confidence": number (0-100)
  },
  "material_analysis": {
    "materials": [
      {
        "type": "brick|stone|concrete|eifs|metal|wood|glass|other",
        "percentage": number,
        "sqft": number,
        "location": "description",
        "confidence": number (0-100)
      }
    ],
    "facade_complexity": "simple|moderate|complex",
    "total_facade_sqft": number
  },
  "ground_features": {
    "sidewalk_sqft": number,
    "covered_walkway_sqft": number,
    "parking_spaces": number,
    "parking_sqft": number,
    "loading_dock_sqft": number,
    "has_covered_areas": boolean
  },
  "quality_factors": {
    "overall_confidence": number (0-100),
    "obstructions": ["list of obstructions"],
    "image_quality": "excellent|good|fair|poor",
    "requires_field_verification": boolean,
    "verification_reasons": ["list of reasons"]
  }
}
`,

  validateMeasurements: (measurements: any) => `
Review these building measurements for accuracy and professional estimating standards:

${JSON.stringify(measurements, null, 2)}

Validate against these criteria:
1. Glass area should not exceed 90% of total facade
2. Window count should align with glass area (÷24 sq ft per window)
3. Building height should correlate with story count (10-14 ft per story)
4. Material percentages must total 100%
5. Parking space count should align with area (270 sq ft per space)

Provide validation results and any recommended adjustments.
`,

  generateEstimateNarrative: (analysis: any) => `
Generate a professional estimate narrative for this facade analysis:

${JSON.stringify(analysis, null, 2)}

Include:
1. Executive summary of building characteristics
2. Detailed scope of recommended services
3. Access requirements and equipment needs
4. Special considerations or challenges
5. Confidence statement and any limitations

Format as professional prose suitable for client presentation.
`,
};
