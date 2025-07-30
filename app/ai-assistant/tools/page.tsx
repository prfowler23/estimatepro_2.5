"use client";

import { AIAssistantWithTools } from "@/components/ai/AIAssistantWithTools";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  Camera,
  Calculator,
  Search,
  Cloud,
  FileText,
  AlertTriangle,
  Sparkles,
  Bot,
} from "lucide-react";

export default function AIToolsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Wrench className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Assistant Tools</h1>
            <p className="text-muted-foreground">
              Leverage AI-powered tools for building service estimation
            </p>
          </div>
        </div>
      </div>

      {/* Available Tools */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-purple-600" />
              <CardTitle className="text-sm">Photo Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Analyze building photos for facade details and measurements
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm">Service Calculator</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Calculate pricing for various building services
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-green-600" />
              <CardTitle className="text-sm">Estimate Search</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Search and retrieve estimates by various criteria
            </p>
          </CardContent>
        </Card>

        <Card className="border-cyan-200 dark:border-cyan-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-cyan-600" />
              <CardTitle className="text-sm">Weather Info</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Get weather forecasts for project planning
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-sm">Quote Creation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Create professional quotes with service details
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <CardTitle className="text-sm">Risk Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Analyze project risks and get recommendations
            </p>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 dark:border-indigo-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <CardTitle className="text-sm">Similar Projects</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Find similar projects based on type and features
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-orange-600" />
              <CardTitle className="text-sm">More Coming</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Additional tools are being developed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Example Prompts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Example Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Analysis & Calculation</h4>
              <div className="space-y-1">
                <Badge variant="outline" className="text-xs">
                  "Analyze this photo: [image URL] for window measurements"
                </Badge>
                <Badge variant="outline" className="text-xs">
                  "Calculate pressure washing for 5000 sq ft parking deck"
                </Badge>
                <Badge variant="outline" className="text-xs">
                  "What's the cost for window cleaning a 20-story building?"
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Search & Information</h4>
              <div className="space-y-1">
                <Badge variant="outline" className="text-xs">
                  "Find all estimates from last month over $10,000"
                </Badge>
                <Badge variant="outline" className="text-xs">
                  "What's the weather forecast for Seattle this week?"
                </Badge>
                <Badge variant="outline" className="text-xs">
                  "Show me similar office building cleaning projects"
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Assistant with Tools */}
      <AIAssistantWithTools />
    </div>
  );
}
