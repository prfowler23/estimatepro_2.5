import { useChat } from "ai/react";
import { useState, useCallback, useEffect } from "react";
import { Message } from "ai";

export interface AIAssistantOptions {
  conversationId?: string;
  mode?: "general" | "estimation" | "technical" | "business";
  context?: any;
  useTools?: boolean;
  onError?: (error: Error) => void;
  onFinish?: (message: Message) => void;
  onToolCall?: (toolName: string, args: any) => void;
}

export function useAIAssistant(options: AIAssistantOptions = {}) {
  const {
    conversationId,
    mode = "general",
    context,
    useTools = true,
    onError,
    onFinish,
    onToolCall,
  } = options;
  const [isStreaming, setIsStreaming] = useState(false);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    isLoading,
    error,
    append,
    reload,
    stop,
    setMessages,
  } = useChat({
    api: "/api/ai/assistant/stream",
    body: {
      conversationId,
      mode,
      context,
      useTools,
    },
    experimental_onToolCall: onToolCall
      ? async ({ toolCall }: any) => {
          onToolCall(toolCall.toolName, toolCall.args);
        }
      : undefined,
    onError: (error) => {
      console.error("AI Assistant error:", error);
      setIsStreaming(false);
      onError?.(error);
    },
    onFinish: (message) => {
      setIsStreaming(false);
      onFinish?.(message);
    },
    onResponse: (response) => {
      // Check for conversation ID in headers
      const newConversationId = response.headers.get("X-Conversation-Id");
      if (newConversationId && options.conversationId !== newConversationId) {
        // You might want to update the conversation ID in your parent component
        console.log("New conversation ID:", newConversationId);
      }
    },
  });

  // Track streaming state
  useEffect(() => {
    setIsStreaming(isLoading);
  }, [isLoading]);

  // Enhanced submit handler with validation
  const handleSubmit = useCallback(
    async (e?: React.FormEvent<HTMLFormElement>) => {
      if (e) {
        e.preventDefault();
      }

      // Don't submit empty messages
      if (!input.trim()) {
        return;
      }

      // Don't submit while already loading
      if (isLoading) {
        return;
      }

      setIsStreaming(true);
      originalHandleSubmit(e);
    },
    [input, isLoading, originalHandleSubmit],
  );

  // Send a message programmatically
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) {
        return;
      }

      setIsStreaming(true);
      await append({
        content: message,
        role: "user",
      });
    },
    [append, isLoading],
  );

  // Clear conversation
  const clearConversation = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  // Get the last assistant message
  const lastAssistantMessage = messages
    .filter((m) => m.role === "assistant")
    .pop();

  // Check if there's an ongoing stream
  const hasActiveStream = isLoading && isStreaming;

  return {
    // Message state
    messages,
    input,
    isLoading,
    isStreaming,
    hasActiveStream,
    error,
    lastAssistantMessage,

    // Actions
    handleInputChange,
    handleSubmit,
    sendMessage,
    reload,
    stop,
    clearConversation,
    setMessages,

    // Metadata
    conversationId: options.conversationId,
    mode,
  };
}
