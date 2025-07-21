import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Type definitions
export interface WindowAnalysis {
  count: number;
  totalArea: number;
  gridPattern: string;
  confidence: number;
  locations: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export interface MaterialAnalysis {
  breakdown: Record<string, number>;
  conditions: string[];
  cleaningDifficulty: number;
  dominant: string;
  weathering: "none" | "light" | "moderate" | "heavy";
}

export interface DamageAnalysis {
  staining: string[];
  oxidation: string[];
  damage: string[];
  severity: "low" | "medium" | "high";
  affectedArea: number;
  repairUrgency: "none" | "minor" | "moderate" | "urgent";
}

export interface SafetyAnalysis {
  hazards: string[];
  requirements: string[];
  riskLevel: "low" | "medium" | "high";
  accessChallenges: string[];
  equipmentNeeded: string[];
}

export interface BuildingMeasurements {
  buildingHeight: number;
  facadeWidth: number;
  confidence: number;
  stories: number;
  estimatedSqft: number;
}

export interface MaterialQuantityEstimation {
  materials: Array<{
    type: string;
    area: number;
    unit: string;
    cleaningHours: number;
    difficulty: number;
    specialEquipment: string[];
  }>;
  totalCleanableArea: number;
  timeEstimate: number;
  complexity: number;
}

export interface DetailedItemCount {
  windows: {
    total: number;
    byType: Record<string, number>;
    avgSize: number;
    totalArea: number;
  };
  doors: {
    total: number;
    types: string[];
  };
  fixtures: {
    lights: number;
    signs: number;
    awnings: number;
    other: Record<string, number>;
  };
  surfaces: {
    walls: number;
    panels: number;
    columns: number;
    decorativeElements: number;
  };
}

export interface PhotoAnalysisResult {
  windows?: WindowAnalysis;
  materials?: MaterialAnalysis;
  measurements?: BuildingMeasurements;
  damage?: DamageAnalysis;
  safety?: SafetyAnalysis;
  materialQuantities?: MaterialQuantityEstimation;
  itemCounts?: DetailedItemCount;
}

// Helper function to convert File to base64
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

// Window detection function
export async function detectWindows(
  imageBase64: string,
): Promise<WindowAnalysis> {
  const prompt = `Analyze this building facade image and detect all windows. Return a JSON object with the following structure:
  {
    "count": number of windows visible,
    "totalArea": estimated total window area in square feet,
    "gridPattern": description like "5x8" for 5 columns by 8 rows,
    "confidence": confidence score 0.0-1.0,
    "locations": [
      {
        "x": normalized x position (0.0-1.0),
        "y": normalized y position (0.0-1.0),
        "width": normalized width (0.0-1.0),
        "height": normalized height (0.0-1.0)
      }
    ]
  }
  
  Consider:
  - Count individual window panes or units
  - Estimate window sizes based on building proportions
  - Identify any pattern or grid layout
  - Provide confidence based on image clarity and visibility
  - Include coordinates for each detected window`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: imageBase64 },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as WindowAnalysis;
  } catch (error) {
    console.error("Error detecting windows:", error);
    throw new Error("Failed to analyze windows in image");
  }
}

// Material classification function
export async function classifyMaterials(
  imageBase64: string,
): Promise<MaterialAnalysis> {
  const prompt = `Analyze the building materials in this facade image. Return a JSON object with:
  {
    "breakdown": {
      "brick": percentage (0-100),
      "concrete": percentage (0-100),
      "glass": percentage (0-100),
      "metal": percentage (0-100),
      "stone": percentage (0-100),
      "other": percentage (0-100)
    },
    "conditions": ["description of material conditions"],
    "cleaningDifficulty": difficulty rating 1-10 (1=easy, 10=very difficult),
    "dominant": "primary material type",
    "weathering": "none" | "light" | "moderate" | "heavy"
  }
  
  Consider:
  - Visual appearance and texture
  - Signs of aging, weathering, or wear
  - Accessibility for cleaning
  - Surface porosity and cleaning challenges
  - Overall material condition`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: imageBase64 },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as MaterialAnalysis;
  } catch (error) {
    console.error("Error classifying materials:", error);
    throw new Error("Failed to analyze materials in image");
  }
}

