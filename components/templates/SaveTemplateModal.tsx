"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, X, Plus, AlertCircle } from "lucide-react";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { WorkflowTemplate } from "@/lib/services/workflow-templates";
import { toast } from "@/hooks/use-toast";

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  flowData: GuidedFlowData;
  onSave: (template: Partial<WorkflowTemplate>) => Promise<void>;
}

export default function SaveTemplateModal({
  isOpen,
  onClose,
  flowData,
  onSave,
}: SaveTemplateModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("commercial");
  const [complexity, setComplexity] = useState<string>("moderate");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recommendationInput, setRecommendationInput] = useState("");

  // Extract services from flow data
  const requiredServices = flowData.scopeDetails?.selectedServices || [];
  const estimatedDuration = flowData.duration?.estimatedDuration || 0;

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleAddRecommendation = () => {
    if (recommendationInput.trim()) {
      setRecommendations([...recommendations, recommendationInput.trim()]);
      setRecommendationInput("");
    }
  };

  const handleRemoveRecommendation = (index: number) => {
    setRecommendations(recommendations.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Template name required",
        description: "Please enter a name for your template",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const template: Partial<WorkflowTemplate> = {
        name: templateName,
        description: description || `Custom template based on ${templateName}`,
        category: category as any,
        tags,
        estimatedDuration: estimatedDuration * 60, // Convert hours to minutes
        complexity: complexity as any,
        requiredServices,
        optionalServices: [],
        defaultData: flowData,
        conditionalRules: [],
        recommendations,
        riskFactors: [],
        icon: getIconForCategory(category),
      };

      await onSave(template);

      toast({
        title: "Template saved",
        description: "Your template has been saved successfully",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Failed to save template",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getIconForCategory = (category: string): string => {
    switch (category) {
      case "commercial":
        return "🏢";
      case "residential":
        return "🏠";
      case "industrial":
        return "🏭";
      case "specialty":
        return "⭐";
      default:
        return "📄";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Save as Template</DialogTitle>
              <DialogDescription>
                Create a reusable template from this estimate configuration
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Template Name */}
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name *</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Office Building Standard Clean"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe when to use this template..."
                  rows={3}
                />
              </div>

              {/* Category and Complexity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="specialty">Specialty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Complexity</Label>
                  <Select value={complexity} onValueChange={setComplexity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="complex">Complex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), handleAddTag())
                    }
                    placeholder="Add tag..."
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddTag}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-2">
                <Label>Best Practices & Recommendations</Label>
                <div className="flex gap-2">
                  <Input
                    value={recommendationInput}
                    onChange={(e) => setRecommendationInput(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(), handleAddRecommendation())
                    }
                    placeholder="Add recommendation..."
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddRecommendation}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <ul className="space-y-1 mt-2">
                  {recommendations.map((rec, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-text-secondary"
                    >
                      <span className="text-accent-primary">•</span>
                      <span className="flex-1">{rec}</span>
                      <button
                        onClick={() => handleRemoveRecommendation(idx)}
                        className="text-text-tertiary hover:text-error-primary"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Info Alert */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This template will include the current customer info,
                  services, pricing, and other configuration from this estimate.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Save className="h-4 w-4 mr-2" />
                    </motion.div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
