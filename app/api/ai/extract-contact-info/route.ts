import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/ai/openai';
import { authenticateRequest } from '@/lib/auth/server';
import { aiRateLimiter } from '@/lib/utils/rate-limit';
import { contactExtractionSchema, validateRequest, sanitizeObject } from '@/lib/schemas/api-validation';

const EXTRACTION_PROMPT = `
You are an AI assistant that extracts structured information from contact communications (emails, meeting notes, phone calls, etc.) for building services estimation.

Extract the following information from the provided content and return it in this exact JSON format:

{
  "customer": {
    "name": "string",
    "company": "string", 
    "email": "string",
    "phone": "string",
    "address": "string"
  },
  "requirements": {
    "services": ["array of mentioned services"],
    "buildingType": "string (office, retail, warehouse, etc.)",
    "buildingSize": "string (sq ft, floors, etc.)",
    "floors": "number"
  },
  "timeline": {
    "requestedDate": "string",
    "flexibility": "none|some|flexible",
    "urgency": "low|medium|high"
  },
  "budget": {
    "range": "string",
    "constraints": ["array of budget constraints"],
    "approved": "boolean"
  },
  "decisionMakers": {
    "primaryContact": "string",
    "approvers": ["array of decision makers"],
    "influencers": ["array of influencers"]
  },
  "urgencyScore": "number from 1-10"
}

Guidelines:
- If information is not provided, use reasonable defaults or "Not specified"
- For services, look for: window cleaning, pressure washing, soft washing, biofilm removal, glass restoration, frame restoration, high dusting, final clean, granite reconditioning, pressure wash & seal, parking deck cleaning
- Building types: office, retail, warehouse, medical, educational, industrial, residential, mixed-use
- Urgency score: 1-3 = low, 4-6 = medium, 7-8 = high, 9-10 = emergency
- Budget approved: true if budget is confirmed/approved, false if pending or not mentioned
- Be conservative with red flags - only flag genuine concerns
`;

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('User authenticated successfully:', user.id);

    // Apply rate limiting
    const rateLimitResult = await aiRateLimiter(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.retryAfter || 0) / 1000).toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          }
        }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'AI service is not properly configured' },
        { status: 500 }
      );
    }

    const requestBody = await request.json();
    
    // Validate and sanitize input
    const validation = validateRequest(contactExtractionSchema, requestBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { content, contactMethod } = sanitizeObject(validation.data!);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: EXTRACTION_PROMPT
        },
        {
          role: 'user',
          content: `Contact Method: ${contactMethod}\n\nContent:\n${content}`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }).catch((error) => {
      console.error('OpenAI API Error:', error);
      if (error.status === 401) {
        throw new Error('OpenAI API authentication failed. Please check your API key.');
      }
      if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      }
      throw error;
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let extractedData;
    try {
      extractedData = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse extracted information' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      extractedData,
      rawResponse: response
    });

  } catch (error) {
    console.error('Error extracting contact information:', error);
    
    // Return more specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Failed to extract contact information';
    const statusCode = errorMessage.includes('authentication failed') ? 401 : 500;
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}