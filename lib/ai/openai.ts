import OpenAI from "openai";
import {
  createAIServiceError,
  createNetworkError,
} from "@/lib/error/error-types";

// Configuration
const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  defaultModel: "gpt-4-1106-preview",
  maxTokens: 4096,
  temperature: 0.1,
} as const;

// Validate configuration
if (!OPENAI_CONFIG.apiKey) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

// Create OpenAI client with enhanced configuration
export const openai = new OpenAI({
  apiKey: OPENAI_CONFIG.apiKey,
  timeout: OPENAI_CONFIG.timeout,
  maxRetries: OPENAI_CONFIG.maxRetries,
});

// Enhanced OpenAI client with error handling and streaming support
export class EnhancedOpenAIClient {
  private client: OpenAI;
  private requestCount = 0;
  private lastRequestTime = 0;

  constructor() {
    this.client = openai;
  }

  // Chat completion with error handling
  async createChatCompletion(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: false;
      tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
      context?: string;
    },
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    try {
      this.trackRequest();

      const response = await this.client.chat.completions.create({
        model: options?.model || OPENAI_CONFIG.defaultModel,
        messages,
        temperature: options?.temperature || OPENAI_CONFIG.temperature,
        max_tokens: options?.maxTokens || OPENAI_CONFIG.maxTokens,
        stream: false,
        tools: options?.tools,
      });

      return response;
    } catch (error: any) {
      throw this.handleError(error, options?.context);
    }
  }

  // Streaming chat completion
  async createStreamingChatCompletion(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
      context?: string;
    },
  ): Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    try {
      this.trackRequest();

      const stream = await this.client.chat.completions.create({
        model: options?.model || OPENAI_CONFIG.defaultModel,
        messages,
        temperature: options?.temperature || OPENAI_CONFIG.temperature,
        max_tokens: options?.maxTokens || OPENAI_CONFIG.maxTokens,
        stream: true,
        tools: options?.tools,
      });

      return stream;
    } catch (error: any) {
      throw this.handleError(error, options?.context);
    }
  }

  // Vision analysis (for image analysis)
  async analyzeImage(
    imageUrl: string,
    prompt: string,
    options?: {
      model?: string;
      maxTokens?: number;
      context?: string;
    },
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    try {
      this.trackRequest();

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ];

      const response = await this.client.chat.completions.create({
        model: options?.model || "gpt-4-vision-preview",
        messages,
        max_tokens: options?.maxTokens || OPENAI_CONFIG.maxTokens,
      });

      return response;
    } catch (error: any) {
      throw this.handleError(error, options?.context);
    }
  }

  // Function calling with tools
  async callFunction(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools: OpenAI.Chat.Completions.ChatCompletionTool[],
    options?: {
      model?: string;
      context?: string;
    },
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    try {
      this.trackRequest();

      const response = await this.client.chat.completions.create({
        model: options?.model || OPENAI_CONFIG.defaultModel,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.1,
      });

      return response;
    } catch (error: any) {
      throw this.handleError(error, options?.context);
    }
  }

  // Generate embeddings
  async createEmbedding(
    input: string | string[],
    options?: {
      model?: string;
      context?: string;
    },
  ): Promise<OpenAI.Embeddings.CreateEmbeddingResponse> {
    try {
      this.trackRequest();

      const response = await this.client.embeddings.create({
        model: options?.model || "text-embedding-3-small",
        input,
      });

      return response;
    } catch (error: any) {
      throw this.handleError(error, options?.context);
    }
  }

  // Text completion for legacy models
  async createCompletion(
    prompt: string,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      context?: string;
    },
  ): Promise<OpenAI.Completions.Completion> {
    try {
      this.trackRequest();

      const response = await this.client.completions.create({
        model: options?.model || "gpt-3.5-turbo-instruct",
        prompt,
        max_tokens: options?.maxTokens || OPENAI_CONFIG.maxTokens,
        temperature: options?.temperature || OPENAI_CONFIG.temperature,
      });

      return response;
    } catch (error: any) {
      throw this.handleError(error, options?.context);
    }
  }

  // Utility methods
  getRequestCount(): number {
    return this.requestCount;
  }

  getLastRequestTime(): number {
    return this.lastRequestTime;
  }

  // Rate limiting check
  canMakeRequest(): boolean {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Basic rate limiting: max 60 requests per minute
    return timeSinceLastRequest >= 1000; // 1 second between requests
  }

  private trackRequest(): void {
    this.requestCount++;
    this.lastRequestTime = Date.now();
  }

  private handleError(error: any, context?: string): never {
    // Handle different types of OpenAI errors
    if (error?.status) {
      if (error.status === 401) {
        throw createAIServiceError("Invalid OpenAI API key", false, {
          context,
        });
      }
      if (error.status === 429) {
        throw createAIServiceError("Rate limit exceeded", true, { context });
      }
      if (error.status === 400) {
        throw createAIServiceError(`Invalid request: ${error.message}`, false, {
          context,
        });
      }
      if (error.status >= 500) {
        throw createAIServiceError("OpenAI service unavailable", false, {
          context,
        });
      }
    }

    // Handle network errors
    if (error?.code === "ECONNRESET" || error?.code === "ETIMEDOUT") {
      throw createNetworkError("OpenAI connection failed", error.status, {
        context,
      });
    }

    // Handle quota errors
    if (error?.message?.includes("quota")) {
      throw createAIServiceError("OpenAI quota exceeded", true, { context });
    }

    // Generic AI service error
    throw createAIServiceError(
      error?.message || "Unknown OpenAI error",
      false,
      { context },
    );
  }
}

// Create singleton instance
export const enhancedOpenAI = new EnhancedOpenAIClient();

// Export legacy client for backward compatibility
export const openAIClient = openai;

// Export types for convenience
export type ChatCompletionMessage =
  OpenAI.Chat.Completions.ChatCompletionMessageParam;
export type ChatCompletion = OpenAI.Chat.Completions.ChatCompletion;
export type ChatCompletionChunk = OpenAI.Chat.Completions.ChatCompletionChunk;
export type ChatCompletionTool = OpenAI.Chat.Completions.ChatCompletionTool;

// Import Stream type properly
type Stream<T> = AsyncIterable<T> & {
  controller: ReadableStreamDefaultController<T>;
};
