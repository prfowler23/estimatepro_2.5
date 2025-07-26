"use client";

import { config } from "@/lib/config";
import { validateClientEnv } from "@/lib/config/env-validation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  Calculator,
  Sparkles,
  Bot,
  Zap,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewEstimate() {
  const router = useRouter();
  const env = validateClientEnv();

  // Check feature flags
  const newFlowEnabled = env.NEXT_PUBLIC_NEW_ESTIMATE_FLOW;
  const quickModeEnabled = env.NEXT_PUBLIC_QUICK_ESTIMATE_MODE;
  const legacySupport = env.NEXT_PUBLIC_LEGACY_FLOW_SUPPORT;

  // If new flow is not enabled, use legacy behavior
  if (!newFlowEnabled && config.features.guidedFlow) {
    return (
      <div className="container py-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Estimate</h1>
          <p className="text-muted-foreground">
            Choose your preferred estimation method
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Guided Flow Option */}
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-blue-600" />
                <CardTitle>Create AI Estimate</CardTitle>
              </div>
              <CardDescription>
                AI automates the entire estimation process - just review and
                approve
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground mb-4 space-y-1">
                <li>• AI extracts info from emails/notes</li>
                <li>• Photo analysis for measurements</li>
                <li>• Smart service recommendations</li>
                <li>• Automated takeoff calculations</li>
                <li>• Professional proposal generation</li>
              </ul>
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                <Link href="/estimates/new/guided">
                  <Bot className="mr-2 h-4 w-4" />
                  Start AI Estimation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Calculator Option */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calculator className="h-6 w-6" />
                <CardTitle>Quick Calculator</CardTitle>
              </div>
              <CardDescription>
                Manual calculation mode for specific scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground mb-4 space-y-1">
                <li>• Immediate service selection</li>
                <li>• Manual data entry</li>
                <li>• Real-time calculations</li>
                <li>• Fast estimate generation</li>
                <li>• Perfect for repeat customers</li>
              </ul>
              <Button variant="outline" asChild className="w-full">
                <Link href="/calculator">
                  Use Calculator
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <strong>Recommended:</strong> Start with AI estimation for 90% faster,
          more accurate quotes.
        </div>
      </div>
    );
  }

  // New flow with enhanced options
  return (
    <div className="container py-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Estimate</h1>
        <p className="text-text-secondary">
          Choose how you'd like to create your estimate
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Quick Estimate Mode */}
        {quickModeEnabled && (
          <Card
            className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => router.push("/estimates/new/quick")}
          >
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-green-100 opacity-50 group-hover:scale-110 transition-transform" />
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-green-600" />
                <CardTitle>Quick Estimate</CardTitle>
              </div>
              <CardDescription>
                Create a simple estimate in under 2 minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-text-secondary mb-4 space-y-1">
                <li>• Single-page form</li>
                <li>• Smart defaults</li>
                <li>• Instant calculations</li>
                <li>• One-click send</li>
                <li>• Perfect for simple jobs</li>
              </ul>
              <div className="text-xs text-green-600 font-medium">
                Fastest option • Under 2 minutes
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guided Flow (4-step) */}
        <Card
          className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-2 border-primary/20"
          onClick={() => router.push("/estimates/new/guided")}
        >
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/10 group-hover:scale-110 transition-transform" />
          <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded">
            Recommended
          </div>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              <CardTitle>Guided Estimate</CardTitle>
            </div>
            <CardDescription>Step-by-step with AI assistance</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-text-secondary mb-4 space-y-1">
              <li>• 4 simple steps</li>
              <li>• AI-powered suggestions</li>
              <li>• Photo analysis</li>
              <li>• Smart validation</li>
              <li>• Professional results</li>
            </ul>
            <div className="text-xs text-primary font-medium">
              Best for most jobs • 5-10 minutes
            </div>
          </CardContent>
        </Card>

        {/* Template-based */}
        <Card
          className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
          onClick={() => router.push("/estimates/templates")}
        >
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-purple-100 opacity-50 group-hover:scale-110 transition-transform" />
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-purple-600" />
              <CardTitle>From Template</CardTitle>
            </div>
            <CardDescription>
              Start with a pre-configured template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-text-secondary mb-4 space-y-1">
              <li>• Common job types</li>
              <li>• Pre-filled pricing</li>
              <li>• Customizable fields</li>
              <li>• Save your own</li>
              <li>• Consistent estimates</li>
            </ul>
            <div className="text-xs text-purple-600 font-medium">
              Repeatable jobs • 3-5 minutes
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Options */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {/* Calculator */}
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/calculator")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-text-secondary" />
                <CardTitle className="text-base">Service Calculator</CardTitle>
              </div>
              <ArrowRight className="h-4 w-4 text-text-secondary" />
            </div>
            <CardDescription className="text-sm">
              Advanced calculations for specific services
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Legacy Flow */}
        {legacySupport && (
          <Card
            className="hover:shadow-md transition-shadow cursor-pointer opacity-75"
            onClick={() => router.push("/estimates/new/guided?legacy=true")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-text-secondary" />
                  <CardTitle className="text-base">Classic Flow</CardTitle>
                </div>
                <ArrowRight className="h-4 w-4 text-text-secondary" />
              </div>
              <CardDescription className="text-sm">
                Use the original 8-step estimation process
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      {/* Help Text */}
      <div className="text-center">
        <p className="text-sm text-text-secondary mb-2">
          Not sure which to choose?
        </p>
        <p className="text-sm">
          <strong className="text-text-primary">Quick Estimate</strong> for
          simple jobs •
          <strong className="text-text-primary ml-2">Guided Estimate</strong>{" "}
          for detailed quotes •
          <strong className="text-text-primary ml-2">Templates</strong> for
          repeat work
        </p>
      </div>
    </div>
  );
}
