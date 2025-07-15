import OpenAI from 'openai';
import { ExtractedData } from './extraction';
import { FinalEstimate } from '../types/estimate-types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Follow-up automation interfaces
export interface FollowUpRequest {
  extractedData: ExtractedData;
  quote?: FinalEstimate;
  previousInteractions?: Array<{
    type: 'email' | 'call' | 'meeting' | 'quote_sent';
    date: string;
    summary: string;
    response?: string;
  }>;
  customerBehavior?: {
    emailOpenRate?: number;
    websiteVisits?: number;
    quotesRequested?: number;
    averageResponseTime?: number;
  };
}

export interface FollowUpPlan {
  strategy: 'aggressive' | 'moderate' | 'gentle' | 'minimal';
  timeline: FollowUpAction[];
  personalization: {
    tone: string;
    keyPoints: string[];
    objectionHandling: string[];
  };
  alternativeChannels: string[];
  escalationTriggers: string[];
}

export interface FollowUpAction {
  id: string;
  type: 'email' | 'call' | 'text' | 'proposal_update' | 'meeting_request';
  scheduledDate: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  content: {
    subject?: string;
    body: string;
    attachments?: string[];
    callScript?: string;
  };
  conditions: string[];
  objectives: string[];
  successMetrics: string[];
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  tone: string;
  personalization: string[];
  attachments: string[];
  followUpDate: Date;
  objectives: string[];
}

// Main follow-up automation function
export async function generateFollowUpPlan(request: FollowUpRequest): Promise<FollowUpPlan> {
  try {
    const strategy = determineFollowUpStrategy(request);
    const timeline = await generateFollowUpTimeline(request, strategy);
    const personalization = await generatePersonalization(request);
    
    return {
      strategy,
      timeline,
      personalization,
      alternativeChannels: determineAlternativeChannels(request),
      escalationTriggers: determineEscalationTriggers(request)
    };
  } catch (error) {
    console.error('Error generating follow-up plan:', error);
    throw new Error('Failed to generate follow-up plan');
  }
}

// Generate personalized follow-up email
export async function generateFollowUpEmail(
  request: FollowUpRequest,
  emailType: 'initial' | 'reminder' | 'value_add' | 'objection_handling' | 'final',
  previousEmails?: string[]
): Promise<GeneratedEmail> {
  
  const context = buildEmailContext(request, emailType, previousEmails);
  
  const prompt = `Generate a personalized follow-up email for this prospect:

CONTEXT: ${context}

EMAIL TYPE: ${emailType}

Generate a professional, engaging email with this JSON structure:
{
  "subject": "compelling subject line",
  "body": "complete email body with proper formatting",
  "tone": "professional|friendly|urgent|consultative",
  "personalization": ["personalized elements included"],
  "attachments": ["suggested attachments"],
  "followUpDate": "suggested next follow-up date",
  "objectives": ["primary objectives of this email"]
}

Guidelines:
- Reference specific project details from their requirements
- Address their urgency level and timeline appropriately
- Include relevant value propositions
- Handle any objections based on their profile
- Maintain appropriate tone for their business type
- Include clear call-to-action
- Avoid being pushy or overly sales-focused`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert sales copywriter specializing in building services. Create engaging, personalized follow-up emails that build relationships and drive action.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000
    });

    const emailData = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      subject: emailData.subject || 'Follow-up on Your Service Request',
      body: emailData.body || '',
      tone: emailData.tone || 'professional',
      personalization: emailData.personalization || [],
      attachments: emailData.attachments || [],
      followUpDate: new Date(emailData.followUpDate || Date.now() + 3 * 24 * 60 * 60 * 1000),
      objectives: emailData.objectives || []
    };
  } catch (error) {
    console.error('Error generating follow-up email:', error);
    throw new Error('Failed to generate follow-up email');
  }
}

