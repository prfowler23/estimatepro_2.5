/**
 * Mobile Summary & Review Step
 *
 * Mobile-optimized summary and review interface with:
 * - Comprehensive project overview
 * - Touch-friendly review sections
 * - Quick edit access to any section
 * - PDF preview and generation
 * - Send/share options
 * - Signature capture
 * - Final approval workflow
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
import {
  useHapticFeedback,
  useDeviceCapabilities,
} from "@/components/providers/MobileGestureProvider";
import {
  FileText,
  User,
  MapPin,
  Ruler,
  DollarSign,
  Calendar,
  Mail,
  Phone,
  Download,
  Share2,
  Edit,
  Check,
  AlertCircle,
  Eye,
  Send,
  Signature,
  ChevronRight,
  ChevronDown,
  Copy,
  Star,
  Clock,
  Shield,
  Zap,
} from "lucide-react";

interface MobileSummaryProps {
  data: any;
  onUpdate: (data: any) => void;
  onEditSection?: (sectionKey: string) => void;
  onGeneratePDF?: () => void;
  onSendEstimate?: () => void;
  isMobile?: boolean;
  screenSize?: { width: number; height: number; orientation: string };
}

interface ReviewSection {
  key: string;
  title: string;
  icon: React.ComponentType<any>;
  status: "complete" | "incomplete" | "warning";
  items: ReviewItem[];
  estimatedValue?: number;
}

interface ReviewItem {
  label: string;
  value: string | number;
  subtext?: string;
  important?: boolean;
}

/**
 * Mobile Summary Component
 */
