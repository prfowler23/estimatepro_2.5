/**
 * Mobile Project Setup Step
 *
 * Mobile-optimized version of the ProjectSetup step with:
 * - Touch-friendly service selection
 * - Simplified customer information forms
 * - Voice input support for text fields
 * - Smart suggestions and validation
 * - Haptic feedback for interactions
 *
 * Part of Phase 4 Priority 4: Create Responsive Mobile Layouts
 */

"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EnhancedMobileInput } from "@/components/ui/mobile/EnhancedMobileInput";
import {
  useHapticFeedback,
  useDeviceCapabilities,
} from "@/components/providers/MobileGestureProvider";
import { useEstimateFlow } from "../../EstimateFlowProvider";
import { ServiceType } from "@/lib/types/estimate-types";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  FileText,
  CheckCircle2,
  AlertCircle,
  Star,
  Sparkles,
  ChevronRight,
  Plus,
  Minus,
} from "lucide-react";

// Mobile-optimized service options with touch-friendly design
const MOBILE_SERVICE_OPTIONS = [
  {
    value: "WC" as ServiceType,
    label: "Window Cleaning",
    icon: "🪟",
    description: "Interior & exterior",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    popular: true,
  },
  {
    value: "PW" as ServiceType,
    label: "Pressure Washing",
    icon: "💦",
    description: "Buildings & surfaces",
    color: "bg-green-50 border-green-200 text-green-800",
    popular: true,
  },
  {
    value: "SW" as ServiceType,
    label: "Soft Washing",
    icon: "🧼",
    description: "Gentle cleaning",
    color: "bg-purple-50 border-purple-200 text-purple-800",
  },
  {
    value: "BR" as ServiceType,
    label: "Biofilm Removal",
    icon: "🦠",
    description: "Specialized cleaning",
    color: "bg-red-50 border-red-200 text-red-800",
  },
  {
    value: "GR" as ServiceType,
    label: "Glass Restoration",
    icon: "✨",
    description: "Window restoration",
    color: "bg-yellow-50 border-yellow-200 text-yellow-800",
  },
  {
    value: "FR" as ServiceType,
    label: "Frame Restoration",
    icon: "🔧",
    description: "Frame cleaning",
    color: "bg-orange-50 border-orange-200 text-orange-800",
  },
];

interface MobileProjectSetupProps {
  data: any;
  onUpdate: (data: any) => void;
  isMobile?: boolean;
  screenSize?: { width: number; height: number; orientation: string };
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  company?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  projectTitle: string;
  description: string;
}

/**
 * Mobile Project Setup Component
 */
