import OpenAI from 'openai';
import { 
  safeAIOperation, 
  mapOpenAIError, 
  checkContentSafety,
  ValidationError,
  AuthenticationError
} from './ai-error-handler';

// Initialize OpenAI client with error handling
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validate API key on module load
if (!process.env.OPENAI_API_KEY) {
  throw new AuthenticationError('OPENAI_API_KEY environment variable is required');
}

// Service type mapping for validation
const VALID_SERVICES = ['PW', 'PWS', 'WC', 'GR', 'FR', 'HD', 'SW', 'PD', 'GRC', 'FC'];

export interface ExtractedData {
  customer: {
    name: string;
    company: string;
    email: string;
    phone: string;
    role: string;
    address: string;
  };
  requirements: {
    services: string[];
    buildingType: string;
    location: string;
    buildingSize: string;
    floors: number;
    specialRequirements: string[];
  };
  timeline: {
    requestedDate: string;
    deadline: string;
    urgency: 'urgent' | 'normal' | 'flexible';
    flexibility: 'none' | 'some' | 'flexible';
  };
  budget: {
    range: string;
    statedAmount: string;
    constraints: string[];
    approved: boolean;
    flexibility: 'tight' | 'normal' | 'flexible';
  };
  decisionMakers: {
    primaryContact: string;
    approvers: string[];
    influencers: string[];
    roles: Record<string, string>;
  };
  redFlags: string[];
  urgencyScore: number; // 1-10
  confidence: number; // 0-1
}

// Base extraction prompt template
const BASE_EXTRACTION_PROMPT = `Extract detailed information from this communication and return a JSON object with the following structure:

{
  "customer": {
    "name": "customer full name",
    "company": "company/organization name",
    "email": "email address",
    "phone": "phone number",
    "role": "job title or role",
    "address": "building or company address"
  },
  "requirements": {
    "services": ["array of service codes: PW, PWS, WC, GR, FR, HD, SW, PD, GRC, FC"],
    "buildingType": "office/retail/industrial/residential/hospital/school/etc",
    "location": "city, state or full address",
    "buildingSize": "square footage or description",
    "floors": number of floors,
    "specialRequirements": ["any special needs, access restrictions, etc"]
  },
  "timeline": {
    "requestedDate": "preferred start date",
    "deadline": "must be completed by date",
    "urgency": "urgent/normal/flexible",
    "flexibility": "none/some/flexible"
  },
  "budget": {
    "range": "budget range if mentioned",
    "statedAmount": "specific amount if mentioned",
    "constraints": ["budget limitations mentioned"],
    "approved": true/false,
    "flexibility": "tight/normal/flexible"
  },
  "decisionMakers": {
    "primaryContact": "main person to contact",
    "approvers": ["people who need to approve"],
    "influencers": ["people who influence decision"],
    "roles": {"name": "role/title"}
  },
  "redFlags": ["potential issues: unrealistic timeline, budget constraints, access issues, safety concerns"],
  "urgencyScore": number from 1-10 based on language and timeline,
  "confidence": number from 0-1 indicating extraction confidence
}

Service Codes Reference:
- PW: Pressure Washing
- PWS: Pressure Wash & Seal  
- WC: Window Cleaning
- GR: Glass Restoration
- FR: Frame Restoration
- HD: High Dusting
- SW: Soft Washing
- PD: Parking Deck Cleaning
- GRC: Granite Reconditioning
- FC: Final Clean

Analyze the content for:
1. Explicit requirements and implicit needs
2. Urgency indicators in language (ASAP, urgent, rush, etc.)
3. Budget sensitivity clues
4. Decision-making complexity
5. Potential project challenges`;

// Email-specific extraction
export async function extractFromEmail(emailContent: string, userId?: string): Promise<ExtractedData> {
  if (!emailContent || emailContent.trim().length === 0) {
    throw new ValidationError('Email content cannot be empty', []);
  }

  return safeAIOperation(
    async () => {
      // Check content safety
      checkContentSafety(emailContent);

      const emailPrompt = `${BASE_EXTRACTION_PROMPT}

SPECIFIC INSTRUCTIONS FOR EMAIL ANALYSIS:
- Parse email headers for sender information
- Look for quoted previous messages in email threads
- Identify forwarded information and original senders
- Pay attention to CC'd individuals as potential decision makers
- Extract building addresses from email signatures
- Note any attachments mentioned (photos, plans, etc.)
- Analyze tone and formality level for urgency assessment

EMAIL CONTENT TO ANALYZE:
${emailContent}`;

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at extracting structured business information from communications. Always return valid JSON.'
            },
            {
              role: 'user',
              content: emailPrompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 2000
        });

        const extractedData = JSON.parse(response.choices[0].message.content || '{}');
        return validateAndEnhanceExtraction(extractedData);
      } catch (error: any) {
        throw mapOpenAIError(error);
      }
    },
    {
      operationName: 'extractFromEmail',
      userId,
      rateLimitKey: userId || 'anonymous',
      validateOutput: (result) => {
        if (!result.customer || !result.requirements) {
          throw new ValidationError('Invalid extraction result structure', []);
        }
        return result;
      }
    }
  );
}

