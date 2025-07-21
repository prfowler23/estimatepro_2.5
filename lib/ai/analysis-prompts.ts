export const WINDOW_DETECTION_PROMPT = `Analyze this building photo and provide detailed window information:
1. Count every visible window (including partially visible)
2. Identify the grid pattern (e.g., '5 floors with 8 windows per floor = 40 windows')
3. Estimate window dimensions (standard commercial: 3ft x 5ft, residential: 2.5ft x 4ft)
4. Calculate total glass area in square feet
5. Identify window types: fixed, operable, storefront, curtain wall
6. Note special features: tinted, broken, boarded up

Return JSON:
{
  count: number,
  gridPattern: string,
  averageSize: { width: number, height: number },
  totalArea: number,
  types: string[],
  confidence: number (0-1)
}`;

export const MATERIAL_CLASSIFICATION_PROMPT = `Analyze building materials with precise percentages:
1. Identify all visible facade materials
2. Calculate percentage of each material on visible surfaces
3. Rate condition: new (0-2 years), good (2-5), fair (5-10), poor (10+)
4. Note any coatings: paint, sealant, anti-graffiti
5. Assess cleaning difficulty considering:
   - Height and access
   - Material porosity
   - Staining severity
   - Special equipment needs

Return JSON:
{
  breakdown: { brick: 40, glass: 30, concrete: 20, metal: 10 },
  conditions: ['weathered brick', 'oxidized metal frames'],
  cleaningDifficulty: 7,
  specialCoatings: ['anti-graffiti on lower level']
}`;

export const DAMAGE_ASSESSMENT_PROMPT = `Identify all visible damage and staining:
1. Staining types:
   - Water stains (rust colored streaks)
   - Biological growth (green/black areas)
   - Efflorescence (white crystalline deposits)
   - Atmospheric (general darkening)
2. Metal oxidation: light surface rust vs heavy corrosion
3. Physical damage: cracks, spalling, missing mortar
4. Severity rating based on:
   - Percentage of area affected
   - Depth of damage
   - Structural concerns

Return JSON:
{
  staining: ['water stains on east facade', 'biological growth near gutters'],
  oxidation: ['light rust on window frames', 'heavy corrosion on fire escape'],
  damage: ['hairline cracks in concrete', 'spalling near ground level'],
  severity: 'medium',
  affectedArea: 25,
  repairUrgency: 'moderate'
}`;

export const SAFETY_HAZARD_PROMPT = `Identify all safety concerns for crew:
1. Overhead hazards: power lines, loose materials, overhangs
2. Ground level: uneven surfaces, landscaping, vehicle traffic
3. Building specific: security requirements, occupied areas
4. Environmental: nearby hazards, chemicals, biological
5. Required safety equipment based on identified hazards
6. Access challenges requiring special equipment

Rate overall risk level and list specific requirements.

Return JSON:
{
  hazards: ['overhead power lines 15ft from building', 'busy pedestrian walkway'],
  requirements: ['scaffolding with electrical clearance', 'pedestrian barriers'],
  riskLevel: 'medium',
  accessChallenges: ['narrow side access', 'landscaping obstacles'],
  equipmentNeeded: ['boom lift', 'safety harnesses', 'ground protection']
}`;

export const BUILDING_MEASUREMENTS_PROMPT = `Estimate building dimensions using visual reference points:
1. Count floor levels and estimate floor-to-floor height (typical 12-14ft commercial, 9-10ft residential)
2. Use reference objects for scale:
   - Standard door height: 7-8 feet
   - Average window width: 3-4 feet commercial, 2.5-3 feet residential
   - Vehicle heights: cars 5.5ft, trucks 13.5ft
   - Human figures: average 5.5-6 feet
3. Estimate facade width by counting window bays and multiplying by typical spacing
4. Calculate total square footage of visible facade
5. Note architectural style which affects proportions

Return JSON:
{
  buildingHeight: number (in feet),
  facadeWidth: number (in feet),
  stories: number,
  confidence: number (0-1, based on available reference points),
  estimatedSqft: number,
  referencePoints: ['door visible for scale', '2 parked cars', '4 story height typical']
}`;

export const COMPREHENSIVE_ANALYSIS_PROMPT = `Perform a complete building facade analysis covering all aspects:

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

Return comprehensive JSON with all analysis categories included.`;

// Prompt modifiers for specific building types
export const BUILDING_TYPE_MODIFIERS = {
  commercial: `This appears to be a commercial building. Consider:
- Larger window sizes (typically 3-5ft wide)
- Higher floor-to-floor heights (12-14ft)
- Professional appearance requirements
- Business hour access restrictions`,

  residential: `This appears to be a residential building. Consider:
- Smaller window sizes (typically 2-3ft wide)
- Standard floor heights (8-10ft)
- Privacy concerns during cleaning
- Residential safety considerations`,

  industrial: `This appears to be an industrial building. Consider:
- Large industrial windows or minimal glazing
- Higher structural elements
- Potential hazardous material concerns
- Heavy equipment access needs`,

  historic: `This appears to be a historic building. Consider:
- Specialized cleaning requirements for historic materials
- Potential restrictions on cleaning methods
- Unique architectural features requiring special care
- Preservation considerations`,
};

// Context prompts for different analysis phases
export const ANALYSIS_CONTEXT = {
  initial:
    "This is an initial assessment for cleaning estimation purposes. Focus on identifying key characteristics that will affect cleaning scope and pricing.",

  detailed:
    "This is a detailed analysis for project planning. Provide comprehensive information for work planning, safety preparation, and resource allocation.",

  verification:
    "This is a verification analysis to confirm previous findings. Pay special attention to any discrepancies with expected results.",

  damage_focused:
    "Focus specifically on damage assessment and repair needs. Prioritize identifying issues that must be addressed before or during cleaning.",

  safety_focused:
    "Prioritize safety hazard identification and risk assessment. This analysis will be used for safety planning and equipment specification.",
};
