"use client";

import { useState, Suspense } from "react";
import dynamic from "next/dynamic";

// Lazy load heavy AI components
const AIAssistantChatEnhanced = dynamic(
  () =>
    import("@/components/ai/AIAssistantChatEnhanced").then((mod) => ({
      default: mod.AIAssistantChatEnhanced,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] bg-border-primary/20 rounded-lg animate-pulse flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin w-8 h-8 border-2 border-primary-action border-t-transparent rounded-full mx-auto" />
          <p className="text-text-secondary">Loading Enhanced Assistant...</p>
        </div>
      </div>
    ),
  },
);

const AIAssistantChat = dynamic(
  () =>
    import("@/components/ai/AIAssistantChat").then((mod) => ({
      default: mod.AIAssistantChat,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] bg-border-primary/20 rounded-lg animate-pulse flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin w-8 h-8 border-2 border-primary-action border-t-transparent rounded-full mx-auto" />
          <p className="text-text-secondary">Loading Standard Assistant...</p>
        </div>
      </div>
    ),
  },
);
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bot, Zap, MessageSquare, Settings } from "lucide-react";

export default function EnhancedAIAssistantPage() {
  const [mode, setMode] = useState<
    "general" | "estimation" | "technical" | "business"
  >("general");
  const [typingVariant, setTypingVariant] = useState<"dots" | "pulse" | "wave">(
    "dots",
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Enhanced AI Assistant</h1>
            <p className="text-muted-foreground">
              Experience the next generation of AI-powered assistance with
              streaming responses
            </p>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Real-time Streaming</CardTitle>
            </div>
            <CardDescription className="text-sm">
              See AI responses as they&apos;re generated with smooth animations
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Smart Auto-scroll</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Intelligent scrolling that respects user interaction
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Enhanced UI</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Typing indicators, message status, and rich interactions
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mode-select">Assistant Mode</Label>
              <Select
                value={mode}
                onValueChange={(value: any) => setMode(value)}
              >
                <SelectTrigger id="mode-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Help</SelectItem>
                  <SelectItem value="estimation">
                    Estimation Guidance
                  </SelectItem>
                  <SelectItem value="technical">Technical Support</SelectItem>
                  <SelectItem value="business">Business Advice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="typing-select">Typing Indicator Style</Label>
              <Select
                value={typingVariant}
                onValueChange={(value: any) => setTypingVariant(value)}
              >
                <SelectTrigger id="typing-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dots">Animated Dots</SelectItem>
                  <SelectItem value="pulse">Pulse Effect</SelectItem>
                  <SelectItem value="wave">Wave Animation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Tabs defaultValue="enhanced" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="enhanced">Enhanced Version</TabsTrigger>
          <TabsTrigger value="standard">Standard Version</TabsTrigger>
        </TabsList>

        <TabsContent value="enhanced" className="mt-6">
          <Suspense
            fallback={
              <div className="h-[600px] bg-border-primary/20 rounded-lg animate-pulse flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="animate-spin w-8 h-8 border-2 border-primary-action border-t-transparent rounded-full mx-auto" />
                  <p className="text-text-secondary">
                    Loading Enhanced Assistant...
                  </p>
                </div>
              </div>
            }
          >
            <AIAssistantChatEnhanced
              mode={mode}
              showFeatures={true}
              placeholder="Try asking about estimates, calculations, or business advice..."
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="standard" className="mt-6">
          <Suspense
            fallback={
              <div className="h-[600px] bg-border-primary/20 rounded-lg animate-pulse flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="animate-spin w-8 h-8 border-2 border-primary-action border-t-transparent rounded-full mx-auto" />
                  <p className="text-text-secondary">
                    Loading Standard Assistant...
                  </p>
                </div>
              </div>
            }
          >
            <AIAssistantChat
              mode={mode}
              placeholder="Try asking about estimates, calculations, or business advice..."
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
