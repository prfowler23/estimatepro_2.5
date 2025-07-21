import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/ai/openai";
import { getUser } from "@/lib/auth/server";
import { withAIRetry } from "@/lib/utils/retry-logic";
import { validateAIInput, sanitizeAIResponse } from "@/lib/ai/ai-security";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, context, mode = "general" } = await request.json();

    // Validate input
    const validation = validateAIInput({ message, context });
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await withAIRetry(async () => {
      const systemPrompt = getSystemPrompt(mode);
      const contextPrompt = context
        ? `\n\nContext: ${JSON.stringify(context)}`
        : "";

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `${message}${contextPrompt}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      return (
        completion.choices[0]?.message?.content ||
        "I apologize, but I couldn't generate a response."
      );
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "AI service temporarily unavailable" },
        { status: 503 },
      );
    }

    // Sanitize response
    const sanitizedResponse = sanitizeAIResponse(result.data);

    return NextResponse.json({
      response: sanitizedResponse,
      mode,
      usage: "AI assistant response generated successfully",
    });
  } catch (error) {
    console.error("AI Assistant error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function getSystemPrompt(mode: string): string {
  const basePrompt =
    "You are an AI assistant for EstimatePro, a building services estimation platform. You help users with creating estimates, understanding services, and providing guidance on building cleaning and maintenance projects.";

  switch (mode) {
    case "estimation":
      return `${basePrompt} Focus on helping with estimation calculations, service recommendations, and pricing guidance.`;
    case "technical":
      return `${basePrompt} Provide technical guidance on building cleaning methods, equipment, and safety requirements.`;
    case "business":
      return `${basePrompt} Help with business aspects like pricing strategies, client communication, and project management.`;
    default:
      return basePrompt;
  }
}
