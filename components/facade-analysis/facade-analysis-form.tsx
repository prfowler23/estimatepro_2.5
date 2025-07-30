"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFacadeAnalysisSchema } from "@/lib/schemas/facade-analysis-schema";
import { CreateFacadeAnalysisInput } from "@/lib/types/facade-analysis-types";
import { Building2, MapPin, FileText, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { z } from "zod";
import { ComponentErrorBoundary } from "@/components/error-handling/component-error-boundary";

interface FacadeAnalysisFormProps {
  estimateId: string;
  onSuccess?: (analysisId: string) => void;
  onCancel?: () => void;
}

function FacadeAnalysisFormComponent({
  estimateId,
  onSuccess,
  onCancel,
}: FacadeAnalysisFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateFacadeAnalysisInput>({
    resolver: zodResolver(createFacadeAnalysisSchema),
    defaultValues: {
      estimate_id: estimateId,
      building_name: "",
      building_type: "commercial",
      location: "",
      notes: "",
    },
  });

  const onSubmit = async (data: CreateFacadeAnalysisInput) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/facade-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create facade analysis");
      }

      const result = await response.json();

      toast({
        title: "Facade analysis created",
        description: "You can now upload images and run AI analysis",
      });

      onSuccess?.(result.analysis.id);
    } catch (error) {
      toast({
        title: "Failed to create analysis",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Create Facade Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="building_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Building Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., One Market Plaza"
                      {...field}
                      icon={<Building2 className="h-4 w-4" />}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional name to identify this building
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="building_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Building Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="mixed_use">Mixed Use</SelectItem>
                      <SelectItem value="institutional">
                        Institutional
                      </SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="educational">Educational</SelectItem>
                      <SelectItem value="hospitality">Hospitality</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The primary use of the building
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Downtown San Francisco"
                      {...field}
                      value={field.value || ""}
                      icon={<MapPin className="h-4 w-4" />}
                    />
                  </FormControl>
                  <FormDescription>General location or address</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about the building or special considerations..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional notes or special instructions
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4 mr-2" />
                    Create Analysis
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Export wrapped with error boundary
export function FacadeAnalysisForm(props: FacadeAnalysisFormProps) {
  return (
    <ComponentErrorBoundary
      componentName="FacadeAnalysisForm"
      showDetails={process.env.NODE_ENV === "development"}
    >
      <FacadeAnalysisFormComponent {...props} />
    </ComponentErrorBoundary>
  );
}
