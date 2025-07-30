"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Send, StopCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { AIContext, ConversationMode } from "@/lib/types/ai-types";

// Validation schema for chat input
const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be less than 2000 characters")
    .refine(
      (msg) => msg.trim().length > 0,
      "Message cannot contain only whitespace",
    ),
});

type ChatMessageData = z.infer<typeof chatMessageSchema>;

interface AIAssistantChatProps {
  conversationId?: string;
  mode?: ConversationMode;
  context?: AIContext;
  className?: string;
  placeholder?: string;
}

export function AIAssistantChat({
  conversationId,
  mode = "general",
  context,
  className,
  placeholder = "Ask me anything about your estimation...",
}: AIAssistantChatProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
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
  });

  // Form setup for validation
  const form = useForm<ChatMessageData>({
    resolver: zodResolver(chatMessageSchema),
    defaultValues: {
      message: "",
    },
  });

  // Sync form with external input state
  useEffect(() => {
    form.setValue("message", input);
  }, [input, form]);

  const onSubmit = (data: ChatMessageData) => {
    // Use the existing handleSubmit from useAIAssistant
    handleSubmit();
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card
      className={cn("flex flex-col h-[600px]", className)}
      role="application"
      aria-label="AI Assistant Chat"
    >
      <div className="flex-1 overflow-hidden">
        <ScrollArea
          ref={scrollAreaRef}
          className="h-full p-4"
          tabIndex={0}
          aria-label="Chat messages"
        >
          <div
            className="space-y-4"
            role="log"
            aria-live="polite"
            aria-label="Conversation history"
          >
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <p>Start a conversation with your AI assistant</p>
                <p className="text-sm mt-2">
                  I can help with estimates, calculations, and technical
                  guidance
                </p>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
                role="article"
                aria-label={`Message ${index + 1} from ${message.role === "user" ? "you" : "assistant"}`}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}
            {isStreaming && (
              <div
                className="flex justify-start"
                aria-live="polite"
                aria-busy="true"
              >
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Assistant is typing...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="p-4 border-t"
          aria-label="Chat input form"
        >
          <div className="flex gap-2">
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
                      disabled={isLoading}
                      aria-label="Type your message"
                      aria-describedby="chat-help-text"
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
            <div className="flex flex-col gap-2">
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
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
          <span id="chat-help-text" className="sr-only">
            Press Enter to send, Shift+Enter for new line
          </span>
        </form>
      </Form>
    </Card>
  );
}
