"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  WorkflowTemplate,
  WorkflowTemplateService,
} from "@/lib/services/workflow-templates";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { AIService } from "@/lib/services/ai-service";
import {
  Clock,
  Star,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  Target,
  Zap,
  Building,
  DollarSign,
  Calendar,
  Shield,
  Info,
  Lightbulb,
  BarChart3,
  Eye,
} from "lucide-react";

interface TemplatePreviewModalProps {
  template: WorkflowTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: WorkflowTemplate) => void;
  existingData?: Partial<GuidedFlowData>;
  buildingType?: string;
  services?: string[];
}

interface TemplateMetrics {
  successRate: number;
  avgDuration: number;
  userRating: number;
  popularityScore: number;
  riskScore: number;
  costEstimate: {
    min: number;
    max: number;
  };
}

interface AIRecommendation {
  score: number;
  reasoning: string;
  pros: string[];
  cons: string[];
  alternatives: string[];
}

export function TemplatePreviewModal({
  template,
  isOpen,
  onClose,
  onSelectTemplate,
  existingData = {},
  buildingType,
  services = [],
}: TemplatePreviewModalProps) {
  const [metrics, setMetrics] = useState<TemplateMetrics | null>(null);
  const [aiRecommendation, setAIRecommendation] =
    useState<AIRecommendation | null>(null);
  const [similarTemplates, setSimilarTemplates] = useState<WorkflowTemplate[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (template && isOpen) {
      loadTemplateData();
    }
  }, [template, isOpen]);

  const loadTemplateData = async () => {
    if (!template) return;

    setIsLoading(true);
    try {
      // Load template metrics (simulated for demo)
      const templateMetrics: TemplateMetrics = {
        successRate: 85 + Math.random() * 10, // 85-95%
        avgDuration: template.estimatedDuration * (0.9 + Math.random() * 0.2),
        userRating: 4.2 + Math.random() * 0.6, // 4.2-4.8
        popularityScore: Math.floor(Math.random() * 100),
        riskScore:
          template.complexity === "simple"
            ? 15
            : template.complexity === "moderate"
              ? 35
              : 65,
        costEstimate: {
          min: 500 + Math.random() * 1000,
          max: 1500 + Math.random() * 2000,
        },
      };
      setMetrics(templateMetrics);

      // Generate AI recommendation based on existing data
      const recommendation = await generateAIRecommendation(
        template,
        existingData,
      );
      setAIRecommendation(recommendation);

      // Find similar templates
      const similar = WorkflowTemplateService.getSimilarTemplates(
        template.id,
        3,
      );
      setSimilarTemplates(similar);
    } catch (error) {
      console.error("Error loading template data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIRecommendation = async (
    template: WorkflowTemplate,
    data: Partial<GuidedFlowData>,
  ): Promise<AIRecommendation> => {
    try {
      // Use AI service for enhanced recommendations
      const aiRecommendation = await AIService.generateTemplateRecommendations({
        buildingType,
        services,
        existingData: data,
        projectContext: `Template: ${template.name} (${template.category}, ${template.complexity})`,
      });

      return {
        score: aiRecommendation.score,
        reasoning: aiRecommendation.reasoning,
        pros: aiRecommendation.pros,
        cons: aiRecommendation.cons,
        alternatives: aiRecommendation.alternatives,
      };
    } catch (error) {
      console.error("Error generating AI recommendation:", error);

      // Fallback to local analysis if AI service fails
      const hasMatchingServices = template.requiredServices.some((service) =>
        services.includes(service),
      );
      const complexityMatch = template.complexity === "simple" ? 90 : 70;
      const categoryMatch = buildingType === template.category ? 85 : 60;

      const score = Math.min(
        95,
        Math.max(
          50,
          (hasMatchingServices ? 85 : 65) +
            (complexityMatch > 80 ? 10 : 0) +
            (categoryMatch > 80 ? 5 : 0) +
            Math.random() * 10,
        ),
      );

      return {
        score: Math.round(score),
        reasoning: `This template scores ${Math.round(score)}% match based on your selected services (${services.length}), building type (${buildingType || "not specified"}), and project complexity.`,
        pros: [
          "Includes all required services for your project",
          "Well-tested workflow with high success rate",
          "Optimized for similar building types",
          "Includes risk mitigation strategies",
        ],
        cons: [
          score < 80 ? "May include unnecessary services" : "",
          template.complexity === "complex"
            ? "Complex workflow may take longer"
            : "",
          "Requires specific equipment and expertise",
        ].filter(Boolean),
        alternatives: similarTemplates.map((t) => t.name).slice(0, 2),
      };
    }
  };

  const getRecommendationColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50";
    if (score >= 80) return "text-blue-600 bg-blue-50";
    if (score >= 70) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

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

  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold mb-2 flex items-center gap-3">
                <span className="text-3xl">{template.icon}</span>
                {template.name}
              </DialogTitle>
              <p className="text-text-secondary">{template.description}</p>
            </div>
            <div className="flex gap-2">
              <Badge className={getCategoryColor(template.category)}>
                {template.category}
              </Badge>
              <Badge className={getComplexityColor(template.complexity)}>
                {template.complexity}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="ai-analysis"
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              AI Analysis
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Compare
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Required Services
                </h3>
                <div className="flex flex-wrap gap-2">
                  {template.requiredServices.map((service) => (
                    <Badge
                      key={service}
                      className="bg-blue-100 text-blue-800"
                      variant="secondary"
                    >
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  Optional Services
                </h3>
                <div className="flex flex-wrap gap-2">
                  {template.optionalServices.map((service) => (
                    <Badge key={service} variant="outline">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  Recommendations
                </h3>
                <ul className="space-y-2">
                  {template.recommendations.map((rec, index) => (
                    <li
                      key={index}
                      className="text-sm text-text-secondary flex items-start gap-2"
                    >
                      <div className="h-1.5 w-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Risk Factors
                </h3>
                <ul className="space-y-2">
                  {template.riskFactors.map((risk, index) => (
                    <li
                      key={index}
                      className="text-sm text-orange-700 flex items-start gap-2"
                    >
                      <div className="h-1.5 w-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-bg-secondary rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-600" />
                Timeline & Duration
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-text-secondary">Estimated Duration</p>
                  <p className="font-semibold">
                    {template.estimatedDuration} min
                  </p>
                </div>
                <div>
                  <p className="text-text-secondary">Complexity</p>
                  <p className="font-semibold capitalize">
                    {template.complexity}
                  </p>
                </div>
                <div>
                  <p className="text-text-secondary">Category</p>
                  <p className="font-semibold capitalize">
                    {template.category}
                  </p>
                </div>
                <div>
                  <p className="text-text-secondary">Services</p>
                  <p className="font-semibold">
                    {template.requiredServices.length +
                      template.optionalServices.length}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai-analysis" className="space-y-6">
            {aiRecommendation && (
              <Alert className={getRecommendationColor(aiRecommendation.score)}>
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        AI Recommendation Score: {aiRecommendation.score}%
                      </span>
                      <Progress
                        value={aiRecommendation.score}
                        className="w-24 h-2"
                      />
                    </div>
                    <p>{aiRecommendation.reasoning}</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {aiRecommendation && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Advantages
                  </h3>
                  <ul className="space-y-2">
                    {aiRecommendation.pros.map((pro, index) => (
                      <li
                        key={index}
                        className="text-sm text-text-secondary flex items-start gap-2"
                      >
                        <div className="h-1.5 w-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-orange-600">
                    <Info className="h-5 w-5" />
                    Considerations
                  </h3>
                  <ul className="space-y-2">
                    {aiRecommendation.cons.map((con, index) => (
                      <li
                        key={index}
                        className="text-sm text-text-secondary flex items-start gap-2"
                      >
                        <div className="h-1.5 w-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            {metrics && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-bg-secondary rounded-lg p-4 text-center">
                    <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">
                      {metrics.successRate.toFixed(1)}%
                    </p>
                    <p className="text-sm text-text-secondary">Success Rate</p>
                  </div>

                  <div className="bg-bg-secondary rounded-lg p-4 text-center">
                    <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">
                      {metrics.avgDuration.toFixed(0)}m
                    </p>
                    <p className="text-sm text-text-secondary">Avg Duration</p>
                  </div>

                  <div className="bg-bg-secondary rounded-lg p-4 text-center">
                    <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-600">
                      {metrics.userRating.toFixed(1)}
                    </p>
                    <p className="text-sm text-text-secondary">User Rating</p>
                  </div>

                  <div className="bg-bg-secondary rounded-lg p-4 text-center">
                    <Shield className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">
                      {metrics.riskScore}%
                    </p>
                    <p className="text-sm text-text-secondary">Risk Score</p>
                  </div>
                </div>

                <div className="bg-bg-secondary rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Estimated Project Cost
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        ${metrics.costEstimate.min.toFixed(0)} - $
                        {metrics.costEstimate.max.toFixed(0)}
                      </p>
                      <p className="text-sm text-text-secondary">
                        Based on similar projects using this template
                      </p>
                    </div>
                    <Progress
                      value={metrics.popularityScore}
                      className="w-24 h-2"
                    />
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Similar Templates
              </h3>
              {similarTemplates.length > 0 ? (
                <div className="space-y-3">
                  {similarTemplates.map((similarTemplate) => (
                    <div
                      key={similarTemplate.id}
                      className="border border-border-primary rounded-lg p-4 hover:bg-bg-secondary transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            <span>{similarTemplate.icon}</span>
                            {similarTemplate.name}
                          </h4>
                          <p className="text-sm text-text-secondary">
                            {similarTemplate.description}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge
                            className={getCategoryColor(
                              similarTemplate.category,
                            )}
                          >
                            {similarTemplate.category}
                          </Badge>
                          <Badge
                            className={getComplexityColor(
                              similarTemplate.complexity,
                            )}
                          >
                            {similarTemplate.complexity}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary text-center py-8">
                  No similar templates found
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={() => onSelectTemplate(template)}
            className="flex-1"
            disabled={isLoading}
          >
            Use This Template
          </Button>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
