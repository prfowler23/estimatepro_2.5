// Optimized prompts with few-shot examples and chain-of-thought reasoning

// Enhanced extraction prompt with examples
export const ENHANCED_EXTRACTION_PROMPT = `You are an expert at extracting structured business information from communications. Use chain-of-thought reasoning to analyze the content step by step.

STEP-BY-STEP PROCESS:
1. Identify the customer and their role
2. Determine the building type and location
3. Extract service requirements from explicit and implicit clues
4. Assess timeline urgency from language cues
5. Evaluate budget constraints and approval status
6. Identify decision makers and influencers
7. Flag potential risks or complications

SERVICE CODES:
- PW: Pressure Washing (concrete, sidewalks, building exteriors)
- PWS: Pressure Wash & Seal (includes protective coating)
- WC: Window Cleaning (interior/exterior glass surfaces)
- GR: Glass Restoration (removing stains, scratches, mineral deposits)
- FR: Frame Restoration (window frames, metal surfaces)
- HD: High Dusting (ceiling fans, light fixtures, high surfaces)
- SW: Soft Washing (delicate surfaces, organic growth removal)
- PD: Parking Deck Cleaning (large concrete areas, oil stains)
- GRC: Granite Reconditioning (stone surfaces, polishing)
- FC: Final Clean (post-construction cleanup)

FEW-SHOT EXAMPLES:

EXAMPLE 1:
Input: "Hi, I'm Sarah Johnson, Facilities Manager at Westside Medical Center. Our 4-story hospital building needs window cleaning urgently - we have a state inspection next week. The building is about 80,000 sq ft. Please provide an estimate ASAP. Budget is tight but approved up to $15,000."

Chain of Thought:
1. Customer: Sarah Johnson, Facilities Manager at medical facility
2. Building: 4-story hospital, 80,000 sq ft - hospitals require special care
3. Service: Window cleaning needed urgently
4. Timeline: "ASAP" and "next week" indicates urgent timeline
5. Budget: $15,000 limit, "tight but approved" suggests budget pressure
6. Decision: Facilities Manager likely has authority for this amount
7. Risks: Hospital environment, state inspection deadline

Output:
{
  "customer": {
    "name": "Sarah Johnson",
    "company": "Westside Medical Center", 
    "email": "",
    "phone": "",
    "role": "Facilities Manager",
    "address": ""
  },
  "requirements": {
    "services": ["WC"],
    "buildingType": "hospital",
    "location": "",
    "buildingSize": "80,000 sq ft",
    "floors": 4,
    "specialRequirements": ["state inspection compliance", "hospital environment protocols"]
  },
  "timeline": {
    "requestedDate": "ASAP",
    "deadline": "next week",
    "urgency": "urgent",
    "flexibility": "none"
  },
  "budget": {
    "range": "up to $15,000",
    "statedAmount": "$15,000",
    "constraints": ["tight budget"],
    "approved": true,
    "flexibility": "tight"
  },
  "decisionMakers": {
    "primaryContact": "Sarah Johnson",
    "approvers": ["Sarah Johnson"],
    "influencers": [],
    "roles": {"Sarah Johnson": "Facilities Manager"}
  },
  "redFlags": ["tight timeline", "state inspection pressure", "budget constraints"],
  "urgencyScore": 9,
  "confidence": 0.95
}

EXAMPLE 2:
Input: "Looking for pressure washing services for our retail plaza. 3 buildings, mixed retail/restaurant. About 25,000 sq ft total. Would like to get this done in the spring when weather improves. Please send information."

Chain of Thought:
1. Customer: Unknown name, seems to be property manager/owner
2. Building: Retail plaza, 3 buildings, mixed use, 25,000 sq ft total
3. Service: Pressure washing for exterior surfaces
4. Timeline: Spring timeframe, flexible timing
5. Budget: No mention, likely gathering estimates
6. Decision: Unknown authority level, requesting information
7. Risks: Minimal urgency, information-gathering stage

Output:
{
  "customer": {
    "name": "",
    "company": "",
    "email": "",
    "phone": "",
    "role": "",
    "address": ""
  },
  "requirements": {
    "services": ["PW"],
    "buildingType": "retail",
    "location": "",
    "buildingSize": "25,000 sq ft",
    "floors": 1,
    "specialRequirements": ["multiple buildings", "restaurant areas"]
  },
  "timeline": {
    "requestedDate": "spring",
    "deadline": "",
    "urgency": "flexible",
    "flexibility": "flexible"
  },
  "budget": {
    "range": "",
    "statedAmount": "",
    "constraints": [],
    "approved": false,
    "flexibility": "normal"
  },
  "decisionMakers": {
    "primaryContact": "",
    "approvers": [],
    "influencers": [],
    "roles": {}
  },
  "redFlags": ["incomplete contact information", "information gathering stage"],
  "urgencyScore": 3,
  "confidence": 0.7
}

Now analyze the following content using the same step-by-step approach:`;

