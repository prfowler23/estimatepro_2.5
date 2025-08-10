"use client";

import { useState, useCallback, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, AlertCircle } from "lucide-react";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { WorkflowTemplate } from "@/lib/services/workflow-templates";
import { toast } from "@/components/ui/use-toast";
import TagInput from "./TagInput";
import RecommendationsList from "./RecommendationsList";

// Input sanitization utility
const sanitizeInput = (input: string): string => {
  // Remove potentially dangerous HTML tags and script content
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
};

// Template categories and complexity levels
type TemplateCategory =
  | "commercial"
  | "residential"
  | "industrial"
  | "specialty";
type TemplateComplexity = "simple" | "moderate" | "complex";

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
    )
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .transform((val) => val?.trim() || "")
    .optional(),
  category: z.enum(["commercial", "residential", "industrial", "specialty"], {
    required_error: "Please select a category",
  }),
  complexity: z.enum(["simple", "moderate", "complex"], {
    required_error: "Please select a complexity level",
  }),
  tags: z
    .array(z.string().trim().min(1, "Tag cannot be empty"))
    .max(10, "Maximum 10 tags allowed")
    .optional(),
  recommendations: z
    .array(z.string().trim().min(1, "Recommendation cannot be empty"))
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

  // Extract services from flow data with memoization
  const requiredServices = useMemo(
    () => flowData.scopeDetails?.selectedServices || [],
    [flowData.scopeDetails?.selectedServices],
  );
  const estimatedDuration = useMemo(
    () => flowData.duration?.estimatedDuration || 0,
    [flowData.duration?.estimatedDuration],
  );

  const handleTagsChange = useCallback(
    (newTags: string[]) => {
      form.setValue("tags", newTags);
    },
    [form],
  );

  const handleRecommendationsChange = useCallback(
    (newRecommendations: string[]) => {
      form.setValue("recommendations", newRecommendations);
    },
    [form],
  );

  const onSubmit = async (data: TemplateFormData) => {
    setIsLoading(true);
    try {
      // Sanitize all text inputs before creating template
      const sanitizedTemplate: Partial<WorkflowTemplate> = {
        name: sanitizeInput(data.name),
        description: data.description
          ? sanitizeInput(data.description)
          : `Custom template based on ${sanitizeInput(data.name)}`,
        category: data.category,
        tags: (data.tags || []).map((tag) => sanitizeInput(tag)),
        estimatedDuration: estimatedDuration * 60, // Convert hours to minutes
        complexity: data.complexity,
        requiredServices,
        optionalServices: [],
        defaultData: flowData,
        conditionalRules: [],
        recommendations: (data.recommendations || []).map((rec) =>
          sanitizeInput(rec),
        ),
        riskFactors: [],
        icon: getIconForCategory(data.category),
      };

      await onSave(sanitizedTemplate);

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
                <TagInput
                  tags={form.watch("tags") || []}
                  onTagsChange={handleTagsChange}
                  disabled={isLoading}
                />

                {/* Recommendations */}
                <RecommendationsList
                  recommendations={form.watch("recommendations") || []}
                  onRecommendationsChange={handleRecommendationsChange}
                  disabled={isLoading}
                />

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