// Meeting transcript extraction
export async function extractFromTranscript(transcriptContent: string): Promise<ExtractedData> {
  const transcriptPrompt = `${BASE_EXTRACTION_PROMPT}

SPECIFIC INSTRUCTIONS FOR MEETING TRANSCRIPT ANALYSIS:
- Identify different speakers and their roles
- Extract action items and commitments made
- Note questions asked and answers given
- Pay attention to concerns raised during discussion
- Identify decision points and who has authority
- Look for building details discussed verbally
- Note any site visit plans or scheduling discussions
- Analyze conversation flow for urgency and priority

MEETING TRANSCRIPT TO ANALYZE:
${transcriptContent}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting business requirements from meeting transcripts and notes. Always return valid JSON.'
        },
        {
          role: 'user',
          content: transcriptPrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2000
    });

    const extractedData = JSON.parse(response.choices[0].message.content || '{}');
    return validateAndEnhanceExtraction(extractedData);
  } catch (error) {
    console.error('Error extracting from transcript:', error);
    throw new Error('Failed to extract information from transcript');
  }
}

// Phone call notes extraction
export async function extractFromPhone(phoneNotes: string): Promise<ExtractedData> {
  const phonePrompt = `${BASE_EXTRACTION_PROMPT}

SPECIFIC INSTRUCTIONS FOR PHONE CALL NOTES ANALYSIS:
- Extract information from conversational summaries
- Look for details that might be incomplete (phone calls often miss details)
- Pay attention to follow-up actions discussed
- Note if customer mentioned sending additional information
- Identify verbal commitments and next steps
- Consider that building details might be limited
- Look for scheduling preferences mentioned
- Analyze urgency based on tone and language described

PHONE CALL NOTES TO ANALYZE:
${phoneNotes}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting business information from phone call summaries and notes. Always return valid JSON.'
        },
        {
          role: 'user',
          content: phonePrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2000
    });

    const extractedData = JSON.parse(response.choices[0].message.content || '{}');
    return validateAndEnhanceExtraction(extractedData);
  } catch (error) {
    console.error('Error extracting from phone notes:', error);
    throw new Error('Failed to extract information from phone notes');
  }
}

// Validation and enhancement of extracted data
function validateAndEnhanceExtraction(data: any): ExtractedData {
  // Ensure all required fields exist with defaults
  const validated: ExtractedData = {
    customer: {
      name: data.customer?.name || '',
      company: data.customer?.company || '',
      email: data.customer?.email || '',
      phone: data.customer?.phone || '',
      role: data.customer?.role || '',
      address: data.customer?.address || ''
    },
    requirements: {
      services: validateServices(data.requirements?.services || []),
      buildingType: data.requirements?.buildingType || '',
      location: data.requirements?.location || '',
      buildingSize: data.requirements?.buildingSize || '',
      floors: Math.max(1, parseInt(data.requirements?.floors) || 1),
      specialRequirements: data.requirements?.specialRequirements || []
    },
    timeline: {
      requestedDate: data.timeline?.requestedDate || '',
      deadline: data.timeline?.deadline || '',
      urgency: validateUrgency(data.timeline?.urgency),
      flexibility: validateFlexibility(data.timeline?.flexibility)
    },
    budget: {
      range: data.budget?.range || '',
      statedAmount: data.budget?.statedAmount || '',
      constraints: data.budget?.constraints || [],
      approved: Boolean(data.budget?.approved),
      flexibility: validateBudgetFlexibility(data.budget?.flexibility)
    },
    decisionMakers: {
      primaryContact: data.decisionMakers?.primaryContact || data.customer?.name || '',
      approvers: data.decisionMakers?.approvers || [],
      influencers: data.decisionMakers?.influencers || [],
      roles: data.decisionMakers?.roles || {}
    },
    redFlags: data.redFlags || [],
    urgencyScore: calculateUrgencyScore(data),
    confidence: Math.min(1, Math.max(0, data.confidence || 0.5))
  };

  return validated;
}

// Validate service codes
function validateServices(services: string[]): string[] {
  return services.filter(service => VALID_SERVICES.includes(service.toUpperCase()));
}

// Validate urgency level
function validateUrgency(urgency: string): 'urgent' | 'normal' | 'flexible' {
  if (['urgent', 'normal', 'flexible'].includes(urgency)) {
    return urgency as 'urgent' | 'normal' | 'flexible';
  }
  return 'normal';
}

