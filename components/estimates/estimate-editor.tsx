"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  useEstimateStore,
  type Estimate,
  type EstimateService,
} from "@/lib/stores/estimate-store";

// Import new modular components
import { EstimateHeader } from "./estimate-header";
import { CustomerInfoSection } from "./customer-info-section";
import { BuildingInfoSection } from "./building-info-section";
import { ServicesSection } from "./services-section";
import { EstimateSummarySection } from "./estimate-summary-section";
import { NotesSection } from "./notes-section";

const estimateSchema = z.object({
  customer_name: z.string().min(2, "Customer name is required"),
  customer_email: z.string().email("Valid email is required"),
  customer_phone: z.string().min(10, "Valid phone number is required"),
  company_name: z.string().optional(),
  building_name: z.string().min(2, "Building name is required"),
  building_address: z.string().min(5, "Building address is required"),
  building_height_stories: z
    .number()
    .min(1, "Building height must be at least 1 story"),
  building_height_feet: z.number().optional(),
  building_type: z.string().optional(),
  status: z.enum(["draft", "sent", "approved", "rejected"]),
  notes: z.string().optional(),
});

type EstimateFormData = z.infer<typeof estimateSchema>;

interface EstimateEditorProps {
  estimateId?: string;
  onSave?: (estimateId: string) => void;
  onCancel?: () => void;
}

export function EstimateEditor({
  estimateId,
  onSave,
  onCancel,
}: EstimateEditorProps) {
  const [isEditing, setIsEditing] = useState(!estimateId);
  const [notesContent, setNotesContent] = useState("");

  const {
    currentEstimate,
    services,
    isSaving,
    isLoading,
    setCustomerInfo,
    addService,
    removeService,
    saveEstimate,
    createEstimate,
    loadEstimate,
    calculateTotal,
  } = useEstimateStore();

  const form = useForm<EstimateFormData>({
    resolver: zodResolver(estimateSchema),
    defaultValues: {
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      company_name: "",
      building_name: "",
      building_address: "",
      building_height_stories: 1,
      building_height_feet: undefined,
      building_type: "",
      status: "draft",
      notes: "",
    },
  });

  // Load estimate data when component mounts
  useEffect(() => {
    if (estimateId) {
      loadEstimate(estimateId);
    }
  }, [estimateId, loadEstimate]);

  // Update form when estimate data changes
  useEffect(() => {
    if (currentEstimate) {
      form.reset({
        customer_name: currentEstimate.customer_name || "",
        customer_email: currentEstimate.customer_email || "",
        customer_phone: currentEstimate.customer_phone || "",
        company_name: currentEstimate.company_name || "",
        building_name: currentEstimate.building_name || "",
        building_address: currentEstimate.building_address || "",
        building_height_stories: currentEstimate.building_height_stories || 1,
        building_height_feet: currentEstimate.building_height_feet || undefined,
        building_type: currentEstimate.building_type || "",
        status: currentEstimate.status || "draft",
        notes: currentEstimate.notes || "",
      });
      setNotesContent(currentEstimate.notes || "");
    }
  }, [currentEstimate, form]);

  const onSubmit = async (data: EstimateFormData) => {
    const estimateData = {
      ...data,
      notes: notesContent,
      total_price: calculateTotal(),
      services,
    };

    setCustomerInfo(estimateData);

    try {
      let resultEstimateId: string | null = null;

      if (currentEstimate?.id) {
        const success = await saveEstimate();
        if (success) {
          resultEstimateId = currentEstimate.id;
        }
      } else {
        resultEstimateId = await createEstimate();
      }

      if (resultEstimateId) {
        setIsEditing(false);
        onSave?.(resultEstimateId);
      }
    } catch (error) {
      console.error("Error saving estimate:", error);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    if (currentEstimate) {
      form.reset();
      setIsEditing(false);
    } else {
      onCancel?.();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleAddService = () => {
    // TODO: Implement service addition modal/flow
    console.log("Add service clicked");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <EstimateHeader
        estimate={currentEstimate}
        isEditing={isEditing}
        onEditToggle={handleEditToggle}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Information */}
          <CustomerInfoSection form={form} isEditing={isEditing} />

          {/* Building Information */}
          <BuildingInfoSection form={form} isEditing={isEditing} />

          {/* Services */}
          <ServicesSection
            services={services}
            isEditing={isEditing}
            onAddService={handleAddService}
            onRemoveService={removeService}
            formatCurrency={formatCurrency}
          />

          {/* Estimate Summary */}
          <EstimateSummarySection
            form={form}
            isEditing={isEditing}
            totalPrice={calculateTotal()}
            formatCurrency={formatCurrency}
          />

          {/* Notes */}
          <NotesSection
            notesContent={notesContent}
            isEditing={isEditing}
            onNotesChange={setNotesContent}
          />

          {/* Actions */}
          {isEditing && (
            <div className="flex items-center justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Estimate"}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
