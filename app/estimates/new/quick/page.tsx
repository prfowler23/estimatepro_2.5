"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Zap,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Sparkles,
  Clock,
  DollarSign,
  Percent,
  Send,
  Calculator,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Ruler,
} from "lucide-react";
import { ServiceType } from "@/lib/types/estimate-types";
import { IntelligentServiceSuggestions } from "@/components/ai/IntelligentServiceSuggestions";
import { SmartDefaultsProvider } from "@/components/ai/SmartDefaultsProvider";
import { validateClientEnv } from "@/lib/config/env-validation";
import { cn } from "@/lib/utils";

// Quick service selection with emojis
const QUICK_SERVICES = [
  { value: "WC", label: "Windows", icon: "🪟" },
  { value: "PW", label: "Pressure", icon: "💦" },
  { value: "SW", label: "Soft Wash", icon: "🧽" },
  { value: "BR", label: "Biofilm", icon: "🦠" },
  { value: "FC", label: "Final Clean", icon: "🏗️" },
];

// Common area presets
const AREA_PRESETS = [
  { label: "Small Home", value: "1500", description: "~1,500 sq ft" },
  { label: "Medium Home", value: "2500", description: "~2,500 sq ft" },
  { label: "Large Home", value: "4000", description: "~4,000 sq ft" },
  { label: "Small Office", value: "5000", description: "~5,000 sq ft" },
  { label: "Medium Office", value: "10000", description: "~10,000 sq ft" },
  { label: "Large Building", value: "25000", description: "~25,000 sq ft" },
];

