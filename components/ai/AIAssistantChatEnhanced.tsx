"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { TypingIndicator } from "./TypingIndicator";
import { MessageStatusIndicator, MessageStatus } from "./MessageStatus";
import {
  Send,
  StopCircle,
  ArrowDown,
  Sparkles,
  Bot,
  User,
  Mic,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AIContext,
  ConversationMode,
  AIMessage,
  AI_CONSTANTS,
} from "@/lib/types/ai-types";
import { AI_FEATURES } from "@/lib/config/feature-flags";

// Enhanced validation schema with character limit checking
const enhancedChatMessageSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(
      AI_CONSTANTS.TOKEN_LIMITS.INPUT_MAX,
      `Message must be less than ${AI_CONSTANTS.TOKEN_LIMITS.INPUT_MAX} characters`,
    )
    .refine(
      (msg) => msg.trim().length > 0,
      "Message cannot contain only whitespace",
    ),
});

type EnhancedChatMessageData = z.infer<typeof enhancedChatMessageSchema>;

interface AIAssistantChatEnhancedProps {
  conversationId?: string;
  mode?: ConversationMode;
  context?: AIContext;
  className?: string;
  placeholder?: string;
  showFeatures?: boolean;
}

interface MessageWithStatus {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: MessageStatus;
  timestamp?: Date;
}

export function AIAssistantChatEnhanced({
  conversationId,
  mode = "general",
  context,
  className,
  placeholder = "Ask me anything about your estimation...",
  showFeatures = true,
}: AIAssistantChatEnhancedProps) {
  const [messageStatuses, setMessageStatuses] = useState<
    Record<string, MessageStatus>
  >({});
  const [isRecording, setIsRecording] = useState(false);

  const {
    messages,
    input,
    isLoading,
    isStreaming,
    hasActiveStream,
    handleInputChange,
    handleSubmit,
    stop,
  } = useAIAssistant({
    conversationId,
    mode,
    context,
    onFinish: (message) => {
      // Update message status when complete
      if (message.id) {
        setMessageStatuses((prev) => ({
          ...prev,
          [message.id]: "delivered",
        }));
      }
    },
  });

  // Form setup for validation
  const form = useForm<EnhancedChatMessageData>({
    resolver: zodResolver(enhancedChatMessageSchema),
    defaultValues: {
      message: "",
    },
  });

  // Sync form with external input state
  useEffect(() => {
    form.setValue("message", input);
  }, [input, form]);

  const onSubmit = (data: EnhancedChatMessageData) => {
    // Use the existing handleSubmit from useAIAssistant
    handleSubmit();
  };

  const {
    scrollRef,
    isAutoScrolling,
    isAtBottom,
    scrollToBottom,
    pauseAutoScroll,
    resumeAutoScroll,
  } = useAutoScroll({
    dependency: [messages],
    behavior: "smooth",
    delay: 100,
  });

  // Track message status
  useEffect(() => {
    messages.forEach((msg) => {
      if (!messageStatuses[msg.id]) {
        setMessageStatuses((prev) => ({
          ...prev,
          [msg.id]: msg.role === "user" ? "sent" : "delivered",
        }));
      }
    });
  }, [messages, messageStatuses]);

  // Enhanced messages with status
  const enhancedMessages: MessageWithStatus[] = messages.map((msg) => ({
    ...msg,
    status: messageStatuses[msg.id] || "sending",
    timestamp: new Date(),
  }));

  const handleVoiceInput = useCallback(() => {
    setIsRecording(!isRecording);
    // Voice input implementation would go here
  }, [isRecording]);

  const handleFileAttach = useCallback(() => {
    // File attachment implementation would go here
  }, []);

  return (
    <Card
      className={cn("flex flex-col h-[600px]", className)}
      role="region"
      aria-label="AI Assistant Chat"
    >
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-medium" id="ai-chat-title">
                AI Assistant
              </h3>
              <p className="text-xs text-muted-foreground">
                {isStreaming ? "Typing..." : "Online"}
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="capitalize"
            aria-label={`Chat mode: ${mode}`}
          >
            {mode}
          </Badge>
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 relative overflow-hidden"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        <ScrollArea
          ref={scrollRef}
          className="h-full p-4"
          aria-labelledby="ai-chat-title"
        >
          <AnimatePresence initial={false}>
            <div className="space-y-4">
              {enhancedMessages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <Sparkles
                    className="h-12 w-12 mx-auto mb-4 text-primary/20"
                    aria-hidden="true"
                  />
                  <p className="text-muted-foreground">
                    Start a conversation with your AI assistant
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    I can help with estimates, calculations, and technical
                    guidance
                  </p>
                </motion.div>
              )}

              {enhancedMessages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "flex gap-3 max-w-[80%]",
                      message.role === "user" ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"
                    >
                      {message.role === "user" ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </motion.div>
                    <div className="space-y-1">
                      <motion.div
                        layout
                        className={cn(
                          "rounded-lg px-4 py-2",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </motion.div>
                      <MessageStatusIndicator
                        status={message.status || "delivered"}
                        timestamp={message.timestamp}
                        className="px-2"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              <TypingIndicator
                isTyping={isStreaming}
                variant="dots"
                label="AI is thinking"
              />
            </div>
          </AnimatePresence>
        </ScrollArea>

        {/* Scroll to Bottom Button */}
        <AnimatePresence>
          {!isAtBottom && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-2 right-2"
            >
              <Button
                size="sm"
                variant="secondary"
                onClick={scrollToBottom}
                className="rounded-full shadow-lg"
                aria-label="Scroll to bottom"
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="p-4 border-t"
          role="form"
          aria-label="Send message"
        >
          <div className="flex gap-2">
            {showFeatures && (
              <>
                {AI_FEATURES.FILE_ATTACHMENT && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={handleFileAttach}
                    disabled={isLoading}
                    title="File attachment coming soon"
                    aria-label="Attach file (coming soon)"
                  >
                    <Paperclip className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
                {AI_FEATURES.VOICE_INPUT && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={handleVoiceInput}
                    disabled={isLoading}
                    className={cn(isRecording && "text-red-500")}
                    title="Voice input coming soon"
                    aria-label={
                      isRecording
                        ? "Stop recording (coming soon)"
                        : "Start voice input (coming soon)"
                    }
                  >
                    <Mic className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </>
            )}

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Textarea
                      {...field}
                      value={input}
                      onChange={(e) => {
                        field.onChange(e);
                        handleInputChange(e);
                      }}
                      placeholder={placeholder}
                      className="min-h-[60px] resize-none"
                      aria-label="Type your message"
                      aria-describedby="ai-chat-helper"
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          form.handleSubmit(onSubmit)();
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col justify-end">
              {hasActiveStream ? (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={stop}
                  disabled={!isStreaming}
                  aria-label="Stop generating response"
                >
                  <StopCircle className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !form.formState.isValid}
                  aria-label={isLoading ? "Sending message" : "Send message"}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>

          {/* Character count */}
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-muted-foreground">
              {isAutoScrolling ? "Auto-scroll enabled" : "Auto-scroll paused"}
            </span>
            <span
              className={cn(
                "text-xs",
                input.length > AI_CONSTANTS.TOKEN_LIMITS.INPUT_MAX * 0.9
                  ? "text-red-500"
                  : "text-muted-foreground",
              )}
            >
              {input.length} / {AI_CONSTANTS.TOKEN_LIMITS.INPUT_MAX}
            </span>
          </div>
        </form>
      </Form>
    </Card>
  );
}