export function MobileProjectSetup({
  data,
  onUpdate,
  isMobile = true,
  screenSize,
}: MobileProjectSetupProps) {
  const { haptic } = useHapticFeedback();
  const { isTouch } = useDeviceCapabilities();

  const [activeSection, setActiveSection] = useState<
    "customer" | "services" | "details"
  >("customer");
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>(
    data?.selectedServices || [],
  );
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: data?.customerInfo?.name || "",
    email: data?.customerInfo?.email || "",
    phone: data?.customerInfo?.phone || "",
    company: data?.customerInfo?.company || "",
    address: data?.customerInfo?.address || "",
    city: data?.customerInfo?.city || "",
    state: data?.customerInfo?.state || "",
    zipCode: data?.customerInfo?.zipCode || "",
    projectTitle: data?.projectTitle || "",
    description: data?.description || "",
  });
  const [showAllServices, setShowAllServices] = useState(false);

  // Update parent component when data changes
  const updateData = useCallback(() => {
    onUpdate({
      ...data,
      selectedServices,
      customerInfo,
      projectTitle: customerInfo.projectTitle,
      description: customerInfo.description,
      isCompleted:
        selectedServices.length > 0 &&
        customerInfo.name &&
        customerInfo.email &&
        customerInfo.phone,
    });
  }, [data, selectedServices, customerInfo, onUpdate]);

  useEffect(() => {
    updateData();
  }, [updateData]);

  // Handle service selection
  const toggleService = useCallback(
    (service: ServiceType) => {
      haptic("impact", "light");
      setSelectedServices((prev) => {
        const isSelected = prev.includes(service);
        if (isSelected) {
          return prev.filter((s) => s !== service);
        } else {
          return [...prev, service];
        }
      });
    },
    [haptic],
  );

  // Handle customer info updates
  const updateCustomerInfo = useCallback(
    (field: keyof CustomerInfo, value: string) => {
      setCustomerInfo((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  // Validation
  const isCustomerInfoValid = useMemo(() => {
    return customerInfo.name && customerInfo.email && customerInfo.phone;
  }, [customerInfo]);

  const isServicesValid = useMemo(() => {
    return selectedServices.length > 0;
  }, [selectedServices]);

  const isProjectDetailsValid = useMemo(() => {
    return customerInfo.projectTitle;
  }, [customerInfo]);

  // Get visible services (show popular first, then expand)
  const visibleServices = useMemo(() => {
    if (showAllServices) return MOBILE_SERVICE_OPTIONS;
    return MOBILE_SERVICE_OPTIONS.filter((service) => service.popular);
  }, [showAllServices]);

  // Section navigation
  const navigateToSection = useCallback(
    (section: "customer" | "services" | "details") => {
      haptic("selection");
      setActiveSection(section);
    },
    [haptic],
  );

  const nextSection = useCallback(() => {
    haptic("impact", "medium");
    if (activeSection === "customer" && isCustomerInfoValid) {
      setActiveSection("services");
    } else if (activeSection === "services" && isServicesValid) {
      setActiveSection("details");
    }
  }, [activeSection, isCustomerInfoValid, isServicesValid, haptic]);

  return (
    <div className="space-y-4 pb-6">
      {/* Progress Header */}
      <div className="bg-bg-base rounded-lg p-4 border border-border-primary">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-text-primary">
            Project Setup
          </h2>
          <div className="text-sm text-text-secondary">Step 1 of 3</div>
        </div>

        {/* Section Navigation */}
        <div className="flex items-center space-x-2">
          {[
            { key: "customer", label: "Customer", valid: isCustomerInfoValid },
            { key: "services", label: "Services", valid: isServicesValid },
            { key: "details", label: "Details", valid: isProjectDetailsValid },
          ].map((section, index) => (
            <React.Fragment key={section.key}>
              <button
                onClick={() => navigateToSection(section.key as any)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                  activeSection === section.key
                    ? "bg-primary-100 text-primary-700"
                    : "bg-gray-100 text-gray-600",
                  section.valid && "bg-green-100 text-green-700",
                )}
              >
                {section.valid ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border-2",
                      activeSection === section.key
                        ? "border-primary-500"
                        : "border-gray-300",
                    )}
                  />
                )}
                <span className="text-sm font-medium">{section.label}</span>
              </button>
              {index < 2 && <ChevronRight className="h-3 w-3 text-gray-400" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Section Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Customer Information */}
          {activeSection === "customer" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <EnhancedMobileInput
                  label="Full Name"
                  type="text"
                  value={customerInfo.name}
                  onChange={(value) =>
                    updateCustomerInfo("name", value.toString())
                  }
                  placeholder="Enter customer name"
                  required
                  enableVoiceInput={isTouch}
                  inputMode="text"
                  autoFocus
                />

                <div className="grid grid-cols-1 gap-4">
                  <EnhancedMobileInput
                    label="Email Address"
                    type="email"
                    value={customerInfo.email}
                    onChange={(value) =>
                      updateCustomerInfo("email", value.toString())
                    }
                    placeholder="customer@example.com"
                    required
                    inputMode="email"
                  />

                  <EnhancedMobileInput
                    label="Phone Number"
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(value) =>
                      updateCustomerInfo("phone", value.toString())
                    }
                    placeholder="(555) 123-4567"
                    required
                    inputMode="tel"
                  />
                </div>

                <EnhancedMobileInput
                  label="Company (Optional)"
                  type="text"
                  value={customerInfo.company}
                  onChange={(value) =>
                    updateCustomerInfo("company", value.toString())
                  }
                  placeholder="Company name"
                  inputMode="text"
                />

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Service Address
                  </h4>

                  <EnhancedMobileInput
                    label="Street Address"
                    type="text"
                    value={customerInfo.address}
                    onChange={(value) =>
                      updateCustomerInfo("address", value.toString())
                    }
                    placeholder="123 Main Street"
                    required
                    enableVoiceInput={isTouch}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <EnhancedMobileInput
                      label="City"
                      type="text"
                      value={customerInfo.city}
                      onChange={(value) =>
                        updateCustomerInfo("city", value.toString())
                      }
                      placeholder="City"
                      required
                    />

                    <EnhancedMobileInput
                      label="State"
                      type="text"
                      value={customerInfo.state}
                      onChange={(value) =>
                        updateCustomerInfo("state", value.toString())
                      }
                      placeholder="ST"
                      required
                    />
                  </div>

                  <EnhancedMobileInput
                    label="ZIP Code"
                    type="text"
                    value={customerInfo.zipCode}
                    onChange={(value) =>
                      updateCustomerInfo("zipCode", value.toString())
                    }
                    placeholder="12345"
                    required
                    inputMode="numeric"
                  />
                </div>

                <Button
                  onClick={nextSection}
                  disabled={!isCustomerInfoValid}
                  className="w-full mt-6"
                  size="lg"
                >
                  Continue to Services
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Service Selection */}
          {activeSection === "services" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Select Services
                </CardTitle>
                {selectedServices.length > 0 && (
                  <div className="text-sm text-text-secondary">
                    {selectedServices.length} service
                    {selectedServices.length !== 1 ? "s" : ""} selected
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {visibleServices.map((service) => {
                    const isSelected = selectedServices.includes(service.value);

                    return (
                      <motion.button
                        key={service.value}
                        onClick={() => toggleService(service.value)}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                          isSelected
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 bg-white hover:border-gray-300",
                          "touch-manipulation min-h-[72px]",
                        )}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="text-2xl">{service.icon}</div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-text-primary">
                              {service.label}
                            </h4>
                            {service.popular && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Popular
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-text-secondary mt-0.5">
                            {service.description}
                          </p>
                        </div>

                        <div
                          className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                            isSelected
                              ? "border-primary-500 bg-primary-500"
                              : "border-gray-300",
                          )}
                        >
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {!showAllServices && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      haptic("selection");
                      setShowAllServices(true);
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Show More Services
                  </Button>
                )}

                {showAllServices && MOBILE_SERVICE_OPTIONS.length > 2 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      haptic("selection");
                      setShowAllServices(false);
                    }}
                    className="w-full"
                  >
                    <Minus className="h-4 w-4 mr-2" />
                    Show Popular Only
                  </Button>
                )}

                <Button
                  onClick={nextSection}
                  disabled={!isServicesValid}
                  className="w-full mt-6"
                  size="lg"
                >
                  Continue to Details
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Project Details */}
          {activeSection === "details" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <EnhancedMobileInput
                  label="Project Title"
                  type="text"
                  value={customerInfo.projectTitle}
                  onChange={(value) =>
                    updateCustomerInfo("projectTitle", value.toString())
                  }
                  placeholder="e.g., Office Building Window Cleaning"
                  required
                  enableVoiceInput={isTouch}
                  autoFocus
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">
                    Project Description
                  </label>
                  <textarea
                    value={customerInfo.description}
                    onChange={(e) =>
                      updateCustomerInfo("description", e.target.value)
                    }
                    placeholder="Describe the project scope, special requirements, access considerations, etc."
                    rows={4}
                    className={cn(
                      "w-full px-3 py-2 border border-border-primary rounded-lg",
                      "resize-none text-base md:text-sm min-h-[100px]",
                      "focus:outline-none focus:ring-2 focus:ring-primary-500",
                      "touch-manipulation",
                    )}
                  />
                </div>

                {/* Selected Services Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-text-primary mb-2">
                    Selected Services ({selectedServices.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedServices.map((serviceValue) => {
                      const service = MOBILE_SERVICE_OPTIONS.find(
                        (s) => s.value === serviceValue,
                      );
                      return service ? (
                        <Badge
                          key={serviceValue}
                          variant="secondary"
                          className="text-sm"
                        >
                          {service.icon} {service.label}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={() => haptic("impact", "heavy")}
                    disabled={!isProjectDetailsValid}
                    className="w-full"
                    size="lg"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete Setup
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Validation Summary */}
      {!isCustomerInfoValid || !isServicesValid || !isProjectDetailsValid ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">
                  Complete Required Information
                </h4>
                <ul className="text-sm text-amber-700 mt-1 space-y-1">
                  {!isCustomerInfoValid && (
                    <li>• Fill in customer contact information</li>
                  )}
                  {!isServicesValid && <li>• Select at least one service</li>}
                  {!isProjectDetailsValid && <li>• Enter a project title</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default MobileProjectSetup;
