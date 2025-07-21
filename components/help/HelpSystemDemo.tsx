"use client";

import React, { useState } from "react";
import { HelpProvider } from "./HelpProvider";
import { ContextualHelpPanel } from "./ContextualHelpPanel";
import { HelpTooltip } from "./HelpTooltip";
import { InteractiveTutorial } from "./InteractiveTutorial";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import {
  HelpCircle,
  BookOpen,
  Lightbulb,
  PlayCircle,
  Users,
  Settings,
  Star,
  Clock,
} from "lucide-react";

export function HelpSystemDemo() {
  const { isMobile } = useMobileDetection();
  const [experienceLevel, setExperienceLevel] = useState<
    "novice" | "intermediate" | "expert"
  >("novice");
  const [currentDemo, setCurrentDemo] = useState<
    "overview" | "tooltips" | "panel" | "tutorial"
  >("overview");
  const [formData, setFormData] = useState({
    customerName: "",
    buildingType: "",
    notes: "",
  });

  const userProfile = {
    experienceLevel,
    role: "estimator" as const,
    preferences: {
      showDetailedHelp: true,
      enableTutorials: true,
      helpAnimations: true,
    },
  };

  const mockFlowData = {
    initialContact: {
      contactMethod: "email" as const,
      originalContent: "Sample project inquiry for office building cleaning...",
      extractedData: {
        customer: {
          name: formData.customerName,
          company: "Demo Company",
          email: "demo@example.com",
        },
        requirements: {
          buildingType: formData.buildingType,
          services: ["window-cleaning", "pressure-washing"],
        },
      },
    },
  };

  return (
    <HelpProvider
      userProfile={userProfile}
      flowData={mockFlowData}
      userId="demo-user"
    >
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
            <HelpCircle className="w-8 h-8 text-blue-500" />
            Contextual Help System Demo
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Experience intelligent, context-aware help that adapts to your
            experience level and current task.
          </p>
        </div>

        {/* Controls */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Experience Level:</label>
                <Select
                  value={experienceLevel}
                  onValueChange={(value) =>
                    setExperienceLevel(
                      value as "novice" | "intermediate" | "expert",
                    )
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novice">Novice</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Demo Mode:</label>
                <div className="flex gap-1">
                  {[
                    { id: "overview", label: "Overview", icon: Star },
                    { id: "tooltips", label: "Tooltips", icon: HelpCircle },
                    { id: "panel", label: "Help Panel", icon: Lightbulb },
                    { id: "tutorial", label: "Tutorial", icon: PlayCircle },
                  ].map((mode) => (
                    <Button
                      key={mode.id}
                      variant={currentDemo === mode.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentDemo(mode.id as any)}
                      className="text-xs"
                    >
                      <mode.icon className="w-3 h-3 mr-1" />
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">
                Current Level: {experienceLevel}
              </Badge>
              <Badge variant="outline">Demo Mode: {currentDemo}</Badge>
              <Badge variant="outline">Mobile: {isMobile ? "Yes" : "No"}</Badge>
            </div>
          </div>
        </Card>

        {/* Demo Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {currentDemo === "overview" && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Help System Features</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 text-blue-500 mt-1" />
                      <div>
                        <h3 className="font-semibold">Contextual Tooltips</h3>
                        <p className="text-sm text-gray-600">
                          Smart tooltips that appear based on your current
                          context and experience level.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-yellow-500 mt-1" />
                      <div>
                        <h3 className="font-semibold">Smart Suggestions</h3>
                        <p className="text-sm text-gray-600">
                          AI-powered recommendations that help improve your
                          estimates.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <BookOpen className="w-5 h-5 text-purple-500 mt-1" />
                      <div>
                        <h3 className="font-semibold">Interactive Tutorials</h3>
                        <p className="text-sm text-gray-600">
                          Step-by-step guided tutorials with visual highlights.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Settings className="w-5 h-5 text-gray-500 mt-1" />
                      <div>
                        <h3 className="font-semibold">Adaptive Content</h3>
                        <p className="text-sm text-gray-600">
                          Help content that adapts to your experience level and
                          role.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {currentDemo === "tooltips" && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  Interactive Form with Help Tooltips
                </h2>
                <div className="space-y-4">
                  <div>
                    <HelpTooltip
                      fieldId="customer.name"
                      trigger="hover"
                      helpContent={{
                        id: "customer-name-demo",
                        title: "Customer Name Field",
                        content:
                          experienceLevel === "novice"
                            ? "Enter the primary contact person for this project. This should be the decision maker who can approve the work and sign contracts."
                            : experienceLevel === "intermediate"
                              ? "Primary contact for project decisions and communication."
                              : "Decision maker contact.",
                        type: "tooltip",
                        triggers: [{ type: "onFocus", priority: 5 }],
                        audience: [experienceLevel],
                        context: { fieldId: "customer.name" },
                        priority: 5,
                        tags: ["customer-info", "required"],
                        lastUpdated: new Date().toISOString(),
                      }}
                    >
                      <label className="block text-sm font-medium mb-2">
                        Customer Name *
                      </label>
                    </HelpTooltip>
                    <Input
                      value={formData.customerName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          customerName: e.target.value,
                        }))
                      }
                      placeholder="Enter customer name..."
                      data-tutorial="customer-name"
                    />
                  </div>

                  <div>
                    <HelpTooltip
                      fieldId="requirements.buildingType"
                      trigger="click"
                      helpContent={{
                        id: "building-type-demo",
                        title: "Building Type Selection",
                        content:
                          experienceLevel === "novice"
                            ? "Selecting the correct building type is important because it helps our AI provide more accurate analysis of your photos and better service recommendations. Different building types have different cleaning requirements and safety considerations."
                            : experienceLevel === "intermediate"
                              ? "Building type selection improves AI analysis accuracy and service recommendations."
                              : "Specify building type for optimized AI analysis.",
                        type: "tooltip",
                        triggers: [{ type: "onFocus", priority: 6 }],
                        audience: [experienceLevel],
                        context: { fieldId: "requirements.buildingType" },
                        priority: 6,
                        tags: ["building-info", "ai-enhancement"],
                        lastUpdated: new Date().toISOString(),
                      }}
                    >
                      <label className="block text-sm font-medium mb-2">
                        Building Type
                      </label>
                    </HelpTooltip>
                    <Select
                      value={formData.buildingType}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          buildingType: value,
                        }))
                      }
                    >
                      <SelectTrigger data-tutorial="building-type">
                        <SelectValue placeholder="Select building type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="office">Office Building</SelectItem>
                        <SelectItem value="retail">Retail Store</SelectItem>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="hospital">
                          Hospital/Medical
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <HelpTooltip
                      fieldId="project.notes"
                      trigger="focus"
                      helpContent={{
                        id: "notes-demo",
                        title: "Project Notes",
                        content:
                          experienceLevel === "novice"
                            ? "Use this field to record important details about the project that might affect pricing or scheduling. Include any special requirements, access restrictions, or customer preferences."
                            : "Record project-specific details and requirements.",
                        type: "tooltip",
                        triggers: [{ type: "onFocus", priority: 4 }],
                        audience: [experienceLevel],
                        context: { fieldId: "project.notes" },
                        priority: 4,
                        tags: ["notes", "documentation"],
                        lastUpdated: new Date().toISOString(),
                      }}
                    >
                      <label className="block text-sm font-medium mb-2">
                        Project Notes
                      </label>
                    </HelpTooltip>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Enter project notes..."
                      rows={3}
                    />
                  </div>
                </div>
              </Card>
            )}

            {(currentDemo === "panel" || currentDemo === "tutorial") && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  {currentDemo === "panel"
                    ? "Help Panel Demo"
                    : "Tutorial Demo"}
                </h2>
                <p className="text-gray-600 mb-6">
                  {currentDemo === "panel"
                    ? "The help panel shows contextual help based on your current step and experience level."
                    : "Interactive tutorials guide you through complex processes with visual highlights and step-by-step instructions."}
                </p>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-900">
                        {currentDemo === "panel"
                          ? "Help Panel Active"
                          : "Tutorial Available"}
                      </span>
                    </div>
                    <p className="text-sm text-blue-700">
                      {currentDemo === "panel"
                        ? "Check the panel on the right for contextual help and suggestions."
                        : 'Click "Start Tutorial" in the help panel to begin an interactive tutorial.'}
                    </p>
                  </div>

                  {experienceLevel === "novice" && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">
                        Beginner Tip
                      </h4>
                      <p className="text-sm text-green-700">
                        As a novice user, you&apos;ll see more detailed
                        explanations and step-by-step guidance.
                      </p>
                    </div>
                  )}

                  {experienceLevel === "expert" && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-2">
                        Expert Mode
                      </h4>
                      <p className="text-sm text-purple-700">
                        Expert users see concise help content and advanced
                        features like keyboard shortcuts.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Help Panel */}
          <div className="space-y-6">
            <ContextualHelpPanel position="inline" />

            {/* Features List */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Demo Features</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    ✓
                  </Badge>
                  <span>Experience level adaptation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    ✓
                  </Badge>
                  <span>Context-aware help content</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    ✓
                  </Badge>
                  <span>Interactive tooltips</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    ✓
                  </Badge>
                  <span>Smart suggestions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    ✓
                  </Badge>
                  <span>Guided tutorials</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    ✓
                  </Badge>
                  <span>Mobile optimization</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Interactive Tutorial */}
        <InteractiveTutorial />
      </div>
    </HelpProvider>
  );
}

export default HelpSystemDemo;