export default function QuickEstimatePage() {
  const router = useRouter();
  const env = validateClientEnv();

  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");

  // Project info
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([]);
  const [projectDescription, setProjectDescription] = useState("");
  const [area, setArea] = useState("2500");
  const [urgency, setUrgency] = useState("standard");

  // Pricing
  const [hourlyRate, setHourlyRate] = useState("75");
  const [markup, setMarkup] = useState("35");
  const [includeTax, setIncludeTax] = useState(true);
  const [taxRate, setTaxRate] = useState("8.25");

  // UI state
  const [isSending, setIsSending] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [estimateId, setEstimateId] = useState<string | null>(null);
  const [successScreen, setSuccessScreen] = useState(false);

  // Smart calculations
  const calculateDuration = () => {
    const sqFt = parseFloat(area) || 0;
    const serviceCount = selectedServices.length || 1;
    const baseRate = 500; // sq ft per hour per worker
    const hours = Math.ceil((sqFt * serviceCount) / baseRate);
    const workers = sqFt > 5000 ? 3 : 2;
    const days = Math.ceil(hours / (8 * workers));
    return { days, hours, workers };
  };

  const { days, hours, workers } = calculateDuration();
  const laborCost = hours * parseFloat(hourlyRate);
  const markupAmount = laborCost * (parseFloat(markup) / 100);
  const subtotal = laborCost + markupAmount;
  const taxAmount = includeTax ? subtotal * (parseFloat(taxRate) / 100) : 0;
  const totalPrice = subtotal + taxAmount;

  // Service toggle
  const toggleService = (service: ServiceType) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service],
    );
  };

  // Validation
  const validate = () => {
    const newErrors = [];
    if (!customerName) newErrors.push("Customer name is required");
    if (!email && !phone) newErrors.push("Email or phone is required");
    if (selectedServices.length === 0)
      newErrors.push("Select at least one service");
    if (!area || parseFloat(area) <= 0) newErrors.push("Enter a valid area");
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Create and send estimate
  const handleQuickSend = async () => {
    if (!validate()) return;

    setIsSending(true);
    try {
      // Create estimate data matching API schema
      const estimateData = {
        customerName,
        customerEmail: email || "noemail@example.com",
        customerPhone: phone || "000-000-0000",
        companyName: "",
        buildingName: propertyAddress || "Quick Estimate Property",
        buildingAddress: propertyAddress || "Address to be determined",
        buildingHeightStories: Math.max(1, Math.floor(parseFloat(area) / 2500)),
        buildingType: "office" as const,
        notes: projectDescription,
        services: selectedServices.map((serviceType) => ({
          type: serviceType,
          area: parseFloat(area),
          price: totalPrice / selectedServices.length,
          laborHours: hours / selectedServices.length,
          totalHours: hours / selectedServices.length,
          crewSize: workers,
        })),
      };

      // Create estimate
      const response = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estimateData),
      });

      if (!response.ok) {
        throw new Error("Failed to create estimate");
      }

      const { id } = await response.json();
      setEstimateId(id);

      // Send email if provided
      if (email) {
        await fetch(`/api/estimates/${id}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, createPdf: true }),
        });
      }

      setSuccessScreen(true);
    } catch (error) {
      console.error("Error creating estimate:", error);
      setErrors(["Failed to create estimate. Please try again."]);
    } finally {
      setIsSending(false);
    }
  };

  // Success screen
  if (successScreen && estimateId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-base via-bg-subtle to-bg-base flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle>Estimate Created!</CardTitle>
                <CardDescription>
                  Your quick estimate has been saved
                  {email && " and sent"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-white border-green-200">
              <AlertDescription className="space-y-1">
                <p className="font-medium">
                  Estimate #{estimateId.slice(0, 8)}
                </p>
                <p className="text-sm text-text-secondary">
                  Total: ${totalPrice.toFixed(2)}
                </p>
              </AlertDescription>
            </Alert>

            <div className="grid gap-3">
              <Button
                onClick={() => router.push(`/estimates/${estimateId}`)}
                className="flex items-center gap-2"
              >
                View Full Estimate
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSuccessScreen(false);
                  setEstimateId(null);
                  // Reset form
                  setCustomerName("");
                  setEmail("");
                  setPhone("");
                  setPropertyAddress("");
                  setSelectedServices([]);
                  setProjectDescription("");
                  setArea("2500");
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Another
              </Button>
              <Button variant="ghost" onClick={() => router.push("/estimates")}>
                Back to Estimates
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-base via-bg-subtle to-bg-base">
      {/* Header */}
      <div className="bg-bg-base/80 backdrop-blur-md border-b border-border-primary">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Quick Estimate</h1>
                <p className="text-sm text-text-secondary">
                  Create an estimate in under 2 minutes
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => router.push("/estimates/new/guided")}
              className="text-sm"
            >
              Switch to Detailed Mode
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertyAddress">Property Address</Label>
                  <Input
                    id="propertyAddress"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services & Area */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Services & Scope
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Service Selection */}
              <div className="space-y-2">
                <Label>
                  Select Services <span className="text-red-500">*</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_SERVICES.map((service) => (
                    <Button
                      key={service.value}
                      type="button"
                      variant={
                        selectedServices.includes(service.value as ServiceType)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        toggleService(service.value as ServiceType)
                      }
                      className="flex items-center gap-1"
                    >
                      <span>{service.icon}</span>
                      {service.label}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/estimates/new/guided")}
                    className="text-text-secondary"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    More
                  </Button>
                </div>
              </div>

              {/* AI Suggestions */}
              {env.NEXT_PUBLIC_ENABLE_AI && projectDescription && (
                <IntelligentServiceSuggestions
                  projectDescription={projectDescription}
                  selectedServices={selectedServices}
                  onServicesSuggested={setSelectedServices}
                  className="mt-2"
                />
              )}

              {/* Project Description */}
              <div className="space-y-2">
                <Label htmlFor="projectDescription">
                  Quick Description (Optional)
                </Label>
                <Textarea
                  id="projectDescription"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="e.g., Clean all windows on 2-story house"
                  rows={2}
                />
              </div>

              {/* Area Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Approximate Area <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {AREA_PRESETS.map((preset) => (
                    <Button
                      key={preset.value}
                      type="button"
                      variant={area === preset.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setArea(preset.value)}
                      className="flex flex-col items-center py-3"
                    >
                      <span className="text-xs font-medium">
                        {preset.label}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {preset.description}
                      </span>
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="2500"
                    className="w-32"
                  />
                  <span className="text-sm text-text-secondary">sq ft</span>
                </div>
              </div>

              {/* Urgency */}
              <div className="space-y-2">
                <Label htmlFor="urgency">When needed?</Label>
                <select
                  id="urgency"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="flexible">Flexible</option>
                  <option value="standard">Within 2 weeks</option>
                  <option value="urgent">Within 1 week</option>
                  <option value="emergency">ASAP</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Instant Pricing */}
          <Card className="border-primary/20">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Instant Pricing
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? "Hide" : "Show"} Advanced
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Advanced Settings */}
              {showAdvanced && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Hourly Rate</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary">$</span>
                        <Input
                          type="number"
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(e.target.value)}
                          className="w-24"
                        />
                        <span className="text-sm text-text-secondary">
                          /hour
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Markup %</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[parseFloat(markup)]}
                          onValueChange={(v) => setMarkup(v[0].toString())}
                          max={100}
                          step={5}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-12">
                          {markup}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Include Tax ({taxRate}%)
                    </Label>
                    <Switch
                      checked={includeTax}
                      onCheckedChange={setIncludeTax}
                    />
                  </div>
                  <Separator />
                </>
              )}

              {/* Calculated Breakdown */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">
                    Labor ({hours} hours × ${hourlyRate}/hr)
                  </span>
                  <span>${laborCost.toFixed(2)}</span>
                </div>
                {markupAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">
                      Markup ({markup}%)
                    </span>
                    <span>${markupAmount.toFixed(2)}</span>
                  </div>
                )}
                {includeTax && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">
                      Tax ({taxRate}%)
                    </span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Estimate</span>
                  <span className="text-primary">${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              {/* Estimate Details */}
              <Alert className="bg-bg-subtle border-border-primary">
                <AlertDescription className="text-xs space-y-1">
                  <p>
                    <Clock className="h-3 w-3 inline mr-1" />
                    Duration: {days} day{days > 1 ? "s" : ""} ({workers}{" "}
                    workers)
                  </p>
                  <p className="text-text-secondary">
                    Calculation based on area and selected services
                  </p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/estimates")}
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuickSend}
              disabled={isSending}
              size="lg"
              className="flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Create & Send Estimate
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
