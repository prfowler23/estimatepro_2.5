"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  WorkflowTemplateService,
  WorkflowTemplate,
} from "@/lib/services/workflow-templates";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import {
  Search,
  Clock,
  AlertTriangle,
  CheckCircle,
  Star,
  Filter,
} from "lucide-react";

interface TemplateSelectorProps {
  onSelectTemplate: (
    template: WorkflowTemplate,
    appliedData: GuidedFlowData,
  ) => void;
  onSkipTemplate: () => void;
  existingData?: Partial<GuidedFlowData>;
  buildingType?: string;
  services?: string[];
}

export function TemplateSelector({
  onSelectTemplate,
  onSkipTemplate,
  existingData = {},
  buildingType,
  services = [],
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedComplexity, setSelectedComplexity] = useState<string>("all");
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [suggestedTemplates, setSuggestedTemplates] = useState<
    WorkflowTemplate[]
  >([]);
  const [popularTemplates, setPopularTemplates] = useState<WorkflowTemplate[]>(
    [],
  );
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkflowTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    // Load all templates
    const allTemplates = WorkflowTemplateService.getAllTemplates();
    setTemplates(allTemplates);

    // Get AI suggestions based on existing data
    const suggestions = WorkflowTemplateService.suggestTemplates(
      buildingType,
      services,
      undefined,
      undefined,
    );
    setSuggestedTemplates(suggestions);

    // Get popular templates
    const popular = WorkflowTemplateService.getPopularTemplates(3);
    setPopularTemplates(popular);
  }, [buildingType, services && services.length > 0 ? services.join(",") : ""]);

  // Filter templates based on search and filters
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;
    const matchesComplexity =
      selectedComplexity === "all" ||
      template.complexity === selectedComplexity;

    return matchesSearch && matchesCategory && matchesComplexity;
  });

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    try {
      const appliedData = WorkflowTemplateService.applyTemplate(
        template.id,
        existingData,
      );
      onSelectTemplate(template, appliedData);
    } catch (error) {
      console.error("Error applying template:", error);
    }
  };

  const handlePreviewTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "commercial", label: "Commercial" },
    { value: "residential", label: "Residential" },
    { value: "industrial", label: "Industrial" },
    { value: "specialty", label: "Specialty" },
  ];

  const complexities = [
    { value: "all", label: "All Complexities" },
    { value: "simple", label: "Simple" },
    { value: "moderate", label: "Moderate" },
    { value: "complex", label: "Complex" },
  ];

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "simple":
        return "bg-green-100 text-green-800";
      case "moderate":
        return "bg-yellow-100 text-yellow-800";
      case "complex":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "commercial":
        return "bg-blue-100 text-blue-800";
      case "residential":
        return "bg-green-100 text-green-800";
      case "industrial":
        return "bg-purple-100 text-purple-800";
      case "specialty":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Choose a Workflow Template
        </h1>
        <p className="text-gray-600">
          Select a pre-configured template to streamline your estimation
          process, or skip to start with a blank workflow.
        </p>
      </div>

      {/* AI Suggestions */}
      {suggestedTemplates.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-yellow-500" />
            <h2 className="text-xl font-semibold">Recommended for You</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedTemplates.map((template) => (
              <Card
                key={template.id}
                className="p-4 border-2 border-yellow-200 bg-yellow-50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-2xl">{template.icon}</div>
                  <Badge className={getComplexityColor(template.complexity)}>
                    {template.complexity}
                  </Badge>
                </div>
                <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {template.description}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {template.estimatedDuration} min
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSelectTemplate(template)}
                    size="sm"
                    className="flex-1"
                  >
                    Use Template
                  </Button>
                  <Button
                    onClick={() => handlePreviewTemplate(template)}
                    variant="outline"
                    size="sm"
                  >
                    Preview
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <select
              value={selectedComplexity}
              onChange={(e) => setSelectedComplexity(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {complexities.map((comp) => (
                <option key={comp.value} value={comp.value}>
                  {comp.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Popular Templates */}
      {popularTemplates.length > 0 &&
        searchQuery === "" &&
        selectedCategory === "all" &&
        selectedComplexity === "all" && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Popular Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {popularTemplates.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-2xl">{template.icon}</div>
                    <div className="flex gap-1">
                      <Badge className={getCategoryColor(template.category)}>
                        {template.category}
                      </Badge>
                      <Badge
                        className={getComplexityColor(template.complexity)}
                      >
                        {template.complexity}
                      </Badge>
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    {template.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {template.estimatedDuration} min
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSelectTemplate(template)}
                      size="sm"
                      className="flex-1"
                    >
                      Use Template
                    </Button>
                    <Button
                      onClick={() => handlePreviewTemplate(template)}
                      variant="outline"
                      size="sm"
                    >
                      Preview
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

      {/* All Templates */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          All Templates ({filteredTemplates.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-2xl">{template.icon}</div>
                <div className="flex gap-1">
                  <Badge className={getCategoryColor(template.category)}>
                    {template.category}
                  </Badge>
                  <Badge className={getComplexityColor(template.complexity)}>
                    {template.complexity}
                  </Badge>
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {template.description}
              </p>

              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {template.estimatedDuration} min
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {template.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {template.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{template.tags.length - 3}
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleSelectTemplate(template)}
                  size="sm"
                  className="flex-1"
                >
                  Use Template
                </Button>
                <Button
                  onClick={() => handlePreviewTemplate(template)}
                  variant="outline"
                  size="sm"
                >
                  Preview
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Skip Template Option */}
      <div className="flex justify-center">
        <Button onClick={onSkipTemplate} variant="outline" className="px-8">
          Skip Template - Start Blank Workflow
        </Button>
      </div>

      {/* Template Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    {selectedTemplate.name}
                  </h2>
                  <p className="text-gray-600">
                    {selectedTemplate.description}
                  </p>
                </div>
                <Button
                  onClick={() => setShowPreview(false)}
                  variant="ghost"
                  size="sm"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Required Services</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.requiredServices.map((service) => (
                      <Badge
                        key={service}
                        className="bg-blue-100 text-blue-800"
                      >
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Optional Services</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.optionalServices.map((service) => (
                      <Badge key={service} variant="secondary">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Recommendations</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {selectedTemplate.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Risk Factors</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {selectedTemplate.riskFactors.map((risk, index) => (
                      <li key={index} className="text-orange-700">
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t">
                <Button
                  onClick={() => {
                    handleSelectTemplate(selectedTemplate);
                    setShowPreview(false);
                  }}
                  className="flex-1"
                >
                  Use This Template
                </Button>
                <Button onClick={() => setShowPreview(false)} variant="outline">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