// Enhanced photo analysis prompt
export const ENHANCED_PHOTO_ANALYSIS_PROMPT = `You are an expert building analyst. Analyze this image using systematic observation and professional estimation techniques.

ANALYSIS METHODOLOGY:
1. Overall building assessment (type, size, condition)
2. Window counting and measurement estimation
3. Material identification and condition assessment
4. Safety and access considerations
5. Service requirements determination
6. Complexity and risk factors

ESTIMATION TECHNIQUES:
- Use visual reference points (doors ~7ft, windows ~3-4ft wide)
- Apply proportional scaling for measurements
- Consider industry standards for building types
- Account for perspective and angle distortions

EXAMPLE ANALYSIS:

For a 3-story office building photo:

Step 1 - Building Assessment:
- Building type: Modern office building
- Stories: 3 visible floors
- Approximate dimensions: 150ft wide x 40ft tall
- Overall condition: Good, minor weathering visible

Step 2 - Window Analysis:
- Pattern: Regular grid, 15 windows per floor
- Total count: 45 windows
- Individual size: ~4ft x 6ft each
- Total window area: ~1,080 sq ft

Step 3 - Materials:
- Primary: Brick and glass construction
- Secondary: Metal window frames
- Condition: Light staining on brick, frames show oxidation

Step 4 - Access/Safety:
- Ground level: Easy access
- Upper levels: Require lift equipment
- No overhead power lines visible
- Sidewalk access adequate

Step 5 - Service Needs:
- Window cleaning recommended
- Pressure washing for brick surfaces
- Frame restoration for oxidized metal

Step 6 - Complexity Factors:
- Height requires equipment
- Mixed materials need different approaches
- Urban location may have restrictions

Now analyze the provided image following this methodology.`;

// Enhanced competitive analysis prompt
export const ENHANCED_COMPETITIVE_ANALYSIS_PROMPT = `You are a competitive intelligence analyst specializing in building services. Analyze this competitor document using systematic business intelligence techniques.

ANALYSIS FRAMEWORK:
1. Company identification and positioning
2. Service offering analysis
3. Pricing strategy evaluation
4. Competitive positioning assessment
5. Market opportunity identification
6. Strategic recommendations

PRICING ANALYSIS METHODOLOGY:
- Identify base rates and pricing models
- Calculate implied margins and markups
- Compare to industry standards
- Assess value proposition clarity
- Identify pricing advantages/disadvantages

EXAMPLE ANALYSIS:

Competitor Estimate: "ABC Building Services - Premium Window Cleaning
- 50,000 sq ft office building
- Exterior window cleaning: $2,850
- Interior window cleaning: $1,950
- Total: $4,800
- Includes liability insurance and quality guarantee"

Analysis Process:
1. Company: ABC Building Services, positions as "premium"
2. Pricing: $0.96/sq ft total ($0.57 exterior, $0.39 interior)
3. Strategy: Premium pricing with value-added services
4. Positioning: Quality and insurance emphasis
5. Opportunities: Higher pricing than market average
6. Threats: Strong value proposition and guarantees

Now analyze the provided competitor content using this framework.`;

