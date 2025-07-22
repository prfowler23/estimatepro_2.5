"use client";

import React from "react";
import { AIAssistant } from "@/components/ai/ai-assistant";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Bot, MessageCircle, Lightbulb, Calculator } from "lucide-react";

export default function AIAssistantPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Bot className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Assistant</h1>
            <p className="text-muted-foreground">
              Get intelligent help with estimates, calculations, and business
              advice
            </p>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">General Help</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Ask questions about using EstimatePro features and workflows
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Estimation Guidance</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Get help with estimation best practices and service calculations
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Business Advice</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Receive insights on pricing strategies and business optimization
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* AI Assistant Component */}
      <div className="max-w-4xl mx-auto">
        <AIAssistant />
      </div>
    </div>
  );
}
