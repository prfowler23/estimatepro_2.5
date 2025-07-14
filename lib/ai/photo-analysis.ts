import OpenAI from 'openai';

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
  weathering: 'none' | 'light' | 'moderate' | 'heavy';
}

export interface DamageAnalysis {
  staining: string[];
  oxidation: string[];
  damage: string[];
  severity: 'low' | 'medium' | 'high';
  affectedArea: number;
  repairUrgency: 'none' | 'minor' | 'moderate' | 'urgent';
}

export interface SafetyAnalysis {
  hazards: string[];
  requirements: string[];
  riskLevel: 'low' | 'medium' | 'high';
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

export interface PhotoAnalysisResult {
  windows?: WindowAnalysis;
  materials?: MaterialAnalysis;
  measurements?: BuildingMeasurements;
  damage?: DamageAnalysis;
  safety?: SafetyAnalysis;
}

// Helper function to convert File to base64
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
}

// Window detection function
export async function detectWindows(imageBase64: string): Promise<WindowAnalysis> {
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
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: imageBase64 }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as WindowAnalysis;
  } catch (error) {
    console.error('Error detecting windows:', error);
    throw new Error('Failed to analyze windows in image');
  }
}

// Material classification function
export async function classifyMaterials(imageBase64: string): Promise<MaterialAnalysis> {
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
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: imageBase64 }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as MaterialAnalysis;
  } catch (error) {
    console.error('Error classifying materials:', error);
    throw new Error('Failed to analyze materials in image');
  }
}

// Damage assessment function
export async function assessDamage(imageBase64: string): Promise<DamageAnalysis> {
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
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: imageBase64 }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as DamageAnalysis;
  } catch (error) {
    console.error('Error assessing damage:', error);
    throw new Error('Failed to analyze damage in image');
  }
}

// Safety analysis function
export async function analyzeSafety(imageBase64: string): Promise<SafetyAnalysis> {
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
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: imageBase64 }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as SafetyAnalysis;
  } catch (error) {
    console.error('Error analyzing safety:', error);
    throw new Error('Failed to analyze safety considerations');
  }
}

// Building measurements function
export async function extractBuildingMeasurements(imageBase64: string): Promise<BuildingMeasurements> {
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
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: imageBase64 }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 600
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as BuildingMeasurements;
  } catch (error) {
    console.error('Error extracting measurements:', error);
    throw new Error('Failed to extract building measurements');
  }
}

// Main analysis function
export async function analyzePhotos(photos: File[]): Promise<PhotoAnalysisResult[]> {
  const results: PhotoAnalysisResult[] = [];

  for (const photo of photos) {
    try {
      // Convert file to base64
      const imageBase64 = await fileToBase64(photo);

      // Run all analysis functions in parallel for each photo
      const [windows, materials, measurements, damage, safety] = await Promise.allSettled([
        detectWindows(imageBase64),
        classifyMaterials(imageBase64),
        extractBuildingMeasurements(imageBase64),
        assessDamage(imageBase64),
        analyzeSafety(imageBase64)
      ]);

      // Compile results, handling any failed analyses
      const result: PhotoAnalysisResult = {};

      if (windows.status === 'fulfilled') {
        result.windows = windows.value;
      }

      if (materials.status === 'fulfilled') {
        result.materials = materials.value;
      }

      if (measurements.status === 'fulfilled') {
        result.measurements = measurements.value;
      }

      if (damage.status === 'fulfilled') {
        result.damage = damage.value;
      }

      if (safety.status === 'fulfilled') {
        result.safety = safety.value;
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
  rateLimitMs: number = 1000
): Promise<PhotoAnalysisResult[]> {
  const results: PhotoAnalysisResult[] = [];

  for (let i = 0; i < photos.length; i++) {
    if (i > 0) {
      // Add delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, rateLimitMs));
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