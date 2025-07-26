"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEstimateFlow } from "../../EstimateFlowProvider";
import { ServiceType } from "@/lib/types/estimate-types";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
  BrainCircuit,
} from "lucide-react";
import { IntelligentServiceSuggestions } from "@/components/ai/IntelligentServiceSuggestions";
import { validateClientEnv } from "@/lib/config/env-validation";
import { cn } from "@/lib/utils";

// Service cards with icons and descriptions
const SERVICE_OPTIONS = [
  {
    value: "WC",
    label: "Window Cleaning",
    icon: "🪟",
    description: "Interior & exterior windows",
  },
  {
    value: "PW",
    label: "Pressure Washing",
    icon: "💦",
    description: "Building & surface cleaning",
  },
  {
    value: "SW",
    label: "Soft Washing",
    icon: "🧽",
    description: "Gentle chemical cleaning",
  },
  {
    value: "BR",
    label: "Biofilm Removal",
    icon: "🦠",
    description: "Mold & algae treatment",
  },
  {
    value: "GR",
    label: "Glass Restoration",
    icon: "✨",
    description: "Scratch & stain removal",
  },
  {
    value: "HD",
    label: "High Dusting",
    icon: "🧹",
    description: "Ceiling & vent cleaning",
  },
  {
    value: "FC",
    label: "Final Clean",
    icon: "🏗️",
    description: "Post-construction cleanup",
  },
  {
    value: "GC",
    label: "Granite Reconditioning",
    icon: "🪨",
    description: "Stone surface restoration",
  },
  {
    value: "PS",
    label: "Pressure Wash & Seal",
    icon: "🛡️",
    description: "Clean & protective coating",
  },
  {
    value: "PD",
    label: "Parking Deck",
    icon: "🚗",
    description: "Garage & deck cleaning",
  },
];

