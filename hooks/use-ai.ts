"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  enhancedOpenAI,
  ChatCompletion,
  ChatCompletionMessage,
} from "@/lib/ai/openai";
import { useErrorHandler } from "@/lib/error/error-handler";
import { EstimateProError } from "@/lib/error/error-types";
import { useCallback, useState } from "react";

// Types for AI operations
export interface AIAnalysisRequest {
  prompt: string;
  context?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ImageAnalysisRequest {
  imageUrl: string;
  prompt: string;
  context?: string;
  model?: string;
}

export interface FunctionCallingRequest {
  messages: ChatCompletionMessage[];
  tools: any[];
  context?: string;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
  context?: string;
}

export interface StreamingChatRequest {
  messages: ChatCompletionMessage[];
  context?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onChunk?: (chunk: string) => void;
  onComplete?: (fullResponse: string) => void;
}

// Response types
export interface AIAnalysisResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

// Query keys for React Query
export const AI_QUERY_KEYS = {
  analysis: (prompt: string, context?: string) =>
    ["ai", "analysis", prompt, context] as const,
  imageAnalysis: (imageUrl: string, prompt: string) =>
    ["ai", "image", imageUrl, prompt] as const,
  embedding: (input: string | string[]) =>
    [
      "ai",
      "embedding",
      typeof input === "string" ? input : input.join("|"),
    ] as const,
  functionCall: (messages: ChatCompletionMessage[], toolNames: string[]) =>
    ["ai", "function", messages, toolNames] as const,
} as const;

// Cache configuration
const AI_CACHE_CONFIG = {
  // Analysis results can be cached for 1 hour
  analysis: { staleTime: 60 * 60 * 1000, cacheTime: 2 * 60 * 60 * 1000 },
  // Image analysis can be cached for 24 hours (images don't change)
  imageAnalysis: {
    staleTime: 24 * 60 * 60 * 1000,
    cacheTime: 48 * 60 * 60 * 1000,
  },
  // Embeddings can be cached for 7 days (very stable)
  embeddings: {
    staleTime: 7 * 24 * 60 * 60 * 1000,
    cacheTime: 14 * 24 * 60 * 60 * 1000,
  },
  // Function calls usually shouldn't be cached (dynamic)
  functionCalls: { staleTime: 0, cacheTime: 5 * 60 * 1000 },
} as const;

/**
 * Main AI hook with React Query integration
 */
export function useAI() {
  const { handleError } = useErrorHandler();
  const queryClient = useQueryClient();

  // Text analysis with caching
  const useAnalysis = (
    request: AIAnalysisRequest,
    options: {
      enabled?: boolean;
      select?: (data: AIAnalysisResponse) => any;
    } = {},
  ): UseQueryResult<AIAnalysisResponse, EstimateProError> => {
    return useQuery({
      queryKey: AI_QUERY_KEYS.analysis(request.prompt, request.context),
      queryFn: async (): Promise<AIAnalysisResponse> => {
        try {
          const messages: ChatCompletionMessage[] = [
            { role: "user", content: request.prompt },
          ];

          const response = await enhancedOpenAI.createChatCompletion(messages, {
            model: request.model,
            temperature: request.temperature,
            maxTokens: request.maxTokens,
            context: request.context,
          });

          const content = response.choices[0]?.message?.content || "";

          return {
            content,
            model: response.model,
            usage: response.usage
              ? {
                  promptTokens: response.usage.prompt_tokens,
                  completionTokens: response.usage.completion_tokens,
                  totalTokens: response.usage.total_tokens,
                }
              : undefined,
            finishReason: response.choices[0]?.finish_reason || undefined,
          };
        } catch (error) {
          throw await handleError(error, {
            component: "useAI",
            action: "analysis",
          });
        }
      },
      enabled: options.enabled !== false && !!request.prompt,
      select: options.select,
      ...AI_CACHE_CONFIG.analysis,
    });
  };

  // Image analysis with caching
  const useImageAnalysis = (
    request: ImageAnalysisRequest,
    options: { enabled?: boolean } = {},
  ): UseQueryResult<AIAnalysisResponse, EstimateProError> => {
    return useQuery({
      queryKey: AI_QUERY_KEYS.imageAnalysis(request.imageUrl, request.prompt),
      queryFn: async (): Promise<AIAnalysisResponse> => {
        try {
          const response = await enhancedOpenAI.analyzeImage(
            request.imageUrl,
            request.prompt,
            {
              model: request.model,
              context: request.context,
            },
          );

          const content = response.choices[0]?.message?.content || "";

          return {
            content,
            model: response.model,
            usage: response.usage
              ? {
                  promptTokens: response.usage.prompt_tokens,
                  completionTokens: response.usage.completion_tokens,
                  totalTokens: response.usage.total_tokens,
                }
              : undefined,
            finishReason: response.choices[0]?.finish_reason || undefined,
          };
        } catch (error) {
          throw await handleError(error, {
            component: "useAI",
            action: "imageAnalysis",
          });
        }
      },
      enabled:
        options.enabled !== false && !!request.imageUrl && !!request.prompt,
      ...AI_CACHE_CONFIG.imageAnalysis,
    });
  };

  // Embeddings with caching
  const useEmbedding = (
    request: EmbeddingRequest,
    options: { enabled?: boolean } = {},
  ): UseQueryResult<EmbeddingResponse, EstimateProError> => {
    return useQuery({
      queryKey: AI_QUERY_KEYS.embedding(request.input),
      queryFn: async (): Promise<EmbeddingResponse> => {
        try {
          const response = await enhancedOpenAI.createEmbedding(request.input, {
            model: request.model,
            context: request.context,
          });

          return {
            data: response.data,
            model: response.model,
            usage: response.usage,
          };
        } catch (error) {
          throw await handleError(error, {
            component: "useAI",
            action: "embedding",
          });
        }
      },
      enabled: options.enabled !== false && !!request.input,
      ...AI_CACHE_CONFIG.embeddings,
    });
  };

  // Mutations for non-cacheable operations
  const useAnalysisMutation = (): UseMutationResult<
    AIAnalysisResponse,
    EstimateProError,
    AIAnalysisRequest
  > => {
    return useMutation({
      mutationFn: async (
        request: AIAnalysisRequest,
      ): Promise<AIAnalysisResponse> => {
        try {
          const messages: ChatCompletionMessage[] = [
            { role: "user", content: request.prompt },
          ];

          const response = await enhancedOpenAI.createChatCompletion(messages, {
            model: request.model,
            temperature: request.temperature,
            maxTokens: request.maxTokens,
            context: request.context,
          });

          const content = response.choices[0]?.message?.content || "";

          return {
            content,
            model: response.model,
            usage: response.usage
              ? {
                  promptTokens: response.usage.prompt_tokens,
                  completionTokens: response.usage.completion_tokens,
                  totalTokens: response.usage.total_tokens,
                }
              : undefined,
            finishReason: response.choices[0]?.finish_reason || undefined,
          };
        } catch (error) {
          throw await handleError(error, {
            component: "useAI",
            action: "analysisMutation",
          });
        }
      },
      onError: (error) => {
        console.error("AI analysis mutation failed:", error);
      },
    });
  };

  const useFunctionCallingMutation = (): UseMutationResult<
    ChatCompletion,
    EstimateProError,
    FunctionCallingRequest
  > => {
    return useMutation({
      mutationFn: async (
        request: FunctionCallingRequest,
      ): Promise<ChatCompletion> => {
        try {
          const response = await enhancedOpenAI.callFunction(
            request.messages,
            request.tools,
            { context: request.context },
          );

          return response;
        } catch (error) {
          throw await handleError(error, {
            component: "useAI",
            action: "functionCalling",
          });
        }
      },
      onError: (error) => {
        console.error("Function calling mutation failed:", error);
      },
    });
  };

  // Streaming chat implementation
  const useStreamingChat = () => {
    const [isStreaming, setIsStreaming] = useState(false);
    const [currentResponse, setCurrentResponse] = useState("");
    const [error, setError] = useState<EstimateProError | null>(null);

    const startStream = useCallback(
      async (request: StreamingChatRequest) => {
        setIsStreaming(true);
        setCurrentResponse("");
        setError(null);

        try {
          const stream = await enhancedOpenAI.createStreamingChatCompletion(
            request.messages,
            {
              model: request.model,
              temperature: request.temperature,
              maxTokens: request.maxTokens,
              context: request.context,
            },
          );

          let fullResponse = "";

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            fullResponse += content;
            setCurrentResponse(fullResponse);

            if (request.onChunk && content) {
              request.onChunk(content);
            }
          }

          if (request.onComplete) {
            request.onComplete(fullResponse);
          }
        } catch (error) {
          const enhancedError = await handleError(error, {
            component: "useAI",
            action: "streamingChat",
          });
          setError(enhancedError);
        } finally {
          setIsStreaming(false);
        }
      },
      [handleError],
    );

    const stopStream = useCallback(() => {
      setIsStreaming(false);
    }, []);

    return {
      startStream,
      stopStream,
      isStreaming,
      currentResponse,
      error,
    };
  };