// Validate flexibility level
function validateFlexibility(flexibility: string): 'none' | 'some' | 'flexible' {
  if (['none', 'some', 'flexible'].includes(flexibility)) {
    return flexibility as 'none' | 'some' | 'flexible';
  }
  return 'some';
}

// Validate budget flexibility
function validateBudgetFlexibility(flexibility: string): 'tight' | 'normal' | 'flexible' {
  if (['tight', 'normal', 'flexible'].includes(flexibility)) {
    return flexibility as 'tight' | 'normal' | 'flexible';
  }
  return 'normal';
}

// Calculate urgency score based on multiple factors
function calculateUrgencyScore(data: any): number {
  let score = 5; // Base score

  // Timeline urgency
  if (data.timeline?.urgency === 'urgent') score += 3;
  else if (data.timeline?.urgency === 'flexible') score -= 2;

  // Flexibility impact
  if (data.timeline?.flexibility === 'none') score += 2;
  else if (data.timeline?.flexibility === 'flexible') score -= 1;

  // Budget pressure
  if (data.budget?.flexibility === 'tight') score += 1;
  if (data.budget?.constraints?.length > 0) score += 1;

  // Language indicators (from original content analysis)
  const urgentKeywords = ['asap', 'urgent', 'rush', 'immediately', 'emergency'];
  const content = JSON.stringify(data).toLowerCase();
  const urgentMatches = urgentKeywords.filter(keyword => content.includes(keyword));
  score += urgentMatches.length;

  // Decision maker complexity
  if (data.decisionMakers?.approvers?.length > 2) score -= 1;

  // Clamp score between 1 and 10
  return Math.min(10, Math.max(1, Math.round(score)));
}

// PDF/Document extraction
export async function extractFromDocument(documentContent: string, documentType: 'pdf' | 'rfp' | 'contract' | 'plans'): Promise<ExtractedData> {
  const documentPrompt = `${BASE_EXTRACTION_PROMPT}

SPECIFIC INSTRUCTIONS FOR DOCUMENT ANALYSIS:
- Extract structured information from ${documentType.toUpperCase()} documents
- Look for technical specifications and requirements
- Identify scope of work sections
- Extract project timelines and milestones
- Parse pricing information and budget constraints
- Identify compliance and regulatory requirements
- Look for architectural details and building specifications
- Extract contact information from headers/footers
- Pay attention to legal terms and conditions
- Note any quality standards or certifications required

DOCUMENT TYPE: ${documentType.toUpperCase()}
DOCUMENT CONTENT TO ANALYZE:
${documentContent}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting structured business information from formal documents. Focus on technical requirements, compliance needs, and project specifications. Always return valid JSON.'
        },
        {
          role: 'user',
          content: documentPrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2500
    });

    const extractedData = JSON.parse(response.choices[0].message.content || '{}');
    return validateAndEnhanceExtraction(extractedData);
  } catch (error) {
    console.error(`Error extracting from ${documentType}:`, error);
    throw new Error(`Failed to extract information from ${documentType}`);
  }
}

// OCR text extraction from images
export async function extractFromImageOCR(imageUrl: string, imageType: 'document' | 'sign' | 'form' | 'note'): Promise<ExtractedData> {
  const ocrPrompt = `${BASE_EXTRACTION_PROMPT}

SPECIFIC INSTRUCTIONS FOR IMAGE OCR ANALYSIS:
- Extract all readable text from the image
- Interpret handwritten text where possible
- Look for forms, signatures, and official documents
- Extract contact information from business cards or letterheads
- Identify building addresses and property information
- Parse pricing information from quotes or invoices
- Look for project requirements in written notes
- Extract dates and scheduling information
- Identify safety requirements or restrictions
- Note any quality standards or specifications

IMAGE TYPE: ${imageType.toUpperCase()}
Analyze this image and extract all readable text and relevant business information.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at reading text from images and extracting structured business information. Process both printed and handwritten text. Always return valid JSON.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: ocrPrompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2500
    });

    const extractedData = JSON.parse(response.choices[0].message.content || '{}');
    return validateAndEnhanceExtraction(extractedData);
  } catch (error) {
    console.error(`Error extracting from ${imageType} image:`, error);
    throw new Error(`Failed to extract information from ${imageType} image`);
  }
}

