"use client";

import { useState, useEffect } from "react";
import { userAction } from "@/lib/utils/logger";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { SERVICE_TYPES } from "@/lib/calculations/constants";
import {
  LazyGlassRestorationForm,
  LazyWindowCleaningForm,
  LazyPressureWashingForm,
  LazyPressureWashSealForm,
  LazyFinalCleanForm,
  LazyFrameRestorationForm,
  LazyHighDustingForm,
  LazySoftWashingForm,
  LazyParkingDeckForm,
  LazyGraniteReconditioningForm,
  LazyBiofilmRemovalForm,
  FormWrapper,
} from "./lazy-forms";
import { useEstimateStore } from "@/lib/stores/estimate-store";
import { ServiceType } from "@/lib/types/estimate-types";
import { AuthModal } from "@/components/auth/auth-modal";
import { supabase } from "@/lib/supabase/client";
import {
  Building2,
  Droplets,
  Sparkles,
  Shield,
  Brush,
  FrameIcon as Frame,
  Wind,
  Waves,
  Car,
  Gem,
  Bug,
  Calculator,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

// Service data with icons and descriptions
const SERVICES = [
  {
    id: "GR",
    name: "Glass Restoration",
    description: "Remove mineral deposits and restore glass clarity",
    pricing: "$70/window",
    icon: Building2,
    color: "bg-feedback-info/10 text-feedback-info",
    popular: true,
  },
  {
    id: "WC",
    name: "Window Cleaning",
    description: "Professional window cleaning services",
    pricing: "$65-75/hour",
    icon: Sparkles,
    color: "bg-cyan-50 text-cyan-700",
    popular: true,
  },
  {
    id: "PW",
    name: "Pressure Washing",
    description: "High-pressure cleaning for facades and surfaces",
    pricing: "$0.15-0.50/sq ft",
    icon: Droplets,
    color: "bg-indigo-50 text-indigo-700",
  },
  {
    id: "PWS",
    name: "Pressure Wash & Seal",
    description: "Pressure washing with protective sealer application",
    pricing: "$1.25-1.35/sq ft",
    icon: Shield,
    color: "bg-purple-50 text-purple-700",
  },
  {
    id: "FC",
    name: "Final Clean",
    description: "Post-construction detailed cleaning",
    pricing: "$70/hour",
    icon: Brush,
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    id: "FR",
    name: "Frame Restoration",
    description: "Restore and refurbish window frames",
    pricing: "$25/frame",
    icon: Frame,
    color: "bg-amber-50 text-amber-700",
  },
  {
    id: "HD",
    name: "High Dusting",
    description: "High-level dust and debris removal",
    pricing: "$0.37-0.75/sq ft",
    icon: Wind,
    color: "bg-bg-elevated text-text-secondary",
  },
  {
    id: "SW",
    name: "Soft Washing",
    description: "Low-pressure cleaning for delicate surfaces",
    pricing: "$0.45/sq ft",
    icon: Waves,
    color: "bg-teal-50 text-teal-700",
  },
  {
    id: "PD",
    name: "Parking Deck",
    description: "Parking structure cleaning and maintenance",
    pricing: "$16-23/space",
    icon: Car,
    color: "bg-feedback-error/10 text-feedback-error",
  },
  {
    id: "GRC",
    name: "Granite Reconditioning",
    description: "Restore and seal granite surfaces",
    pricing: "$1.75/sq ft",
    icon: Gem,
    color: "bg-pink-50 text-pink-700",
  },
  {
    id: "BR",
    name: "Biofilm Removal",
    description: "Remove biological growth and staining",
    pricing: "$0.75-1.00/sq ft",
    icon: Bug,
    color: "bg-orange-50 text-orange-700",
  },
];

export function ServiceCalculator() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const {
    services,
    addService,
    removeService,
    currentEstimate,
    setCustomerInfo,
    createEstimate,
    saveEstimate,
    isSaving,
    calculateTotal,
  } = useEstimateStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleServiceClick = (serviceId: string) => {
    setCurrentService(serviceId);
    setIsModalOpen(true);
  };

  const handleServiceCalculated = (result: any) => {
    setIsModalOpen(false);

    // Use setTimeout to ensure modal closes before updating store
    setTimeout(() => {
      if (currentService) {
        const newService = {
          id: crypto.randomUUID(),
          serviceType: currentService as ServiceType,
          calculationResult: result,
          formData: result.formData || {},
        };

        addService(newService);
      }
      setCurrentService(null);
    }, 0);
  };

  const handleRemoveService = (serviceId: string) => {
    removeService(serviceId);
  };

  const totalPrice = calculateTotal();
  const totalEquipmentCost = services.reduce((sum, service) => {
    return sum + (service.calculationResult.equipment?.cost || 0);
  }, 0);

  const handleSaveEstimate = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!currentEstimate) {
      // Create basic estimate info first
      setCustomerInfo({
        customer_name: "Draft Estimate",
        customer_email: user.email || "",
        customer_phone: "",
        building_name: "Building",
        building_address: "Address",
        building_height_stories: 1,
        total_price: totalPrice,
        status: "draft",
      });
    }

    const saveResult = await (currentEstimate?.id
      ? saveEstimate()
      : createEstimate());
    if (saveResult) {
      // Show success message or redirect
      const estimateId =
        typeof saveResult === "string" ? saveResult : currentEstimate?.id;
      userAction("Estimate saved successfully", {
        estimateId,
        component: "ServiceCalculator",
      });
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Optionally auto-save after auth
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">EstimatePro Calculator</h1>
        <p className="text-xl text-muted-foreground">
          Professional building services estimation
        </p>
      </div>

      {/* Service Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {SERVICES.map((service) => {
          const Icon = service.icon;
          const isSelected = services.some((s) => s.serviceType === service.id);

          return (
            <Card
              key={service.id}
              className={`cursor-pointer transition-all hover:scale-105 hover:shadow-lg hover:border-border-focus active:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 ${
                isSelected
                  ? "ring-2 ring-primary-action bg-primary-action/5"
                  : ""
              }`}
              onClick={() => handleServiceClick(service.id)}
              tabIndex={0}
              onKeyDown={(e) =>
                e.key === "Enter" && handleServiceClick(service.id)
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${service.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {service.popular && (
                    <Badge
                      variant="secondary"
                      className="bg-feedback-success text-white"
                    >
                      Popular
                    </Badge>
                  )}
                  {isSelected && (
                    <CheckCircle className="h-5 w-5 text-secondary" />
                  )}
                </div>
                <CardTitle className="text-lg">{service.name}</CardTitle>
                <CardDescription className="text-sm">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="border-text-secondary text-text-secondary"
                  >
                    {service.pricing}
                  </Badge>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Services Summary */}
      {services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-secondary" />
              Estimate Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {services.map((service) => {
              const serviceInfo = SERVICES.find(
                (s) => s.id === service.serviceType,
              );
              return (
                <div
                  key={service.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-3">
                    {serviceInfo && (
                      <div className={`p-2 rounded ${serviceInfo.color}`}>
                        <serviceInfo.icon className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{serviceInfo?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.calculationResult.breakdown?.[0]
                          ?.description || "Calculated"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">
                      ${service.calculationResult.basePrice.toLocaleString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveService(service.id);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-lg">
                <span>Services Subtotal:</span>
                <span className="font-bold">
                  ${totalPrice.toLocaleString()}
                </span>
              </div>

              {totalEquipmentCost > 0 && (
                <div className="flex justify-between text-lg">
                  <span>Equipment Rental:</span>
                  <span className="font-bold">
                    ${totalEquipmentCost.toLocaleString()}
                  </span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-xl font-bold text-primary">
                <span>Total Estimate:</span>
                <span>
                  ${(totalPrice + totalEquipmentCost).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Warnings */}
            {services.some((s) => s.calculationResult.warnings?.length > 0) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Some services have warnings. Review individual calculations
                  for details.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1 bg-secondary hover:bg-secondary/90"
                onClick={handleSaveEstimate}
                disabled={isSaving || services.length === 0}
              >
                {isSaving
                  ? "Saving..."
                  : user
                    ? "Save Estimate"
                    : "Sign In to Save"}
              </Button>
              <Button variant="outline" className="flex-1">
                Generate PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsModalOpen(false);
            setCurrentService(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentService &&
                SERVICES.find((s) => s.id === currentService)?.name}{" "}
              Calculator
            </DialogTitle>
          </DialogHeader>

          {/* Service Form Content */}
          <div className="py-4">
            {currentService === "GR" && (
              <FormWrapper>
                <LazyGlassRestorationForm
                  onSubmit={handleServiceCalculated}
                  onCancel={() => setIsModalOpen(false)}
                />
              </FormWrapper>
            )}
            {currentService === "WC" && (
              <FormWrapper>
                <LazyWindowCleaningForm
                  onSubmit={handleServiceCalculated}
                  onCancel={() => setIsModalOpen(false)}
                />
              </FormWrapper>
            )}
            {currentService === "PW" && (
              <FormWrapper>
                <LazyPressureWashingForm
                  onSubmit={handleServiceCalculated}
                  onCancel={() => setIsModalOpen(false)}
                />
              </FormWrapper>
            )}
            {currentService === "PWS" && (
              <FormWrapper>
                <LazyPressureWashSealForm
                  onSubmit={handleServiceCalculated}
                  onCancel={() => setIsModalOpen(false)}
                />
              </FormWrapper>
            )}
            {currentService === "FC" && (
              <FormWrapper>
                <LazyFinalCleanForm
                  onSubmit={handleServiceCalculated}
                  onCancel={() => setIsModalOpen(false)}
                />
              </FormWrapper>
            )}
            {currentService === "FR" && (
              <FormWrapper>
                <LazyFrameRestorationForm
                  onSubmit={handleServiceCalculated}
                  onCancel={() => setIsModalOpen(false)}
                />
              </FormWrapper>
            )}
            {currentService === "HD" && (
              <FormWrapper>
                <LazyHighDustingForm
                  onSubmit={handleServiceCalculated}
                  onCancel={() => setIsModalOpen(false)}
                />
              </FormWrapper>
            )}
            {currentService === "SW" && (
              <FormWrapper>
                <LazySoftWashingForm
                  onSubmit={handleServiceCalculated}
                  onCancel={() => setIsModalOpen(false)}
                />
              </FormWrapper>
            )}
            {currentService === "PD" && (
              <FormWrapper>
                <LazyParkingDeckForm
                  onSubmit={handleServiceCalculated}
                  onCancel={() => setIsModalOpen(false)}
                />
              </FormWrapper>
            )}
            {currentService === "GRC" && (
              <FormWrapper>
                <LazyGraniteReconditioningForm
                  onSubmit={handleServiceCalculated}
                  onCancel={() => setIsModalOpen(false)}
                />
              </FormWrapper>
            )}
            {currentService === "BR" && (
              <FormWrapper>
                <LazyBiofilmRemovalForm
                  onSubmit={handleServiceCalculated}
                  onCancel={() => setIsModalOpen(false)}
                />
              </FormWrapper>
            )}
            {currentService &&
              ![
                "GR",
                "WC",
                "PW",
                "PWS",
                "FC",
                "FR",
                "HD",
                "SW",
                "PD",
                "GRC",
                "BR",
              ].includes(currentService) && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Service calculator not found for:{" "}
                    {SERVICES.find((s) => s.id === currentService)?.name}
                  </p>
                  <p className="text-sm text-red-600 mt-2">
                    Please contact support if this service should be available.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