// Enhanced risk assessment prompt
export const ENHANCED_RISK_ASSESSMENT_PROMPT = `You are a project risk assessment expert. Evaluate this project data using comprehensive risk analysis methodologies.

RISK ASSESSMENT FRAMEWORK:
1. Timeline Risk Analysis
2. Budget and Financial Risk Evaluation  
3. Technical and Operational Risk Assessment
4. Safety and Environmental Risk Review
5. Customer and Relationship Risk Factors
6. Market and External Risk Considerations

RISK SCORING METHODOLOGY:
- Probability: Low (1-3), Medium (4-6), High (7-9), Critical (10)
- Impact: Minor (1-2), Moderate (3-5), Major (6-8), Severe (9-10)
- Overall Risk Score: (Probability + Impact) / 2
- Mitigation Feasibility: Easy, Moderate, Difficult, Not Feasible

EXAMPLE RISK ASSESSMENT:

Project: Hospital window cleaning, 4 stories, $15,000 budget, 1-week deadline

Risk Analysis:
1. Timeline Risks:
   - State inspection deadline (Probability: 8, Impact: 9)
   - Weather delays possible (Probability: 6, Impact: 5)
   
2. Budget Risks:
   - "Tight budget" constraint (Probability: 7, Impact: 6)
   - Potential scope expansion (Probability: 5, Impact: 7)

3. Technical Risks:
   - Hospital environment protocols (Probability: 4, Impact: 8)
   - Specialized cleaning requirements (Probability: 6, Impact: 5)

4. Safety Risks:
   - Height work requirements (Probability: 3, Impact: 9)
   - Hospital operational disruption (Probability: 5, Impact: 8)

Overall Project Risk Score: 7.2/10 (High Risk)

Recommended Pricing Adjustments:
- Timeline pressure: +25% urgency premium
- Hospital complexity: +15% specialized environment
- Safety requirements: +10% additional insurance/equipment

Now analyze the provided project data using this methodology.`;

// Enhanced follow-up email prompt
export const ENHANCED_FOLLOW_UP_PROMPT = `You are an expert sales communication specialist. Create compelling follow-up emails using proven sales psychology and personalization techniques.

EMAIL STRATEGY FRAMEWORK:
1. Relationship Building Approach
2. Value Proposition Alignment
3. Urgency and Scarcity Utilization
4. Social Proof Integration
5. Clear Call-to-Action Design
6. Objection Handling Preparation

PERSONALIZATION FACTORS:
- Industry-specific language and concerns
- Role-appropriate communication style
- Urgency level matching
- Company size considerations
- Previous interaction references

EXAMPLE EMAIL GENERATION:

Customer Profile: Sarah Johnson, Facilities Manager, Hospital, Urgent Window Cleaning
Email Type: Initial Follow-up

Subject Analysis:
- Include recipient name for personalization
- Reference specific project for relevance
- Create urgency without being pushy
- Keep under 50 characters for mobile

Content Strategy:
- Open with industry expertise demonstration
- Address specific hospital requirements
- Provide social proof with similar projects
- Handle budget concerns proactively
- Create clear next steps

Generated Email:
Subject: "Sarah - Hospital Window Cleaning for State Inspection"

Hi Sarah,

I understand the pressure of preparing Westside Medical Center for next week's state inspection. As someone who has worked with over 50 healthcare facilities, I know how critical spotless windows are for inspection success.

For your 4-story, 80,000 sq ft building, we can complete the exterior window cleaning in 2 days with minimal disruption to patient care. Our hospital-certified team follows strict protocols and carries specialized healthcare facility insurance.

Recent similar project: City General Hospital (similar size) - completed in 48 hours, passed inspection with commendation for facility cleanliness.

Given your $15,000 budget and tight timeline, I can provide a fixed-price estimate of $12,800, which includes:
- 48-hour completion guarantee
- Hospital protocol compliance
- Emergency backup crew availability
- Post-inspection touch-up if needed

Can we schedule a brief 15-minute call today to finalize details? I'm holding crew availability for you through Friday.

Best regards,
[Name]
[Healthcare Facility Specialist]

Now generate an email for the provided customer profile and email type.`;

