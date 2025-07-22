import { NextRequest } from "next/server";
import { enhancedOpenAI } from "@/lib/ai/openai";
import { aiHandler } from "@/lib/api/api-handler";
import {
  contactExtractionSchema,
  sanitizeObject,
} from "@/lib/schemas/api-validation";
import { z } from "zod";

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
  "urgencyScore": "number from 1-10",
  "confidence": "number from 0.0-1.0"
}

Guidelines:
- If information is not provided, use reasonable defaults or "Not specified"
- For services, look for: window cleaning, pressure washing, soft washing, biofilm removal, glass restoration, frame restoration, high dusting, final clean, granite reconditioning, pressure wash & seal, parking deck cleaning
- Building types: office, retail, warehouse, medical, educational, industrial, residential, mixed-use
- Urgency score: 1-3 = low, 4-6 = medium, 7-8 = high, 9-10 = emergency
- Budget approved: true if budget is confirmed/approved, false if pending or not mentioned
- Confidence: overall confidence in the extraction accuracy (0.0-1.0)
- Be conservative with red flags - only flag genuine concerns
`;

async function handleContactExtraction(
  data: z.infer<typeof contactExtractionSchema>,
  context: any,
) {
  const { content, contactMethod = "other" } = sanitizeObject(data);

  const messages = [
    {
      role: "system" as const,
      content: EXTRACTION_PROMPT,
    },
    {
      role: "user" as const,
      content: `Contact Method: ${contactMethod}\n\nContent:\n${content}`,
    },
  ];

  const completion = await enhancedOpenAI.createChatCompletion(messages, {
    model: "gpt-4",
    temperature: 0.1,
    maxTokens: 2000,
    context: "contact_extraction",
  });

  const response = completion.choices[0]?.message?.content;

  if (!response) {
    throw new Error("No response from AI");
  }

  // Parse the JSON response
  let extractedData;
  try {
    extractedData = JSON.parse(response);
  } catch (parseError) {
    throw new Error("Failed to parse extracted information");
  }

  return {
    extractedData,
    rawResponse: response,
    processedAt: new Date().toISOString(),
  };
}

export const POST = (request: NextRequest) =>
  aiHandler(request, contactExtractionSchema, handleContactExtraction);
