"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
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

// Import optimized components
import {
  EstimateHeader,
  CustomerInfoSection,
  BuildingInfoSection,
  ServicesSection,
  EstimateSummarySection,
  NotesSection,
  OptimizedEstimateComponent,
  HeaderSkeleton,
  SectionSkeleton,
} from "./estimate-editor-lazy";

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

interface EstimateEditorOptimizedProps {
  estimateId?: string;
  onSave?: (estimateId: string) => void;
  onCancel?: () => void;
}

// Memoized currency formatter
const useCurrencyFormatter = () => {
  return useMemo(
    () => (amount: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    },
    [],
  );
};

// Memoized sections to prevent unnecessary re-renders
const MemoizedCustomerSection = memo(CustomerInfoSection);
const MemoizedBuildingSection = memo(BuildingInfoSection);
const MemoizedServicesSection = memo(ServicesSection);
const MemoizedSummarySection = memo(EstimateSummarySection);
const MemoizedNotesSection = memo(NotesSection);

export function EstimateEditorOptimized({
  estimateId,
  onSave,
  onCancel,
}: EstimateEditorOptimizedProps) {
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

  const formatCurrency = useCurrencyFormatter();

  // Memoized total price calculation
  const totalPrice = useMemo(() => calculateTotal(), [calculateTotal]);

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

  // Memoized callbacks to prevent unnecessary re-renders
  const handleSubmit = useCallback(
    async (data: EstimateFormData) => {
      const estimateData = {
        ...data,
        notes: notesContent,
        total_price: totalPrice,
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
    },
    [
      notesContent,
      totalPrice,
      services,
      setCustomerInfo,
      currentEstimate?.id,
      saveEstimate,
      createEstimate,
      onSave,
    ],
  );

  const handleEditToggle = useCallback(() => {
    setIsEditing(!isEditing);
  }, [isEditing]);

  const handleCancel = useCallback(() => {
    if (currentEstimate) {
      form.reset();
      setIsEditing(false);
    } else {
      onCancel?.();
    }
  }, [currentEstimate, form, onCancel]);

  const handleAddService = useCallback(() => {
    // TODO: Implement service addition modal/flow
    console.log("Add service clicked");
  }, []);

  const handleNotesChange = useCallback((notes: string) => {
    setNotesContent(notes);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <HeaderSkeleton />
        <SectionSkeleton title="Customer Information" />
        <SectionSkeleton title="Building Information" />
        <SectionSkeleton title="Services" />
        <SectionSkeleton title="Estimate Summary" />
        <SectionSkeleton title="Notes" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Always visible, no lazy loading needed */}
      <EstimateHeader
        estimate={currentEstimate}
        isEditing={isEditing}
        onEditToggle={handleEditToggle}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Customer Information */}
          <OptimizedEstimateComponent
            fallback={<SectionSkeleton title="Customer Information" />}
          >
            <MemoizedCustomerSection form={form} isEditing={isEditing} />
          </OptimizedEstimateComponent>

          {/* Building Information */}
          <OptimizedEstimateComponent
            fallback={<SectionSkeleton title="Building Information" />}
          >
            <MemoizedBuildingSection form={form} isEditing={isEditing} />
          </OptimizedEstimateComponent>

          {/* Services */}
          <OptimizedEstimateComponent
            fallback={<SectionSkeleton title="Services" />}
          >
            <MemoizedServicesSection
              services={services}
              isEditing={isEditing}
              onAddService={handleAddService}
              onRemoveService={removeService}
              formatCurrency={formatCurrency}
            />
          </OptimizedEstimateComponent>

          {/* Estimate Summary */}
          <OptimizedEstimateComponent
            fallback={<SectionSkeleton title="Estimate Summary" />}
          >
            <MemoizedSummarySection
              form={form}
              isEditing={isEditing}
              totalPrice={totalPrice}
              formatCurrency={formatCurrency}
            />
          </OptimizedEstimateComponent>

          {/* Notes */}
          <OptimizedEstimateComponent
            fallback={<SectionSkeleton title="Notes" />}
          >
            <MemoizedNotesSection
              notesContent={notesContent}
              isEditing={isEditing}
              onNotesChange={handleNotesChange}
            />
          </OptimizedEstimateComponent>

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