// Damage assessment function
export async function assessDamage(
  imageBase64: string,
): Promise<DamageAnalysis> {
  const prompt = `Assess damage and staining on this building facade. Return a JSON object with:
  {
    "staining": ["types of stains observed, e.g. water stains, rust stains, organic growth"],
    "oxidation": ["areas showing oxidation, corrosion, or rust"],
    "damage": ["physical damage like cracks, chips, missing pieces"],
    "severity": "low" | "medium" | "high",
    "affectedArea": percentage of facade affected (0-100),
    "repairUrgency": "none" | "minor" | "moderate" | "urgent"
  }
  
  Look for:
  - Water damage or staining
  - Rust or oxidation on metal surfaces
  - Cracks in concrete or masonry
  - Missing or damaged components
  - Biological growth (algae, mildew)
  - Paint deterioration
  - Structural issues`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: imageBase64 },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as DamageAnalysis;
  } catch (error) {
    console.error("Error assessing damage:", error);
    throw new Error("Failed to analyze damage in image");
  }
}

// Safety analysis function
export async function analyzeSafety(
  imageBase64: string,
): Promise<SafetyAnalysis> {
  const prompt = `Analyze safety considerations for cleaning/maintenance of this building facade. Return a JSON object with:
  {
    "hazards": ["safety hazards visible, e.g. power lines, unstable surfaces, height risks"],
    "requirements": ["safety requirements needed, e.g. scaffolding, safety harnesses, traffic control"],
    "riskLevel": "low" | "medium" | "high",
    "accessChallenges": ["access difficulties like tight spaces, obstacles"],
    "equipmentNeeded": ["specialized equipment required"]
  }
  
  Consider:
  - Building height and access challenges
  - Proximity to power lines or utilities
  - Structural stability concerns
  - Ground conditions and obstacles
  - Traffic or pedestrian safety
  - Weather exposure risks
  - Required safety equipment and protocols`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: imageBase64 },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as SafetyAnalysis;
  } catch (error) {
    console.error("Error analyzing safety:", error);
    throw new Error("Failed to analyze safety considerations");
  }
}

