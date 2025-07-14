import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
export async function extractFromEmail(emailContent: string): Promise<ExtractedData> {
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
  } catch (error) {
    console.error('Error extracting from email:', error);
    throw new Error('Failed to extract information from email');
  }
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

// Generic extraction function that routes to appropriate method
export async function extractFromContent(
  content: string, 
  type: 'email' | 'meeting' | 'phone' | 'walkin'
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
    default:
      throw new Error(`Unsupported extraction type: ${type}`);
  }
}