// Generate call script
export async function generateCallScript(
  request: FollowUpRequest,
  callType: 'initial' | 'follow_up' | 'objection_handling' | 'closing'
): Promise<{
  script: string;
  talkingPoints: string[];
  objectionHandling: Record<string, string>;
  questions: string[];
  closeAttempts: string[];
}> {
  
  const prompt = `Generate a call script for this prospect:

CUSTOMER DATA: ${JSON.stringify(request.extractedData, null, 2)}
CALL TYPE: ${callType}
PREVIOUS INTERACTIONS: ${JSON.stringify(request.previousInteractions || [], null, 2)}

Create a comprehensive call script with this JSON structure:
{
  "script": "full call script with opening, body, and closing",
  "talkingPoints": ["key points to emphasize"],
  "objectionHandling": {
    "price_concern": "response to price objections",
    "timing_issue": "response to timing concerns",
    "authority_question": "response to decision-maker questions",
    "competitor_comparison": "response to competitor mentions"
  },
  "questions": ["discovery questions to ask"],
  "closeAttempts": ["different ways to ask for the business"]
}

Include:
- Natural conversation flow
- Specific project references
- Value proposition aligned with their needs
- Objection handling for common concerns
- Multiple closing opportunities
- Next step commitments`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a sales expert creating call scripts for building services sales. Focus on consultative selling and relationship building.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2500
    });

    const scriptData = JSON.parse(response.choices[0].message.content || '{}');
    return scriptData;
  } catch (error) {
    console.error('Error generating call script:', error);
    throw new Error('Failed to generate call script');
  }
}

// Analyze customer engagement and suggest next actions
export async function analyzeEngagement(
  request: FollowUpRequest,
  recentActivity?: Array<{
    type: string;
    timestamp: string;
    details: string;
  }>
): Promise<{
  engagementScore: number; // 0-100
  behaviorInsights: string[];
  recommendedActions: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    timing: string;
    rationale: string;
  }>;
  riskFactors: string[];
  opportunities: string[];
}> {
  
  const prompt = `Analyze customer engagement and recommend next actions:

CUSTOMER DATA: ${JSON.stringify(request.extractedData, null, 2)}
INTERACTIONS: ${JSON.stringify(request.previousInteractions || [], null, 2)}
BEHAVIOR DATA: ${JSON.stringify(request.customerBehavior || {}, null, 2)}
RECENT ACTIVITY: ${JSON.stringify(recentActivity || [], null, 2)}

Provide engagement analysis with this JSON structure:
{
  "engagementScore": score 0-100 based on overall engagement,
  "behaviorInsights": ["insights about customer behavior patterns"],
  "recommendedActions": [
    {
      "action": "specific action to take",
      "priority": "low|medium|high",
      "timing": "when to take this action",
      "rationale": "why this action is recommended"
    }
  ],
  "riskFactors": ["factors that could lead to lost opportunity"],
  "opportunities": ["opportunities to advance the sale"]
}

Consider:
- Response patterns and timing
- Engagement with quotes and proposals
- Communication preferences
- Decision-making timeline
- Budget and authority indicators
- Competitive situation`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a sales analytics expert specializing in customer engagement analysis and sales strategy recommendations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2000
    });

    const analysisData = JSON.parse(response.choices[0].message.content || '{}');
    return analysisData;
  } catch (error) {
    console.error('Error analyzing engagement:', error);
    throw new Error('Failed to analyze customer engagement');
  }
}

// Generate proposal updates based on feedback
export async function generateProposalUpdate(
  originalQuote: FinalEstimate,
  feedback: string,
  customerConcerns: string[]
): Promise<{
  updatedQuote: Partial<FinalEstimate>;
  changes: Array<{
    section: string;
    originalValue: string;
    newValue: string;
    rationale: string;
  }>;
  coverLetter: string;
  negotiationPoints: string[];
}> {
  
  const prompt = `Update this proposal based on customer feedback:

ORIGINAL QUOTE: ${JSON.stringify(originalQuote, null, 2)}
CUSTOMER FEEDBACK: ${feedback}
CUSTOMER CONCERNS: ${JSON.stringify(customerConcerns, null, 2)}

Generate proposal updates with this JSON structure:
{
  "updatedQuote": {
    "summary": updated summary if needed,
    "services": updated services if needed,
    "timeline": updated timeline if needed,
    "terms": updated terms if needed
  },
  "changes": [
    {
      "section": "area that was changed",
      "originalValue": "original value",
      "newValue": "new value",
      "rationale": "business reason for the change"
    }
  ],
  "coverLetter": "professional cover letter explaining changes",
  "negotiationPoints": ["key points for negotiation discussion"]
}

Consider:
- Address specific customer concerns
- Maintain profitability while being competitive
- Offer value-added alternatives
- Preserve key terms where possible
- Create win-win solutions`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a proposal specialist who creates compelling updates that address customer concerns while maintaining business objectives.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2500
    });

    const updateData = JSON.parse(response.choices[0].message.content || '{}');
    return updateData;
  } catch (error) {
    console.error('Error generating proposal update:', error);
    throw new Error('Failed to generate proposal update');
  }
}