// Building measurements function
export async function extractBuildingMeasurements(
  imageBase64: string,
): Promise<BuildingMeasurements> {
  const prompt = `Estimate building dimensions from this facade image. Return a JSON object with:
  {
    "buildingHeight": estimated height in feet,
    "facadeWidth": estimated width in feet,
    "confidence": confidence score 0.0-1.0,
    "stories": number of floors/stories,
    "estimatedSqft": total facade square footage
  }
  
  Use visual cues for scale estimation:
  - Standard door height (7-8 feet)
  - Window sizes (typical 3-4 feet wide, 4-6 feet tall)
  - Floor-to-floor height (10-14 feet typical)
  - Human figures if visible
  - Vehicle sizes for reference
  - Architectural proportions
  
  Provide your best estimate with appropriate confidence level based on available reference points.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: imageBase64 },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as BuildingMeasurements;
  } catch (error) {
    console.error("Error extracting measurements:", error);
    throw new Error("Failed to extract building measurements");
  }
}

// Material quantity estimation function
export async function estimateMaterialQuantities(
  imageBase64: string,
): Promise<MaterialQuantityEstimation> {
  const prompt = `Analyze this building facade for detailed material quantity estimation. Return a JSON object with:
  {
    "materials": [
      {
        "type": "material name (e.g., brick, concrete, glass, metal)",
        "area": estimated area in square feet,
        "unit": "sq ft",
        "cleaningHours": estimated hours to clean this material,
        "difficulty": cleaning difficulty 1-10,
        "specialEquipment": ["required equipment for this material"]
      }
    ],
    "totalCleanableArea": total area requiring cleaning in sq ft,
    "timeEstimate": total estimated cleaning time in hours,
    "complexity": overall complexity score 1-10
  }
  
  Consider:
  - Different material types require different cleaning approaches
  - Surface texture affects cleaning time
  - Height and accessibility impact difficulty
  - Damage or staining increases time requirements
  - Special coatings or treatments require specific methods`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: imageBase64, detail: "high" },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as MaterialQuantityEstimation;
  } catch (error) {
    console.error("Error estimating material quantities:", error);
    throw new Error("Failed to estimate material quantities");
  }
}

// Detailed item counting function
export async function countDetailedItems(
  imageBase64: string,
): Promise<DetailedItemCount> {
  const prompt = `Count all visible building elements in this facade image with precision. Return a JSON object with:
  {
    "windows": {
      "total": total number of windows,
      "byType": {
        "standard": count,
        "large": count,
        "small": count,
        "storefront": count,
        "decorative": count
      },
      "avgSize": average window size in sq ft,
      "totalArea": total window area in sq ft
    },
    "doors": {
      "total": total number of doors,
      "types": ["main entrance", "service door", "emergency exit", etc.]
    },
    "fixtures": {
      "lights": number of light fixtures,
      "signs": number of signs,
      "awnings": number of awnings,
      "other": {
        "vents": count,
        "cameras": count,
        "speakers": count,
        "decorative_elements": count
      }
    },
    "surfaces": {
      "walls": number of distinct wall sections,
      "panels": number of panels or sections,
      "columns": number of columns or pillars,
      "decorativeElements": number of decorative features
    }
  }
  
  Count carefully and precisely:
  - Each individual window pane/unit
  - Every door and entrance
  - All lighting fixtures and signs
  - Decorative elements and architectural features
  - Distinct surface sections or panels`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: imageBase64, detail: "high" },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1200,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as DetailedItemCount;
  } catch (error) {
    console.error("Error counting detailed items:", error);
    throw new Error("Failed to count detailed items");
  }
}

// 3D building reconstruction analysis
export async function analyze3DReconstruction(imageUrls: string[]): Promise<{
  reconstruction: {
    confidence: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
      volume: number;
    };
    surfaces: Array<{
      type: string;
      area: number;
      orientation: string;
      accessibility: string;
    }>;
    complexityFactors: string[];
  };
  recommendations: string[];
}> {
  if (imageUrls.length < 2) {
    throw new Error(
      "At least 2 images required for 3D reconstruction analysis",
    );
  }

  const prompt = `Analyze these multiple building images to create a 3D understanding. Return JSON with:
  {
    "reconstruction": {
      "confidence": confidence in 3D analysis 0.0-1.0,
      "dimensions": {
        "length": building length in feet,
        "width": building width in feet,
        "height": building height in feet,
        "volume": total building volume in cubic feet
      },
      "surfaces": [
        {
          "type": "north wall" | "south wall" | "east wall" | "west wall" | "roof",
          "area": surface area in sq ft,
          "orientation": "north" | "south" | "east" | "west" | "horizontal",
          "accessibility": "easy" | "moderate" | "difficult" | "requires_equipment"
        }
      ],
      "complexityFactors": ["factors affecting service complexity"]
    },
    "recommendations": ["strategic recommendations for service planning"]
  }
  
  Use multiple angles to understand:
  - Building shape and proportions
  - All facade surfaces
  - Roof configuration
  - Access points and challenges
  - Service planning implications`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...imageUrls.map((url) => ({
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

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Error in 3D reconstruction analysis:", error);
    throw new Error("Failed to perform 3D reconstruction analysis");
  }
}

// Before/after comparison analysis
export async function compareBeforeAfter(
  beforeImageUrl: string,
  afterImageUrl: string,
): Promise<{
  qualityAssessment: {
    improvementScore: number; // 0-100
    areasImproved: string[];
    remainingIssues: string[];
    overallSatisfaction: "poor" | "fair" | "good" | "excellent";
  };
  detailedComparison: {
    cleanliness: { before: number; after: number; improvement: number };
    damage: { before: string[]; after: string[]; resolved: string[] };
    appearance: { before: string; after: string };
  };
  recommendations: string[];
}> {
  const prompt = `Compare these before and after cleaning images to assess work quality. Return JSON with:
  {
    "qualityAssessment": {
      "improvementScore": score 0-100 for overall improvement,
      "areasImproved": ["specific areas that were improved"],
      "remainingIssues": ["issues that still need attention"],
      "overallSatisfaction": "poor" | "fair" | "good" | "excellent"
    },
    "detailedComparison": {
      "cleanliness": {
        "before": cleanliness score 0-10,
        "after": cleanliness score 0-10,
        "improvement": improvement points
      },
      "damage": {
        "before": ["damage/issues visible in before image"],
        "after": ["damage/issues still visible in after image"],
        "resolved": ["issues that were resolved"]
      },
      "appearance": {
        "before": "description of before condition",
        "after": "description of after condition"
      }
    },
    "recommendations": ["recommendations for future maintenance"]
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "text", text: "BEFORE IMAGE:" },
            {
              type: "image_url",
              image_url: { url: beforeImageUrl, detail: "high" },
            },
            { type: "text", text: "AFTER IMAGE:" },
            {
              type: "image_url",
              image_url: { url: afterImageUrl, detail: "high" },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Error in before/after comparison:", error);
    throw new Error("Failed to compare before/after images");
  }
}

