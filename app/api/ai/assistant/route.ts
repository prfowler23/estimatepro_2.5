import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { openai } from "@/lib/ai/openai";
import { getUser } from "@/lib/auth/server";
import { withAIRetry } from "@/lib/utils/retry-logic";
import {
  securityScanner,
  outputValidator,
  SafetyLevel,
} from "@/lib/ai/ai-security";
import { AIConversationService } from "@/lib/services/ai-conversation-service";
import { getAIConfig } from "@/lib/ai/ai-config";
import { aiRequestQueue } from "@/lib/ai/request-queue";
import { ErrorResponses, logApiError } from "@/lib/api/error-responses";
import { validateRequestBody } from "@/lib/validation/api-schemas";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Zod schema for request validation
const assistantRequestSchema = z.object({
  message: z.string().min(1).max(4000, "Message too long"),
  context: z.record(z.unknown()).optional(),
  mode: z
    .enum(["general", "estimation", "technical", "business"])
    .default("general"),
  conversationId: z.string().uuid().optional(),
});

type AssistantRequest = z.infer<typeof assistantRequestSchema>;

interface AssistantResponse {
  response: string;
  conversationId?: string;
  mode: AssistantRequest["mode"];
  usage: {
    tokensUsed?: number;
    message: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check if AI is available
    const aiConfig = getAIConfig();
    if (!aiConfig.isAIAvailable()) {
      return ErrorResponses.serviceUnavailable("AI service");
    }

    const user = await getUser();
    if (!user) {
      return ErrorResponses.unauthorized();
    }

    // Validate request body with Zod
    const { data: requestBody, error: validationError } =
      await validateRequestBody(request, assistantRequestSchema);

    if (validationError || !requestBody) {
      return ErrorResponses.badRequest(validationError || "Invalid request");
    }

    const { message, context, mode = "general", conversationId } = requestBody;

    // Comprehensive security scan
    const scanResult = securityScanner.scanContent(
      message,
      SafetyLevel.MODERATE,
    );
    if (!scanResult.safe) {
      return ErrorResponses.badRequest(
        `Input failed security scan: ${scanResult.violations.join(", ")}`,
        { riskScore: scanResult.risk_score },
      );
    }

    // Additional context validation if provided
    if (context) {
      const contextStr = JSON.stringify(context);
      const contextScan = securityScanner.scanContent(
        contextStr,
        SafetyLevel.MODERATE,
      );
      if (!contextScan.safe) {
        return ErrorResponses.badRequest("Context contains unsafe content", {
          violations: contextScan.violations,
        });
      }
    }

    const configManager = getAIConfig();
    const aiConfiguration = configManager.getAIConfig();

    const result = await withAIRetry(async () => {
      const systemPrompt = getSystemPrompt(mode);

      // Get conversation context if conversationId provided
      let conversationHistory: ChatCompletionMessageParam[] = [];
      if (conversationId) {
        try {
          const contextMessages =
            await AIConversationService.getConversationContext(
              conversationId,
              user.id,
              5, // Get last 5 message pairs
            );
          conversationHistory = contextMessages.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          }));
        } catch (error) {
          console.warn("Failed to fetch conversation context:", error);
        }
      }

      // Build messages array with conversation history
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: systemPrompt,
        },
        ...conversationHistory,
      ];

      // Add context if provided
      const contextSuffix = context
        ? `\n\nContext: ${JSON.stringify(context)}`
        : "";

      // Add current user message
      messages.push({
        role: "user",
        content: `${message}${contextSuffix}`,
      });

      const completion = await aiRequestQueue.add(
        "openai",
        () =>
          openai.chat.completions.create({
            model: aiConfiguration.defaultModel,
            messages,
            max_tokens: aiConfiguration.maxTokens,
            temperature: aiConfiguration.temperature,
          }),
        1, // Priority 1 for chat completions
      );

      const response =
        completion.choices[0]?.message?.content ||
        "I apologize, but I couldn't generate a response.";

      // Return both response and token usage
      return {
        response,
        tokensUsed: completion.usage?.total_tokens,
      };
    });

    if (!result.success) {
      return ErrorResponses.aiServiceError(
        "AI service temporarily unavailable",
      );
    }

    // Comprehensive output validation and sanitization
    const aiResponse = result.data?.response || "";
    const outputScan = outputValidator.scanOutput(aiResponse);
    if (!outputScan.safe) {
      console.error("AI response contains unsafe content:", outputScan.issues);
      // Filter the response instead of just logging
      const sanitized = securityScanner.scanContent(
        aiResponse,
        SafetyLevel.STRICT,
      );
      if (!sanitized.safe) {
        return ErrorResponses.internalError(
          "AI response contained unsafe content and was blocked",
        );
      }
      // Use the sanitized version
      if (result.data) result.data.response = sanitized.sanitized;
    }

    // Save the interaction to conversation history
    let savedConversation;
    try {
      const { conversation } = await AIConversationService.saveInteraction(
        user.id,
        message,
        result.data?.response || "",
        conversationId,
        {
          mode,
          tokensUsed: result.data?.tokensUsed,
          model: aiConfiguration.defaultModel,
        },
      );
      savedConversation = conversation;
    } catch (error) {
      console.error("Failed to save conversation:", error);
      // Continue without saving - don't fail the request
    }

    const response: AssistantResponse = {
      response: result.data.response,
      conversationId: savedConversation?.id || conversationId,
      mode,
      usage: {
        tokensUsed: result.data.tokensUsed,
        message: "AI assistant response generated successfully",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logApiError(error, {
      endpoint: "/api/ai/assistant",
      method: "POST",
    });
    return ErrorResponses.internalError();
  }
}

function getSystemPrompt(mode: AssistantRequest["mode"]): string {
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