export default function ProjectSetup() {
  const { flowData, updateFlowData, validateCurrentStep } = useEstimateFlow();
  const env = validateClientEnv();

  // Local state for form fields
  const [customerName, setCustomerName] = useState(
    flowData.initialContact?.customerName || "",
  );
  const [email, setEmail] = useState(flowData.initialContact?.email || "");
  const [phone, setPhone] = useState(flowData.initialContact?.phone || "");
  const [companyName, setCompanyName] = useState(
    flowData.initialContact?.companyName || "",
  );
  const [propertyAddress, setPropertyAddress] = useState(
    flowData.initialContact?.propertyAddress || "",
  );
  const [projectName, setProjectName] = useState(
    flowData.scopeDetails?.projectName || "",
  );
  const [projectDescription, setProjectDescription] = useState(
    flowData.scopeDetails?.projectDescription || "",
  );
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>(
    flowData.scopeDetails?.selectedServices || [],
  );
  const [urgency, setUrgency] = useState(
    flowData.scopeDetails?.urgency || "standard",
  );
  const [preferredDate, setPreferredDate] = useState(
    flowData.scopeDetails?.preferredDate || "",
  );

  // Validation state
  const [errors, setErrors] = useState<string[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // AI extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  // Update flow data on changes
  useEffect(() => {
    updateFlowData({
      initialContact: {
        customerName,
        email,
        phone,
        companyName,
        propertyAddress,
        contactMethod: "manual",
        projectDetails: projectDescription,
      },
      scopeDetails: {
        selectedServices,
        projectName,
        projectDescription,
        urgency,
        preferredDate,
      },
    });
  }, [
    customerName,
    email,
    phone,
    companyName,
    propertyAddress,
    selectedServices,
    projectName,
    projectDescription,
    urgency,
    preferredDate,
  ]);

  // Validate on blur
  const handleBlur = (field: string) => {
    setTouched((prev) => new Set(prev).add(field));
    const validation = validateCurrentStep();
    setErrors(validation.errors);
  };

  // Service selection
  const toggleService = (service: ServiceType) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service],
    );
  };

  // AI service suggestions handler
  const handleServiceSuggestions = (services: ServiceType[]) => {
    setSelectedServices(services);
  };

  // AI extraction from text
  const handleAIExtraction = async () => {
    if (!projectDescription) return;

    setIsExtracting(true);
    try {
      // Simulate AI extraction (replace with actual API call)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock extracted data
      const extracted = {
        services: ["WC", "PW"] as ServiceType[],
        urgency: "urgent",
        area: "2500 sq ft building exterior",
      };

      setExtractedData(extracted);
      if (extracted.services.length > 0) {
        setSelectedServices(extracted.services);
      }
      if (extracted.urgency) {
        setUrgency(extracted.urgency);
      }
    } catch (error) {
      console.error("AI extraction failed:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
          <CardDescription>
            Who are we creating this estimate for?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onBlur={() => handleBlur("customerName")}
                placeholder="John Smith"
                className={cn(
                  touched.has("customerName") &&
                    !customerName &&
                    "border-red-500",
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Company Name
              </Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="ABC Corporation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="propertyAddress"
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              Property Address
            </Label>
            <Input
              id="propertyAddress"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              placeholder="123 Main St, City, State 12345"
            />
          </div>
        </CardContent>
      </Card>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Project Details
          </CardTitle>
          <CardDescription>What work needs to be done?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Office Building Window Cleaning"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="projectDescription"
              className="flex items-center justify-between"
            >
              <span>Project Description</span>
              {env.NEXT_PUBLIC_ENABLE_AI && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAIExtraction}
                  disabled={!projectDescription || isExtracting}
                  className="text-xs"
                >
                  <BrainCircuit className="h-3 w-3 mr-1" />
                  {isExtracting ? "Analyzing..." : "Extract with AI"}
                </Button>
              )}
            </Label>
            <Textarea
              id="projectDescription"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Describe the work needed... (e.g., Clean all exterior windows on 3-story office building, pressure wash sidewalks and entrance)"
              rows={4}
            />
            {extractedData && (
              <div className="text-sm text-green-600 flex items-center gap-1 mt-1">
                <CheckCircle2 className="h-3 w-3" />
                AI extracted services and details
              </div>
            )}
          </div>

          <Separator />

          {/* Service Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Services Required <span className="text-red-500">*</span>
            </Label>

            {env.NEXT_PUBLIC_ENABLE_AI && (
              <IntelligentServiceSuggestions
                projectDescription={projectDescription}
                selectedServices={selectedServices}
                onServicesSuggested={handleServiceSuggestions}
                className="mb-4"
              />
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SERVICE_OPTIONS.map((service) => {
                const isSelected = selectedServices.includes(
                  service.value as ServiceType,
                );
                return (
                  <Card
                    key={service.value}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      isSelected && "border-primary ring-2 ring-primary/20",
                    )}
                    onClick={() => toggleService(service.value as ServiceType)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{service.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              {service.label}
                            </p>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-xs text-text-secondary">
                            {service.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {touched.has("services") && selectedServices.length === 0 && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Please select at least one service
              </p>
            )}
          </div>

          <Separator />

          {/* Timing */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency Level</Label>
              <select
                id="urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="flexible">Flexible - Anytime</option>
                <option value="standard">Standard - Within 2 weeks</option>
                <option value="urgent">Urgent - Within 1 week</option>
                <option value="emergency">Emergency - ASAP</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="preferredDate"
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Preferred Date
              </Label>
              <Input
                id="preferredDate"
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {(customerName || selectedServices.length > 0) && (
        <Card className="bg-bg-subtle">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {customerName && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-3 w-3 text-text-secondary" />
                <span className="text-text-secondary">Customer:</span>
                <span className="font-medium">{customerName}</span>
                {companyName && (
                  <span className="text-text-secondary">({companyName})</span>
                )}
              </div>
            )}
            {selectedServices.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <Sparkles className="h-3 w-3 text-text-secondary mt-0.5" />
                <span className="text-text-secondary">Services:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedServices.map((service) => (
                    <Badge
                      key={service}
                      variant="secondary"
                      className="text-xs"
                    >
                      {SERVICE_OPTIONS.find((s) => s.value === service)?.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {urgency !== "standard" && (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-3 w-3 text-text-secondary" />
                <span className="text-text-secondary">Urgency:</span>
                <Badge
                  variant={urgency === "emergency" ? "destructive" : "default"}
                  className="text-xs"
                >
                  {urgency}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600 font-medium mb-1">
            Please fix the following:
          </p>
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-sm text-red-600">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