// Main analysis function
export async function analyzePhotos(
  photos: File[],
): Promise<PhotoAnalysisResult[]> {
  const results: PhotoAnalysisResult[] = [];

  for (const photo of photos) {
    try {
      // Convert file to base64
      const imageBase64 = await fileToBase64(photo);

      // Run all analysis functions in parallel for each photo
      const [
        windows,
        materials,
        measurements,
        damage,
        safety,
        materialQuantities,
        itemCounts,
      ] = await Promise.allSettled([
        detectWindows(imageBase64),
        classifyMaterials(imageBase64),
        extractBuildingMeasurements(imageBase64),
        assessDamage(imageBase64),
        analyzeSafety(imageBase64),
        estimateMaterialQuantities(imageBase64),
        countDetailedItems(imageBase64),
      ]);

      // Compile results, handling any failed analyses
      const result: PhotoAnalysisResult = {};

      if (windows.status === "fulfilled") {
        result.windows = windows.value;
      }

      if (materials.status === "fulfilled") {
        result.materials = materials.value;
      }

      if (measurements.status === "fulfilled") {
        result.measurements = measurements.value;
      }

      if (damage.status === "fulfilled") {
        result.damage = damage.value;
      }

      if (safety.status === "fulfilled") {
        result.safety = safety.value;
      }

      if (materialQuantities.status === "fulfilled") {
        result.materialQuantities = materialQuantities.value;
      }

      if (itemCounts.status === "fulfilled") {
        result.itemCounts = itemCounts.value;
      }

      results.push(result);
    } catch (error) {
      console.error(`Error analyzing photo ${photo.name}:`, error);
      // Push empty result for failed analysis
      results.push({});
    }
  }

  return results;
}

// Additional utility function for batch processing with rate limiting
export async function analyzePhotosWithRateLimit(
  photos: File[],
  rateLimitMs: number = 1000,
): Promise<PhotoAnalysisResult[]> {
  const results: PhotoAnalysisResult[] = [];

  for (let i = 0; i < photos.length; i++) {
    if (i > 0) {
      // Add delay between requests to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, rateLimitMs));
    }

    try {
      const result = await analyzePhotos([photos[i]]);
      results.push(result[0]);
    } catch (error) {
      console.error(`Error analyzing photo ${photos[i].name}:`, error);
      results.push({});
    }
  }

  return results;
}
