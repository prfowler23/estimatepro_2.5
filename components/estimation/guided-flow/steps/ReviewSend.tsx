"use client";

import React, { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEstimateFlow } from "../../EstimateFlowProvider";
import { useRouter } from "next/navigation";
import {
  Send,
  Download,
  Mail,
  FileText,
  User,
  Users,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  Ruler,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Eye,
  Edit,
  Share2,
  Copy,
  MessageSquare,
  Plus,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Service name mapping
const SERVICE_NAMES: Record<string, string> = {
  WC: "Window Cleaning",
  PW: "Pressure Washing",
  SW: "Soft Washing",
  BR: "Biofilm Removal",
  GR: "Glass Restoration",
  HD: "High Dusting",
  FC: "Final Clean",
  GC: "Granite Reconditioning",
  PS: "Pressure Wash & Seal",
  PD: "Parking Deck",
};

export default function ReviewSend() {
  const { flowData, validateAllSteps } = useEstimateFlow();
  const router = useRouter();

  // Local state
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [createPdf, setCreatePdf] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [estimateCreated, setEstimateCreated] = useState(false);
  const [estimateId, setEstimateId] = useState<string | null>(null);

  // Extract data from flow
  const customer = flowData.initialContact || {};
  const scope = flowData.scopeDetails || {};
  const area = flowData.areaOfWork || {};
  const duration = flowData.duration || {};
  const pricing = flowData.pricing || {};
  const expenses = flowData.expenses || {};

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Handle estimate creation and sending
  const handleSend = async () => {
    // Validate all steps
    const isValid = validateAllSteps();
    if (!isValid) {
      alert("Please complete all required fields in previous steps.");
      return;
    }

    setIsSending(true);
    try {
      // Create estimate via API
      const response = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...flowData,
          notes,
          status: "draft",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create estimate");
      }

      const { id } = await response.json();
      setEstimateId(id);

      // Send email if requested
      if (sendEmail && customer.email) {
        await fetch(`/api/estimates/${id}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: customer.email,
            createPdf,
          }),
        });
      }

      setEstimateCreated(true);
    } catch (error) {
      console.error("Error creating estimate:", error);
      alert("Failed to create estimate. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // If estimate is created, show success screen
  if (estimateCreated && estimateId) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle>Estimate Created Successfully!</CardTitle>
                <CardDescription>
                  Your estimate has been saved
                  {sendEmail && " and sent to the customer"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <Button
                onClick={() => router.push(`/estimates/${estimateId}`)}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View Estimate
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/estimates/${estimateId}/edit`)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Estimate
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/estimates/new")}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Another
              </Button>
            </div>

            <Separator />

            <div className="text-center">
              <p className="text-sm text-text-secondary mb-2">
                Estimate ID: <code className="font-mono">{estimateId}</code>
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(estimateId);
                }}
                className="text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy ID
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Customer Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-secondary">Contact</p>
              <p className="font-medium">{customer.customerName || "N/A"}</p>
              {customer.companyName && (
                <p className="text-sm text-text-secondary">
                  {customer.companyName}
                </p>
              )}
            </div>
            <div>
              <p className="text-text-secondary">Contact Info</p>
              {customer.email && (
                <p className="font-medium flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {customer.email}
                </p>
              )}
              {customer.phone && (
                <p className="text-sm flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {customer.phone}
                </p>
              )}
            </div>
          </div>
          {customer.propertyAddress && (
            <div className="pt-2 border-t">
              <p className="text-text-secondary text-sm flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Property Address
              </p>
              <p className="font-medium">{customer.propertyAddress}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Project Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Services */}
          <div>
            <p className="text-sm text-text-secondary mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Selected Services
            </p>
            <div className="flex flex-wrap gap-2">
              {scope.selectedServices?.map((service: string) => (
                <Badge key={service} variant="secondary">
                  {SERVICE_NAMES[service] || service}
                </Badge>
              ))}
            </div>
          </div>

          {/* Measurements */}
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-text-secondary flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                Total Area
              </p>
              <p className="font-medium">
                {area.totalArea?.toLocaleString() || 0} sq ft
              </p>
            </div>
            <div>
              <p className="text-text-secondary flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Duration
              </p>
              <p className="font-medium">
                {duration.workDays || 0} days ({duration.totalHours || 0} hours)
              </p>
            </div>
            <div>
              <p className="text-text-secondary flex items-center gap-1">
                <Users className="h-3 w-3" />
                Team Size
              </p>
              <p className="font-medium">{duration.workers || 0} workers</p>
            </div>
          </div>

          {/* Timeline */}
          {duration.startDate && (
            <div className="pt-3 border-t">
              <p className="text-sm text-text-secondary mb-1">Timeline</p>
              <p className="font-medium">
                {format(new Date(duration.startDate), "MMM d, yyyy")} -{" "}
                {duration.endDate &&
                  format(new Date(duration.endDate), "MMM d, yyyy")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Summary */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Labor */}
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">
              Labor (
              {pricing.pricingMethod === "hourly"
                ? `${duration.totalHours || 0} hours @ ${formatCurrency(
                    pricing.hourlyRate || 0,
                  )}/hr`
                : "Fixed Price"}
              )
            </span>
            <span className="font-medium">
              {formatCurrency(pricing.laborCost || 0)}
            </span>
          </div>

          {/* Expenses */}
          {expenses.totalAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Additional Expenses</span>
              <span className="font-medium">
                {formatCurrency(expenses.totalAmount || 0)}
              </span>
            </div>
          )}

          <Separator />

          {/* Subtotal */}
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Subtotal</span>
            <span>{formatCurrency(pricing.subtotal || 0)}</span>
          </div>

          {/* Markup */}
          {pricing.markupAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">
                Markup ({pricing.markup || 0}%)
              </span>
              <span>{formatCurrency(pricing.markupAmount || 0)}</span>
            </div>
          )}

          {/* Tax */}
          {pricing.includeTax && pricing.taxAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">
                Tax ({pricing.taxRate || 0}%)
              </span>
              <span>{formatCurrency(pricing.taxAmount || 0)}</span>
            </div>
          )}

          <Separator />

          {/* Total */}
          <div className="flex items-center justify-between text-lg">
            <span className="font-semibold">Total Estimate</span>
            <span className="font-bold text-primary">
              {formatCurrency(pricing.totalPrice || 0)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Additional Notes (Optional)
          </CardTitle>
          <CardDescription>
            Add any special instructions or notes for the customer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter any additional notes, terms, or special instructions..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Send Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Delivery Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="sendEmail"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Mail className="h-4 w-4" />
                Send estimate via email
                {customer.email && (
                  <span className="text-xs text-text-secondary">
                    ({customer.email})
                  </span>
                )}
              </Label>
              <Switch
                id="sendEmail"
                checked={sendEmail}
                onCheckedChange={setSendEmail}
                disabled={!customer.email}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label
                htmlFor="createPdf"
                className="flex items-center gap-2 cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                Generate PDF document
              </Label>
              <Switch
                id="createPdf"
                checked={createPdf}
                onCheckedChange={setCreatePdf}
              />
            </div>
          </div>

          {!customer.email && sendEmail && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                No email address provided. Add email in customer info to send.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => router.push("/estimates")}
          className="flex items-center gap-2"
        >
          Save as Draft
        </Button>

        <Button
          onClick={handleSend}
          disabled={isSending}
          className="flex items-center gap-2"
          size="lg"
        >
          {isSending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Creating Estimate...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Create & Send Estimate
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