// Competitive analysis from competitor quotes/proposals
export async function extractCompetitiveIntelligence(competitorContent: string): Promise<{
  extraction: ExtractedData;
  competitive: {
    competitors: string[];
    pricingStrategy: string;
    serviceOfferings: string[];
    strengthsWeaknesses: string[];
    marketRates: Record<string, string>;
    differentiators: string[];
    threats: string[];
    opportunities: string[];
  };
}> {
  const competitivePrompt = `Analyze this competitor document/quote and extract both standard project information AND competitive intelligence.

Return JSON with two main sections:
1. "extraction" - standard project extraction using the format above
2. "competitive" - competitive analysis with this structure:

{
  "extraction": ${BASE_EXTRACTION_PROMPT},
  "competitive": {
    "competitors": ["list of competitor companies mentioned"],
    "pricingStrategy": "pricing approach observed (premium, competitive, discount, value-based)",
    "serviceOfferings": ["services they offer that we might not"],
    "strengthsWeaknesses": ["observed competitive advantages/disadvantages"],
    "marketRates": {"service": "price range observed"},
    "differentiators": ["unique selling points they emphasize"],
    "threats": ["competitive threats to our business"],
    "opportunities": ["market gaps we could exploit"]
  }
}

COMPETITIVE CONTENT TO ANALYZE:
${competitorContent}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a competitive intelligence analyst specializing in building services. Extract both project details and strategic market insights. Always return valid JSON.'
        },
        {
          role: 'user',
          content: competitivePrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 3000
    });

    const analysisData = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      extraction: validateAndEnhanceExtraction(analysisData.extraction || {}),
      competitive: {
        competitors: analysisData.competitive?.competitors || [],
        pricingStrategy: analysisData.competitive?.pricingStrategy || '',
        serviceOfferings: analysisData.competitive?.serviceOfferings || [],
        strengthsWeaknesses: analysisData.competitive?.strengthsWeaknesses || [],
        marketRates: analysisData.competitive?.marketRates || {},
        differentiators: analysisData.competitive?.differentiators || [],
        threats: analysisData.competitive?.threats || [],
        opportunities: analysisData.competitive?.opportunities || []
      }
    };
  } catch (error) {
    console.error('Error extracting competitive intelligence:', error);
    throw new Error('Failed to extract competitive intelligence');
  }
}

// Enhanced risk assessment
export async function performRiskAssessment(extractedData: ExtractedData, projectContext?: string): Promise<{
  riskScore: number; // 1-10 (10 = highest risk)
  riskFactors: Array<{
    category: string;
    risk: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    mitigation: string;
  }>;
  recommendations: string[];
  pricing_adjustments: Record<string, number>; // Service code -> multiplier
}> {
  const riskPrompt = `Analyze this project data for potential risks and provide a comprehensive risk assessment:

PROJECT DATA: ${JSON.stringify(extractedData, null, 2)}
ADDITIONAL CONTEXT: ${projectContext || 'None provided'}

Provide a detailed risk analysis with this JSON structure:
{
  "riskScore": number from 1-10 (10 = highest risk),
  "riskFactors": [
    {
      "category": "timeline|budget|technical|safety|weather|access|regulatory|customer",
      "risk": "specific risk description",
      "severity": "low|medium|high|critical",
      "mitigation": "recommended mitigation strategy"
    }
  ],
  "recommendations": ["strategic recommendations for this project"],
  "pricing_adjustments": {"service_code": multiplier_number}
}

Consider these risk categories:
- Timeline risks (unrealistic deadlines, seasonal constraints)
- Budget risks (tight budgets, payment terms, scope creep)
- Technical risks (complex requirements, specialized equipment)
- Safety risks (height work, chemical exposure, confined spaces)
- Weather risks (seasonal weather, outdoor work exposure)
- Access risks (restricted access, security requirements)
- Regulatory risks (permits, compliance, inspections)
- Customer risks (decision complexity, change requests)`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a risk assessment expert for building services projects. Provide thorough analysis of project risks and mitigation strategies.'
        },
        {
          role: 'user',
          content: riskPrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2500
    });

    const riskData = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      riskScore: Math.min(10, Math.max(1, riskData.riskScore || 5)),
      riskFactors: riskData.riskFactors || [],
      recommendations: riskData.recommendations || [],
      pricing_adjustments: riskData.pricing_adjustments || {}
    };
  } catch (error) {
    console.error('Error performing risk assessment:', error);
    throw new Error('Failed to perform risk assessment');
  }
}

// Generic extraction function that routes to appropriate method
export async function extractFromContent(
  content: string, 
  type: 'email' | 'meeting' | 'phone' | 'walkin' | 'pdf' | 'rfp' | 'contract' | 'plans'
): Promise<ExtractedData> {
  switch (type) {
    case 'email':
      return extractFromEmail(content);
    case 'meeting':
      return extractFromTranscript(content);
    case 'phone':
      return extractFromPhone(content);
    case 'walkin':
      return extractFromPhone(content); // Use phone extraction for walk-in notes
    case 'pdf':
    case 'rfp':
    case 'contract':
    case 'plans':
      return extractFromDocument(content, type);
    default:
      throw new Error(`Unsupported extraction type: ${type}`);
  }
}