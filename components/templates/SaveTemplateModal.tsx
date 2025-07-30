"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, X, Plus, AlertCircle } from "lucide-react";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { WorkflowTemplate } from "@/lib/services/workflow-templates";
import { toast } from "@/components/ui/use-toast";

// Validation schema for template form
const templateFormSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .min(3, "Template name must be at least 3 characters")
    .max(100, "Template name must be less than 100 characters")
    .regex(
      /^[a-zA-Z0-9\s\-_()]+$/,
      "Template name can only contain letters, numbers, spaces, hyphens, underscores, and parentheses",
    ),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  category: z.enum(["commercial", "residential", "industrial", "specialty"], {
    required_error: "Please select a category",
  }),
  complexity: z.enum(["simple", "moderate", "complex"], {
    required_error: "Please select a complexity level",
  }),
  tags: z.array(z.string()).max(10, "Maximum 10 tags allowed").optional(),
  recommendations: z
    .array(z.string())
    .max(20, "Maximum 20 recommendations allowed")
    .optional(),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

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
  const [tagInput, setTagInput] = useState("");
  const [recommendationInput, setRecommendationInput] = useState("");

  // Form setup for validation
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "commercial",
      complexity: "moderate",
      tags: [],
      recommendations: [],
    },
  });

  // Extract services from flow data
  const requiredServices = flowData.scopeDetails?.selectedServices || [];
  const estimatedDuration = flowData.duration?.estimatedDuration || 0;

  const handleAddTag = () => {
    const currentTags = form.getValues("tags") || [];
    if (tagInput.trim() && !currentTags.includes(tagInput.trim())) {
      const newTags = [...currentTags, tagInput.trim().toLowerCase()];
      form.setValue("tags", newTags);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue(
      "tags",
      currentTags.filter((t) => t !== tag),
    );
  };

  const handleAddRecommendation = () => {
    const currentRecommendations = form.getValues("recommendations") || [];
    if (recommendationInput.trim()) {
      const newRecommendations = [
        ...currentRecommendations,
        recommendationInput.trim(),
      ];
      form.setValue("recommendations", newRecommendations);
      setRecommendationInput("");
    }
  };

  const handleRemoveRecommendation = (index: number) => {
    const currentRecommendations = form.getValues("recommendations") || [];
    form.setValue(
      "recommendations",
      currentRecommendations.filter((_, i) => i !== index),
    );
  };

  const onSubmit = async (data: TemplateFormData) => {
    setIsLoading(true);
    try {
      const template: Partial<WorkflowTemplate> = {
        name: data.name,
        description:
          data.description || `Custom template based on ${data.name}`,
        category: data.category as any,
        tags: data.tags || [],
        estimatedDuration: estimatedDuration * 60, // Convert hours to minutes
        complexity: data.complexity as any,
        requiredServices,
        optionalServices: [],
        defaultData: flowData,
        conditionalRules: [],
        recommendations: data.recommendations || [],
        riskFactors: [],
        icon: getIconForCategory(data.category),
      };

      await onSave(template);

      toast({
        title: "Template saved",
        description: "Your template has been saved successfully",
      });

      form.reset();
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

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 py-4"
              >
                {/* Template Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Office Building Standard Clean"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe when to use this template..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category and Complexity */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="commercial">
                              Commercial
                            </SelectItem>
                            <SelectItem value="residential">
                              Residential
                            </SelectItem>
                            <SelectItem value="industrial">
                              Industrial
                            </SelectItem>
                            <SelectItem value="specialty">Specialty</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="complexity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complexity</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="simple">Simple</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="complex">Complex</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), handleAddTag())
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
                    {(form.watch("tags") || []).map((tag) => (
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
                    {(form.watch("recommendations") || []).map((rec, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="text-primary">•</span>
                        <span className="flex-1">{rec}</span>
                        <button
                          onClick={() => handleRemoveRecommendation(idx)}
                          className="text-muted-foreground hover:text-destructive"
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
                    services, pricing, and other configuration from this
                    estimate.
                  </AlertDescription>
                </Alert>
              </form>
            </Form>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isLoading || !form.formState.isValid}
              >
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
