"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TypingIndicator } from "./TypingIndicator";
import {
  Send,
  Bot,
  User,
  Wrench,
  Camera,
  Calculator,
  Search,
  Cloud,
  FileText,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { ToolCallInfo, ToolArguments } from "@/lib/types/ai-types";

export function AIAssistantWithTools() {
  const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([]);
  const [showToolDetails, setShowToolDetails] = useState(true);

  const {
    messages,
    input,
    isLoading,
    isStreaming,
    handleInputChange,
    handleSubmit,
    stop,
  } = useAIAssistant({
    mode: "general",
    useTools: true,
    onToolCall: (toolName: string, args: ToolArguments) => {
      setToolCalls((prev) => [
        ...prev,
        {
          name: toolName,
          args,
          timestamp: new Date(),
        },
      ]);
    },
  });

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case "analyzePhoto":
        return <Camera className="h-4 w-4" />;
      case "calculateService":
        return <Calculator className="h-4 w-4" />;
      case "searchEstimates":
        return <Search className="h-4 w-4" />;
      case "getWeather":
        return <Cloud className="h-4 w-4" />;
      case "createQuote":
        return <FileText className="h-4 w-4" />;
      case "analyzeRisk":
        return <AlertTriangle className="h-4 w-4" />;
      case "findSimilarProjects":
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Wrench className="h-4 w-4" />;
    }
  };

  const getToolDescription = (toolName: string) => {
    switch (toolName) {
      case "analyzePhoto":
        return "Analyzing photo for building details";
      case "calculateService":
        return "Calculating service pricing";
      case "searchEstimates":
        return "Searching estimates database";
      case "getWeather":
        return "Fetching weather information";
      case "createQuote":
        return "Creating new quote";
      case "analyzeRisk":
        return "Analyzing project risks";
      case "findSimilarProjects":
        return "Finding similar projects";
      default:
        return "Processing request";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant with Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            I can help you with photo analysis, service calculations, estimate
            searches, weather info, and more. Just ask!
          </p>
        </CardContent>
      </Card>

      {/* Main Interface */}
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="tools">
            Tools Activity ({toolCalls.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          {/* Chat Area */}
          <Card className="h-[500px] flex flex-col">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <Bot className="h-12 w-12 mx-auto mb-4 text-primary/20" />
                    <p className="text-muted-foreground">Try asking me to:</p>
                    <div className="mt-4 space-y-2">
                      <p className="text-sm">
                        • &quot;Analyze this photo for facade details&quot;
                      </p>
                      <p className="text-sm">
                        • &quot;Calculate window cleaning for a 10-story
                        building&quot;
                      </p>
                      <p className="text-sm">
                        • &quot;Search for recent estimates over $5000&quot;
                      </p>
                      <p className="text-sm">
                        • &quot;What&apos;s the weather forecast for
                        tomorrow?&quot;
                      </p>
                    </div>
                  </div>
                )}

                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex gap-3 max-w-[80%] ${
                        message.role === "user"
                          ? "flex-row-reverse"
                          : "flex-row"
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
                        className={`rounded-lg px-4 py-2 ${
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
                  </motion.div>
                ))}

                <TypingIndicator isTyping={isStreaming} variant="dots" />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask me anything..."
                  className="min-h-[60px] resize-none"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Card>

          {/* Active Tool Calls */}
          {showToolDetails && toolCalls.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Recent Tool Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {toolCalls.slice(-3).map((call, index) => (
                  <Alert key={index} className="py-2">
                    <div className="flex items-center gap-2">
                      {getToolIcon(call.name)}
                      <AlertDescription className="text-xs">
                        {getToolDescription(call.name)}
                      </AlertDescription>
                    </div>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tool Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {toolCalls.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No tools have been used yet
                    </p>
                  )}
                  {toolCalls.map((call, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded">
                          {getToolIcon(call.name)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">{call.name}</h4>
                            <span className="text-xs text-muted-foreground">
                              {call.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getToolDescription(call.name)}
                          </p>
                          <details className="mt-2">
                            <summary className="text-xs cursor-pointer text-primary">
                              View parameters
                            </summary>
                            <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                              {JSON.stringify(call.args, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
