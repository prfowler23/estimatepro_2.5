import { ChatCompletionMessageToolCall } from "openai/resources/chat/completions";
import { toolExecutor, ToolExecutionResult } from "./tool-executor";
import { ToolName } from "./tool-definitions";
import { AIResponseCache } from "../ai-response-cache";

export interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  result: ToolExecutionResult;
}

export class ToolHandler {
  private cache: AIResponseCache;

  constructor() {
    this.cache = AIResponseCache.getInstance();
  }

  async handleToolCalls(
    toolCalls: ChatCompletionMessageToolCall[],
    userId?: string,
  ): Promise<ToolCallResult[]> {
    const results = await Promise.all(
      toolCalls.map(async (toolCall) => {
        return await this.handleSingleToolCall(toolCall, userId);
      }),
    );

    return results;
  }

  private async handleSingleToolCall(
    toolCall: ChatCompletionMessageToolCall,
    userId?: string,
  ): Promise<ToolCallResult> {
    const { id: toolCallId, function: func } = toolCall;
    const toolName = func.name as ToolName;

    try {
      // Parse arguments safely
      let args;
      try {
        args = JSON.parse(func.arguments);
      } catch (parseError) {
        throw new Error(
          `Invalid JSON arguments: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}`,
        );
      }

      // Check cache for similar tool calls
      const cacheKey = `tool:${toolName}:${JSON.stringify(args)}`;
      const cachedResult = await this.cache.get(cacheKey);

      if (cachedResult) {
        return {
          toolCallId,
          toolName,
          result: cachedResult as ToolExecutionResult,
        };
      }

      // Execute tool
      const result = await toolExecutor.execute(toolName, args, userId);

      // Cache successful results
      if (result.success) {
        await this.cache.set(cacheKey, result, 300); // 5 minute cache
      }

      return {
        toolCallId,
        toolName,
        result,
      };
    } catch (error) {
      return {
        toolCallId,
        toolName,
        result: {
          success: false,
          error: `Tool execution error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      };
    }
  }

  formatToolResults(results: ToolCallResult[]): any[] {
    return results.map((result) => ({
      tool_call_id: result.toolCallId,
      role: "tool" as const,
      content: JSON.stringify(
        result.result.success
          ? {
              success: true,
              data: result.result.data,
              metadata: result.result.metadata,
            }
          : {
              success: false,
              error: result.result.error,
            },
      ),
    }));
  }

  generateToolResponseMessage(results: ToolCallResult[]): string {
    const summaries = results.map((result) => {
      if (result.result.success) {
        return `✓ ${result.toolName}: ${this.summarizeSuccess(result.result)}`;
      } else {
        return `✗ ${result.toolName}: ${result.result.error}`;
      }
    });

    return summaries.join("\n");
  }

  private summarizeSuccess(result: ToolExecutionResult): string {
    const { data, metadata } = result;

    if (!metadata?.toolName) {
      return "Operation completed successfully";
    }

    switch (metadata.toolName) {
      case "analyzePhoto":
        return `Analyzed ${metadata.analysisType} - found ${data?.detectedFeatures?.length || 0} features`;

      case "calculateService":
        return `Calculated ${metadata.serviceType} - total: $${data?.totalCost?.toFixed(2) || "0.00"}`;

      case "searchEstimates":
        return `Found ${metadata.resultCount || 0} estimates`;

      case "getWeather":
        return `Weather for ${metadata.location}: ${data?.current?.condition || "Available"}`;

      case "createQuote":
        return `Created quote #${metadata.quoteId} - total: $${metadata.totalAmount?.toFixed(2) || "0.00"}`;

      case "analyzeRisk":
        return `Risk level: ${metadata.riskLevel} with ${metadata.factorCount} factors identified`;

      case "findSimilarProjects":
        return `Found ${metadata.resultCount || 0} similar projects`;

      default:
        return "Operation completed";
    }
  }
}

// Singleton instance
export const toolHandler = new ToolHandler();
