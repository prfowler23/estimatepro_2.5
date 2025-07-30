"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, Bot, User, Zap, StopCircle } from "lucide-react";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Validation schema for enhanced assistant input
const enhancedAssistantInputSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be less than 2000 characters")
    .refine(
      (msg) => msg.trim().length > 0,
      "Message cannot contain only whitespace",
    ),
});

type EnhancedAssistantInputData = z.infer<typeof enhancedAssistantInputSchema>;

interface AIAssistantEnhancedProps {
  conversationId?: string;
  initialMode?: "general" | "estimation" | "technical" | "business";
  context?: any;
}

export function AIAssistantEnhanced({
  conversationId,
  initialMode = "general",
  context,
}: AIAssistantEnhancedProps) {
  const [mode, setMode] = useState(initialMode);
  const [useStreaming, setUseStreaming] = useState(true);
  const [nonStreamingLoading, setNonStreamingLoading] = useState(false);
  const [nonStreamingMessages, setNonStreamingMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Form setup for validation
  const form = useForm<EnhancedAssistantInputData>({
    resolver: zodResolver(enhancedAssistantInputSchema),
    defaultValues: {
      message: "",
    },
  });

  // Streaming hook
  const streaming = useAIAssistant({
    conversationId,
    mode,
    context,
  });

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [streaming.messages, nonStreamingMessages]);

  // Non-streaming send message function
  const sendNonStreamingMessage = async (data: EnhancedAssistantInputData) => {
    if (!data.message.trim() || nonStreamingLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: data.message,
    };

    setNonStreamingMessages((prev) => [...prev, userMessage]);
    setNonStreamingLoading(true);

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: data.message,
          mode,
          conversationId,
          context,
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: responseData.response,
        };
        setNonStreamingMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(responseData.error || "Failed to get response");
      }
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content:
          "I apologize, but I'm having trouble responding right now. Please try again.",
      };
      setNonStreamingMessages((prev) => [...prev, errorMessage]);
    } finally {
      setNonStreamingLoading(false);
    }
  };

  // Choose messages based on streaming mode
  const messages = useStreaming ? streaming.messages : nonStreamingMessages;
  const isLoading = useStreaming ? streaming.isLoading : nonStreamingLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">AI Assistant</h2>
          <div className="flex items-center space-x-2">
            <Switch
              id="streaming-mode"
              checked={useStreaming}
              onCheckedChange={setUseStreaming}
            />
            <Label
              htmlFor="streaming-mode"
              className="flex items-center gap-1 cursor-pointer"
            >
              <Zap
                className={cn("w-4 h-4", useStreaming && "text-yellow-500")}
              />
              Streaming
            </Label>
          </div>
        </div>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Choose assistance mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General Help</SelectItem>
            <SelectItem value="estimation">Estimation Guidance</SelectItem>
            <SelectItem value="technical">Technical Support</SelectItem>
            <SelectItem value="business">Business Advice</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="h-[500px] flex flex-col">
        <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Ask me anything about building services estimation!</p>
              <p className="text-sm mt-2">
                {useStreaming
                  ? "Streaming mode: See responses as they're generated"
                  : "Standard mode: Wait for complete responses"}
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex gap-2 max-w-[80%] ${
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {message.role === "user" ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <div
                      className={`rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      <Form {...form}>
        {useStreaming ? (
          <form onSubmit={streaming.handleSubmit} className="flex gap-2">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder="Ask about estimates, services, or building maintenance..."
                      {...field}
                      value={streaming.input}
                      onChange={(e) => {
                        field.onChange(e);
                        streaming.handleInputChange(e);
                      }}
                      disabled={streaming.isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {streaming.hasActiveStream ? (
              <Button
                type="button"
                onClick={streaming.stop}
                disabled={!streaming.isStreaming}
                variant="secondary"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Stop
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!form.formState.isValid || streaming.isLoading}
              >
                {streaming.isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            )}
          </form>
        ) : (
          <form
            onSubmit={form.handleSubmit(sendNonStreamingMessage)}
            className="flex gap-2"
          >
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder="Ask about estimates, services, or building maintenance..."
                      {...field}
                      value={streaming.input}
                      onChange={(e) => {
                        field.onChange(e);
                        streaming.handleInputChange(e);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          form.handleSubmit(sendNonStreamingMessage)();
                          streaming.setMessages([]);
                        }
                      }}
                      disabled={nonStreamingLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={!form.formState.isValid || nonStreamingLoading}
            >
              {nonStreamingLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        )}
      </Form>
    </div>
  );
}
