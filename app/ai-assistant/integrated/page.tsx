"use client";

import { AIAssistantWithTools } from "@/components/ai/AIAssistantWithTools";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Calculator,
  Camera,
  FileText,
  Sparkles,
  Zap,
} from "lucide-react";

export default function IntegratedAIAssistantPage() {
  const samplePrompts = {
    calculator: [
      "Calculate window cleaning for a 10-story office building with 5000 sq ft of glass",
      "How much would it cost to pressure wash a 10,000 sq ft parking deck?",
      "Estimate soft washing for a 3-story medical facility",
    ],
    analysis: [
      "Analyze this building facade: https://example.com/building.jpg",
      "What services would you recommend for a 20-story glass tower?",
      "Identify maintenance issues from this photo",
    ],
    workflow: [
      "Create a quote for window cleaning and pressure washing for ABC Company",
      "Find all estimates over $10,000 from last month",
      "What's the weather forecast for Seattle this week for scheduling?",
    ],
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">AI Assistant Pro</h1>
            <p className="text-muted-foreground text-lg">
              Integrated with EstimatePro&apos;s powerful platform features
            </p>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              Smart Calculations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Access all 11 service calculators with natural language. Just
              describe what you need!
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-transparent dark:from-purple-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-purple-600" />
              AI Photo Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Analyze building photos for measurements, materials, and service
              recommendations
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-transparent dark:from-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Workflow Automation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create quotes, search estimates, and manage projects with
              conversational AI
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Example Prompts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Try These Examples
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="calculator" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="calculator">Calculations</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="workflow">Workflows</TabsTrigger>
            </TabsList>

            <TabsContent value="calculator" className="space-y-2 mt-4">
              {samplePrompts.calculator.map((prompt, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer transition-colors"
                  onClick={() => {
                    // In a real implementation, this would populate the chat input
                    console.log("Selected prompt:", prompt);
                  }}
                >
                  <p className="text-sm">{prompt}</p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="analysis" className="space-y-2 mt-4">
              {samplePrompts.analysis.map((prompt, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer transition-colors"
                  onClick={() => {
                    console.log("Selected prompt:", prompt);
                  }}
                >
                  <p className="text-sm">{prompt}</p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="workflow" className="space-y-2 mt-4">
              {samplePrompts.workflow.map((prompt, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer transition-colors"
                  onClick={() => {
                    console.log("Selected prompt:", prompt);
                  }}
                >
                  <p className="text-sm">{prompt}</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* AI Assistant Interface */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              AI Assistant with Platform Integration
            </span>
            <Badge variant="secondary" className="gap-1">
              <Zap className="h-3 w-3" />
              Enhanced Mode
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AIAssistantWithTools />
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Pro Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            • Be specific with measurements: &quot;20-story building&quot;
            instead of &quot;tall building&quot;
          </p>
          <p className="text-sm text-muted-foreground">
            • Include location for accurate pricing: &quot;window cleaning in
            Los Angeles&quot;
          </p>
          <p className="text-sm text-muted-foreground">
            • Combine multiple services: &quot;quote for window cleaning AND
            pressure washing&quot;
          </p>
          <p className="text-sm text-muted-foreground">
            • Use natural language: &quot;How much to clean a parking
            garage?&quot;
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