// Helper functions
function determineFollowUpStrategy(request: FollowUpRequest): 'aggressive' | 'moderate' | 'gentle' | 'minimal' {
  const urgencyScore = request.extractedData.urgencyScore;
  const budget = request.extractedData.budget;
  
  if (urgencyScore >= 8 && budget.approved) return 'aggressive';
  if (urgencyScore >= 6 || budget.flexibility === 'flexible') return 'moderate';
  if (urgencyScore <= 4 || budget.flexibility === 'tight') return 'gentle';
  return 'minimal';
}

async function generateFollowUpTimeline(request: FollowUpRequest, strategy: string): Promise<FollowUpAction[]> {
  const baseDate = new Date();
  const actions: FollowUpAction[] = [];
  
  // Generate timeline based on strategy
  const intervals = {
    'aggressive': [1, 3, 7, 14, 30],
    'moderate': [2, 7, 14, 30, 60],
    'gentle': [3, 10, 21, 45, 90],
    'minimal': [7, 21, 60, 120]
  };
  
  const scheduleIntervals = intervals[strategy as keyof typeof intervals] || intervals.moderate;
  
  scheduleIntervals.forEach((days, index) => {
    const scheduledDate = new Date(baseDate);
    scheduledDate.setDate(baseDate.getDate() + days);
    
    actions.push({
      id: `followup-${index + 1}`,
      type: index === 0 ? 'email' : (index % 2 === 0 ? 'email' : 'call'),
      scheduledDate,
      priority: index < 2 ? 'high' : 'medium',
      content: {
        body: '', // To be generated when action is executed
      },
      conditions: [`No response from previous ${index > 0 ? 'contact' : 'quote'}`],
      objectives: [`Advance opportunity to next stage`],
      successMetrics: [`Response within 48 hours`]
    });
  });
  
  return actions;
}

async function generatePersonalization(request: FollowUpRequest) {
  return {
    tone: determineTone(request.extractedData),
    keyPoints: extractKeyPoints(request.extractedData),
    objectionHandling: generateObjectionHandling(request.extractedData)
  };
}

function determineTone(data: ExtractedData): string {
  if (data.requirements.buildingType === 'hospital' || data.requirements.buildingType === 'school') {
    return 'professional and safety-focused';
  }
  if (data.urgencyScore >= 8) {
    return 'responsive and solution-oriented';
  }
  return 'consultative and relationship-building';
}

function extractKeyPoints(data: ExtractedData): string[] {
  const points = [];
  
  if (data.urgencyScore >= 7) {
    points.push('Quick response to urgent timeline');
  }
  
  if (data.requirements.specialRequirements.length > 0) {
    points.push('Expertise in specialized requirements');
  }
  
  points.push(`Experience with ${data.requirements.buildingType} buildings`);
  points.push('Comprehensive service offering');
  
  return points;
}

function generateObjectionHandling(data: ExtractedData): string[] {
  const objections = [];
  
  if (data.budget.flexibility === 'tight') {
    objections.push('Value-focused pricing discussion');
  }
  
  if (data.timeline.urgency === 'urgent') {
    objections.push('Capacity and scheduling assurance');
  }
  
  objections.push('Quality and safety standards emphasis');
  objections.push('References and case studies');
  
  return objections;
}

function determineAlternativeChannels(request: FollowUpRequest): string[] {
  const channels = ['email', 'phone'];
  
  if (request.extractedData.customer.company) {
    channels.push('linkedin');
  }
  
  if (request.extractedData.urgencyScore >= 8) {
    channels.push('text', 'in-person');
  }
  
  return channels;
}

function determineEscalationTriggers(request: FollowUpRequest): string[] {
  return [
    'No response after 3 attempts',
    'Price objection raised',
    'Timeline concerns expressed',
    'Competitor mentioned',
    'Decision delayed beyond original timeline'
  ];
}

function buildEmailContext(request: FollowUpRequest, emailType: string, previousEmails?: string[]): string {
  return `
Customer: ${request.extractedData.customer.name} at ${request.extractedData.customer.company}
Building: ${request.extractedData.requirements.buildingType} - ${request.extractedData.requirements.buildingSize}
Services: ${request.extractedData.requirements.services.join(', ')}
Urgency: ${request.extractedData.urgencyScore}/10
Timeline: ${request.extractedData.timeline.urgency}
Budget: ${request.extractedData.budget.flexibility}
Previous Interactions: ${request.previousInteractions?.length || 0}
Email Type: ${emailType}
  `.trim();
}