export function MobileSummary({
  data,
  onUpdate,
  onEditSection,
  onGeneratePDF,
  onSendEstimate,
  isMobile = true,
  screenSize,
}: MobileSummaryProps) {
  const { haptic } = useHapticFeedback();
  const { isTouch } = useDeviceCapabilities();

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showSendOptions, setShowSendOptions] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<
    "pending" | "approved" | "changes"
  >(data?.approvalStatus || "pending");

  // Build review sections from data
  const reviewSections = useMemo((): ReviewSection[] => {
    const sections: ReviewSection[] = [];

    // Customer Information
    if (data?.customerInfo) {
      const customerInfo = data.customerInfo;
      sections.push({
        key: "customer",
        title: "Customer Information",
        icon: User,
        status:
          customerInfo.name && customerInfo.email && customerInfo.phone
            ? "complete"
            : "incomplete",
        items: [
          { label: "Name", value: customerInfo.name || "Not provided" },
          { label: "Email", value: customerInfo.email || "Not provided" },
          { label: "Phone", value: customerInfo.phone || "Not provided" },
          { label: "Company", value: customerInfo.company || "Not specified" },
          {
            label: "Address",
            value:
              `${customerInfo.address || ""} ${customerInfo.city || ""} ${customerInfo.state || ""} ${customerInfo.zipCode || ""}`.trim() ||
              "Not provided",
          },
        ],
      });
    }

    // Project Details
    if (data?.projectTitle || data?.selectedServices) {
      sections.push({
        key: "project",
        title: "Project Details",
        icon: FileText,
        status:
          data?.projectTitle && data?.selectedServices?.length > 0
            ? "complete"
            : "incomplete",
        items: [
          { label: "Title", value: data?.projectTitle || "Not specified" },
          {
            label: "Services",
            value:
              data?.selectedServices?.length > 0
                ? `${data.selectedServices.length} selected`
                : "None selected",
            subtext: data?.selectedServices?.join(", ") || undefined,
          },
          {
            label: "Description",
            value: data?.description || "No description",
          },
        ],
      });
    }

    // Measurements
    if (data?.areas || data?.totalArea) {
      sections.push({
        key: "measurements",
        title: "Measurements",
        icon: Ruler,
        status: data?.totalArea > 0 ? "complete" : "incomplete",
        items: [
          {
            label: "Total Area",
            value: `${data?.totalArea?.toFixed(1) || 0} ${data?.defaultUnit || "sq ft"}²`,
            important: true,
          },
          { label: "Areas", value: `${data?.areas?.length || 0} measured` },
        ],
        estimatedValue: data?.totalArea || 0,
      });
    }

    // Pricing
    if (data?.pricingSections || data?.totalPricing) {
      const pricing = data.totalPricing || {};
      sections.push({
        key: "pricing",
        title: "Pricing & Total",
        icon: DollarSign,
        status: pricing.total > 0 ? "complete" : "incomplete",
        items: [
          {
            label: "Subtotal",
            value: `$${pricing.subtotal?.toFixed(2) || "0.00"}`,
          },
          {
            label: "Tax",
            value: `$${pricing.tax?.toFixed(2) || "0.00"}`,
          },
          {
            label: "Total",
            value: `$${pricing.total?.toFixed(2) || "0.00"}`,
            important: true,
          },
          {
            label: "Strategy",
            value: data?.pricingStrategy || "Not set",
            subtext: `${pricing.averageMargin?.toFixed(1) || 0}% avg margin`,
          },
        ],
        estimatedValue: pricing.total || 0,
      });
    }

    return sections;
  }, [data]);

  // Calculate completion status
  const completionStatus = useMemo(() => {
    const totalSections = reviewSections.length;
    const completeSections = reviewSections.filter(
      (s) => s.status === "complete",
    ).length;
    const completionRate =
      totalSections > 0 ? (completeSections / totalSections) * 100 : 0;

    return {
      total: totalSections,
      complete: completeSections,
      rate: completionRate,
      isReady: completionRate >= 80, // 80% completion required
    };
  }, [reviewSections]);

  // Update parent component when data changes
  const updateData = useCallback(() => {
    onUpdate({
      ...data,
      approvalStatus,
      completionStatus,
      isCompleted: completionStatus.isReady,
    });
  }, [data, approvalStatus, completionStatus, onUpdate]);

  useEffect(() => {
    updateData();
  }, [updateData]);

  // Handle section editing
  const handleEditSection = useCallback(
    (sectionKey: string) => {
      haptic("impact", "medium");
      if (onEditSection) {
        onEditSection(sectionKey);
      }
    },
    [haptic, onEditSection],
  );

  // Handle approval status
  const handleApprovalChange = useCallback(
    (status: typeof approvalStatus) => {
      haptic("impact", "heavy");
      setApprovalStatus(status);
    },
    [haptic],
  );

  // Handle sending estimate
  const handleSendEstimate = useCallback(() => {
    haptic("impact", "heavy");
    if (onSendEstimate) {
      onSendEstimate();
    }
    setShowSendOptions(false);
  }, [haptic, onSendEstimate]);

  return (
    <div className="space-y-4 pb-6">
      {/* Header with Completion Status */}
      <Card className="bg-gradient-to-r from-primary-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Estimate Summary
          </CardTitle>
          <div className="space-y-3">
            {/* Completion Progress */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                {completionStatus.complete} of {completionStatus.total} sections
                complete
              </span>
              <Badge
                variant={completionStatus.isReady ? "secondary" : "outline"}
                className={cn(
                  completionStatus.isReady
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700",
                )}
              >
                {completionStatus.rate.toFixed(0)}% Ready
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-primary-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionStatus.rate}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center">
                <div className="text-lg font-bold text-primary-600">
                  {data?.totalArea?.toFixed(0) || 0}
                </div>
                <div className="text-xs text-text-secondary">Sq Ft</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary-600">
                  ${data?.totalPricing?.total?.toFixed(0) || 0}
                </div>
                <div className="text-xs text-text-secondary">Total</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary-600">
                  {data?.selectedServices?.length || 0}
                </div>
                <div className="text-xs text-text-secondary">Services</div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Review Sections */}
      <div className="space-y-3">
        {reviewSections.map((section) => {
          const isActive = activeSection === section.key;
          const StatusIcon =
            section.status === "complete"
              ? Check
              : section.status === "warning"
                ? AlertCircle
                : Edit;

          return (
            <Card
              key={section.key}
              className={cn(isActive && "ring-2 ring-primary-500")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      haptic("selection");
                      setActiveSection(isActive ? null : section.key);
                    }}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <section.icon className="h-5 w-5 text-primary-600" />
                      <div>
                        <div className="font-medium">{section.title}</div>
                        <div className="text-sm text-text-secondary">
                          {section.estimatedValue
                            ? `$${section.estimatedValue.toFixed(2)}`
                            : `${section.items.length} items`}
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <StatusIcon
                      className={cn(
                        "h-5 w-5",
                        section.status === "complete"
                          ? "text-green-600"
                          : section.status === "warning"
                            ? "text-yellow-600"
                            : "text-gray-400",
                      )}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSection(section.key)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-text-secondary transition-transform",
                        isActive && "rotate-180",
                      )}
                    />
                  </div>
                </div>
              </CardHeader>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0 space-y-3">
                      {section.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-start"
                        >
                          <div className="flex-1">
                            <div
                              className={cn(
                                "text-sm",
                                item.important
                                  ? "font-semibold"
                                  : "font-medium",
                              )}
                            >
                              {item.label}
                            </div>
                            {item.subtext && (
                              <div className="text-xs text-text-secondary mt-1">
                                {item.subtext}
                              </div>
                            )}
                          </div>
                          <div
                            className={cn(
                              "text-sm text-right",
                              item.important
                                ? "font-bold text-primary-700"
                                : "text-text-primary",
                            )}
                          >
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      {/* Approval Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Signature className="h-5 w-5" />
            Review & Approval
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                key: "pending" as const,
                label: "Pending",
                color: "text-yellow-600",
              },
              {
                key: "approved" as const,
                label: "Approved",
                color: "text-green-600",
              },
              {
                key: "changes" as const,
                label: "Changes",
                color: "text-red-600",
              },
            ].map((status) => (
              <button
                key={status.key}
                onClick={() => handleApprovalChange(status.key)}
                className={cn(
                  "p-3 rounded-lg border text-center transition-all touch-manipulation",
                  approvalStatus === status.key
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 bg-white",
                )}
              >
                <div className={cn("font-medium text-sm", status.color)}>
                  {status.label}
                </div>
              </button>
            ))}
          </div>

          {approvalStatus === "approved" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-lg p-3"
            >
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-green-700 font-medium">
                  Estimate approved and ready to send
                </span>
              </div>
            </motion.div>
          )}

          {approvalStatus === "changes" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-3"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <span className="text-red-700 font-medium">
                    Changes Required
                  </span>
                  <p className="text-red-600 text-sm mt-1">
                    Review and update the sections marked as incomplete.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Primary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => {
              haptic("impact", "light");
              onGeneratePDF?.();
            }}
            className="flex items-center justify-center gap-2"
            disabled={!completionStatus.isReady}
          >
            <Eye className="h-4 w-4" />
            Preview PDF
          </Button>

          <Button
            onClick={() => {
              haptic("selection");
              setShowSendOptions(!showSendOptions);
            }}
            className="flex items-center justify-center gap-2"
            disabled={
              !completionStatus.isReady || approvalStatus !== "approved"
            }
          >
            <Send className="h-4 w-4" />
            Send Estimate
          </Button>
        </div>

        {/* Send Options */}
        <AnimatePresence>
          {showSendOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <h4 className="font-medium">Send Options</h4>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={handleSendEstimate}
                      className="w-full justify-start"
                    >
                      <Mail className="h-4 w-4 mr-3" />
                      Email to Customer
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        haptic("selection");
                        // Share functionality would be implemented here
                      }}
                      className="w-full justify-start"
                    >
                      <Share2 className="h-4 w-4 mr-3" />
                      Share Link
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        haptic("selection");
                        onGeneratePDF?.();
                      }}
                      className="w-full justify-start"
                    >
                      <Download className="h-4 w-4 mr-3" />
                      Download PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => {
              haptic("selection");
              // Copy functionality would be implemented here
            }}
            className="flex items-center justify-center gap-2"
            size="sm"
          >
            <Copy className="h-4 w-4" />
            Copy Link
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              haptic("selection");
              // Save as template functionality would be implemented here
            }}
            className="flex items-center justify-center gap-2"
            size="sm"
          >
            <Star className="h-4 w-4" />
            Save Template
          </Button>
        </div>
      </div>

      {/* Completion Requirements */}
      {!completionStatus.isReady && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">
                  Complete Required Sections
                </h4>
                <p className="text-sm text-amber-700 mt-1">
                  Finish the incomplete sections to generate and send your
                  estimate.
                </p>
                <ul className="text-sm text-amber-700 mt-2 space-y-1">
                  {reviewSections
                    .filter((s) => s.status !== "complete")
                    .map((section) => (
                      <li key={section.key} className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 bg-amber-600 rounded-full" />
                        {section.title}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {completionStatus.isReady && approvalStatus === "approved" && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800">Estimate Ready!</h4>
                <p className="text-sm text-green-700 mt-1">
                  Your estimate is complete and approved. Ready to send to
                  customer.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MobileSummary;