  // Utility functions
  const clearCache = useCallback(
    (type?: "analysis" | "imageAnalysis" | "embedding" | "all") => {
      if (type === "all" || !type) {
        queryClient.removeQueries({ queryKey: ["ai"] });
      } else {
        queryClient.removeQueries({ queryKey: ["ai", type] });
      }
    },
    [queryClient],
  );

  const invalidateCache = useCallback(
    (type?: "analysis" | "imageAnalysis" | "embedding" | "all") => {
      if (type === "all" || !type) {
        queryClient.invalidateQueries({ queryKey: ["ai"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["ai", type] });
      }
    },
    [queryClient],
  );

  const prefetchAnalysis = useCallback(
    async (request: AIAnalysisRequest) => {
      await queryClient.prefetchQuery({
        queryKey: AI_QUERY_KEYS.analysis(request.prompt, request.context),
        queryFn: async () => {
          const messages: ChatCompletionMessage[] = [
            { role: "user", content: request.prompt },
          ];

          const response = await enhancedOpenAI.createChatCompletion(messages, {
            model: request.model,
            temperature: request.temperature,
            maxTokens: request.maxTokens,
            context: request.context,
          });

          const content = response.choices[0]?.message?.content || "";

          return {
            content,
            model: response.model,
            usage: response.usage
              ? {
                  promptTokens: response.usage.prompt_tokens,
                  completionTokens: response.usage.completion_tokens,
                  totalTokens: response.usage.total_tokens,
                }
              : undefined,
            finishReason: response.choices[0]?.finish_reason || undefined,
          };
        },
        ...AI_CACHE_CONFIG.analysis,
      });
    },
    [queryClient],
  );

  return {
    // Query hooks
    useAnalysis,
    useImageAnalysis,
    useEmbedding,

    // Mutation hooks
    useAnalysisMutation,
    useFunctionCallingMutation,

    // Streaming hook
    useStreamingChat,

    // Utility functions
    clearCache,
    invalidateCache,
    prefetchAnalysis,

    // Client information
    getRequestCount: () => enhancedOpenAI.getRequestCount(),
    getLastRequestTime: () => enhancedOpenAI.getLastRequestTime(),
    canMakeRequest: () => enhancedOpenAI.canMakeRequest(),
  };
}