// Function to get optimized prompt based on operation type
export function getOptimizedPrompt(
  operationType:
    | "extraction"
    | "photo_analysis"
    | "competitive_analysis"
    | "risk_assessment"
    | "follow_up",
  context?: any,
): string {
  switch (operationType) {
    case "extraction":
      return ENHANCED_EXTRACTION_PROMPT;
    case "photo_analysis":
      return ENHANCED_PHOTO_ANALYSIS_PROMPT;
    case "competitive_analysis":
      return ENHANCED_COMPETITIVE_ANALYSIS_PROMPT;
    case "risk_assessment":
      return ENHANCED_RISK_ASSESSMENT_PROMPT;
    case "follow_up":
      return ENHANCED_FOLLOW_UP_PROMPT;
    default:
      return ENHANCED_EXTRACTION_PROMPT;
  }
}

// Chain-of-thought reasoning helpers
export const REASONING_PATTERNS = {
  extraction: [
    "First, I'll identify the customer and their role in the organization.",
    "Next, I'll determine the building characteristics and location.",
    "Then, I'll extract explicit and implicit service requirements.",
    "I'll assess urgency from language cues and timeline mentions.",
    "I'll evaluate budget information and approval status.",
    "Finally, I'll identify potential risks and complexity factors.",
  ],

  photo_analysis: [
    "First, I'll assess the overall building type and condition.",
    "Next, I'll count and measure visible elements systematically.",
    "Then, I'll identify materials and their current condition.",
    "I'll evaluate access challenges and safety requirements.",
    "I'll determine appropriate service recommendations.",
    "Finally, I'll assess complexity and risk factors.",
  ],

  competitive_analysis: [
    "First, I'll identify the competitor and their market positioning.",
    "Next, I'll analyze their service offerings and capabilities.",
    "Then, I'll evaluate their pricing strategy and models.",
    "I'll assess their competitive advantages and weaknesses.",
    "I'll identify market opportunities and threats.",
    "Finally, I'll provide strategic recommendations.",
  ],
};

// Prompt optimization utilities
export function addChainOfThought(
  basePrompt: string,
  operationType: keyof typeof REASONING_PATTERNS,
): string {
  const reasoning = REASONING_PATTERNS[operationType];
  const reasoningSection = reasoning
    .map((step, index) => `${index + 1}. ${step}`)
    .join("\n");

  return `${basePrompt}

CHAIN-OF-THOUGHT REASONING:
Follow this systematic approach:
${reasoningSection}

Think through each step carefully before providing your final analysis.`;
}

export function addFewShotExamples(
  basePrompt: string,
  examples: Array<{ input: string; output: string }>,
): string {
  const exampleSection = examples
    .map(
      (example, index) =>
        `EXAMPLE ${index + 1}:\nInput: ${example.input}\nOutput: ${example.output}`,
    )
    .join("\n\n");

  return `${basePrompt}

EXAMPLES:
${exampleSection}

Now analyze the following input using the same approach:`;
}

export function optimizePromptForAccuracy(basePrompt: string): string {
  return `${basePrompt}

ACCURACY REQUIREMENTS:
- Provide specific, measurable details when possible
- Use industry-standard terminology
- Include confidence scores for estimations
- Flag any assumptions or uncertainties
- Validate outputs against provided examples

QUALITY CHECKS:
- Ensure all required fields are populated
- Verify logical consistency across fields
- Check that recommendations align with identified needs
- Confirm that risk assessments are comprehensive`;
}
