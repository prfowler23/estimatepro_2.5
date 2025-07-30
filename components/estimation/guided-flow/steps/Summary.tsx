import { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Send,
  CheckCircle,
  Eye,
  Clock,
  Edit,
  Share2,
  Sparkles,
  DollarSign,
  Calendar,
  MapPin,
  Building,
  User,
  Phone,
  Mail,
  Palette,
  Image,
  Settings,
  History,
  Bell,
  BarChart,
  Upload,
  ExternalLink,
  Printer,
  Save,
  Copy,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SummaryStepData, GuidedFlowData } from "@/lib/types/estimate-types";

interface ProposalCustomization {
  introduction: string;
  closing: string;
  includeSections: {
    executiveSummary: boolean;
    scopeDetails: boolean;
    timeline: boolean;
    investment: boolean;
    terms: boolean;
    photoGallery: boolean;
  };
  branding: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
  };
}

interface SummaryProps {
  data: GuidedFlowData;
  onUpdate: (stepData: Partial<GuidedFlowData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Summary({ data, onUpdate, onNext, onBack }: SummaryProps) {
  const [activeTab, setActiveTab] = useState("review");
  const [summaryData, setSummaryData] = useState<SummaryStepData | null>(null);
  const [customization, setCustomization] = useState<ProposalCustomization>({
    introduction:
      "Thank you for considering our professional building services. We're excited to present this comprehensive proposal tailored to your specific needs.",
    closing:
      "We look forward to the opportunity to work with you and deliver exceptional results for your project.",
    includeSections: {
      executiveSummary: true,
      scopeDetails: true,
      timeline: true,
      investment: true,
      terms: true,
      photoGallery: true,
    },
    branding: {
      logo: "",
      primaryColor: "#2563eb",
      secondaryColor: "#64748b",
    },
  });
  const [exportOptions, setExportOptions] = useState({
    format: "pdf",
    delivery: "email",
    tracking: true,
    signature: true,
    followUp: true,
  });
  const [generating, setGenerating] = useState(false);
  const [proposalGenerated, setProposalGenerated] = useState(false);

  useEffect(() => {
    consolidateData();
  }, [data]);

  const consolidateData = () => {
    // Consolidate all step data into comprehensive summary
    const customerInfo = {
      name:
        data.initialContact?.aiExtractedData?.customer?.name ||
        "Unknown Customer",
      company: data.initialContact?.aiExtractedData?.customer?.company || "",
      email: data.initialContact?.aiExtractedData?.customer?.email || "",
      phone: data.initialContact?.aiExtractedData?.customer?.phone || "",
      address:
        data.initialContact?.aiExtractedData?.requirements?.location || "",
      contactMethod: data.initialContact?.contactMethod || "email",
      requirements: data.initialContact?.aiExtractedData?.requirements || {},
    };

    // Calculate totals from step data
    const totalPrice = data.pricing?.finalPrice || 0;
    const estimatedDuration =
      typeof data.duration?.estimatedDuration === "number"
        ? data.duration.estimatedDuration
        : typeof data.duration?.estimatedDuration === "object" &&
            data.duration.estimatedDuration
          ? data.duration.estimatedDuration.days +
            data.duration.estimatedDuration.hours / 24
          : 0;
    const selectedServices = data.scopeDetails?.selectedServices || [];

    const consolidated: SummaryStepData = {
      finalEstimate: {
        id: `est-${Date.now()}`,
        summary: {
          totalPrice,
          totalTime: estimatedDuration,
          totalArea: data.areaOfWork?.totalArea || 0,
          serviceCount: selectedServices.length,
          complexityScore: 3, // Default complexity
        },
        services: selectedServices.map((service) => ({
          quote_id: `est-${Date.now()}`,
          serviceType: service as string,
          description: `${service} service`,
          quantity: 0,
          unit: "sq ft",
          unitPrice: 0,
          price: 0,
          area_sqft: null,
          glass_sqft: null,
          duration: 0,
          dependencies: [],
        })),
        timeline: {
          startDate: new Date(),
          endDate: new Date(
            Date.now() + estimatedDuration * 24 * 60 * 60 * 1000,
          ),
          totalDuration: estimatedDuration,
          phases: [],
          milestones: [],
          criticalPath: [],
        },
        terms: {
          paymentSchedule: [],
          warranties: [],
          limitations: [],
          changeOrderPolicy: "Standard change order policy applies",
          cancellationPolicy: "Standard cancellation policy applies",
          insuranceRequirements: [],
        },
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        approval: {
          status: "pending" as const,
        },
      },
      proposalGenerated: false,
      customer: customerInfo,
      pricing: {
        finalPrice: totalPrice,
        strategy: data.pricing?.strategy || "standard",
        winProbability: data.pricing?.winProbability || 0.5,
      },
      timeline: {
        startDate: new Date(),
        endDate: new Date(Date.now() + estimatedDuration * 24 * 60 * 60 * 1000),
        duration: estimatedDuration,
        milestones: [],
      },
      services: selectedServices,
      costs: {
        equipment: data.expenses?.equipment || 0,
        materials: data.expenses?.materials || 0,
        labor: data.expenses?.labor || 0,
        other: data.expenses?.other || 0,
      },
      status: "draft" as const,
      proposal: {
        content: "",
        generatedAt: new Date(),
      },
    };

    setSummaryData(consolidated);
  };

  const generateProposal = async () => {
    setGenerating(true);

    // Simulate proposal generation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate proposal content
    const proposalContent = `
      PROFESSIONAL BUILDING SERVICES PROPOSAL
      
      Executive Summary:
      Project: ${summaryData?.customer.requirements.buildingType || "Commercial Building"} Services
      Client: ${summaryData?.customer.name}
      Total Investment: $${summaryData?.pricing.finalPrice.toLocaleString()}
      Project Duration: ${summaryData?.timeline.duration} days
      
      Scope of Work:
      ${summaryData?.finalEstimate.services.map((service: any) => `• ${service.description || service.serviceType}`).join("\n")}
      
      Timeline:
      Start Date: ${summaryData?.timeline.startDate.toLocaleDateString()}
      Completion Date: ${summaryData?.timeline.endDate.toLocaleDateString()}
      
      Investment Breakdown:
      Equipment: $${summaryData?.costs.equipment.toLocaleString()}
      Materials: $${summaryData?.costs.materials.toLocaleString()}
      Labor: $${summaryData?.costs.labor.toLocaleString()}
      Other: $${summaryData?.costs.other.toLocaleString()}
      
      Total Project Investment: $${summaryData?.pricing.finalPrice.toLocaleString()}
    `;

    if (summaryData) {
      setSummaryData({
        ...summaryData,
        proposal: {
          ...summaryData.proposal,
          content: proposalContent,
          generatedAt: new Date(),
        },
      });
    }

    setProposalGenerated(true);
    setGenerating(false);

    // Track analytics event
    trackEvent("proposal_generated", {
      customer: summaryData?.customer.name,
      value: summaryData?.pricing.finalPrice,
      services: summaryData?.finalEstimate.services.length,
    });
  };

  const exportToPDF = async () => {
    // Simulate PDF generation
    setGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // In real implementation, would generate PDF
    const blob = new Blob(["PDF content"], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Proposal_${summaryData?.customer.name.replace(/\s+/g, "_")}_${new Date().getTime()}.pdf`;
    link.click();

    setGenerating(false);
    trackEvent("proposal_exported", { format: "pdf" });
  };

  const sendProposal = async () => {
    setGenerating(true);

    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (summaryData) {
      setSummaryData({
        ...summaryData,
        status: "sent",
      });
    }

    setGenerating(false);
    trackEvent("proposal_sent", {
      customer: summaryData?.customer.email,
      tracking: exportOptions.tracking,
    });

    alert("Proposal sent successfully! Tracking link has been enabled.");
  };

  const trackEvent = (event: string, properties: any) => {
    // Analytics tracking implementation
    // TODO: Implement actual analytics tracking
  };

  const handleCustomizationChange = (key: string, value: any) => {
    setCustomization((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSectionToggle = (section: string, enabled: boolean) => {
    setCustomization((prev) => ({
      ...prev,
      includeSections: {
        ...prev.includeSections,
        [section]: enabled,
      },
    }));
  };

  if (!summaryData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Consolidating estimate data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-500" />
          Estimate Summary & Proposal
        </h2>
        <p className="text-muted-foreground">
          Review, customize, and send your professional estimate
        </p>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-4">
        <Badge
          className={
            (summaryData.status || "draft") === "draft"
              ? "bg-gray-500"
              : (summaryData.status || "draft") === "sent"
                ? "bg-blue-500"
                : (summaryData.status || "draft") === "viewed"
                  ? "bg-yellow-500"
                  : (summaryData.status || "draft") === "accepted"
                    ? "bg-green-500"
                    : "bg-red-500"
          }
        >
          {(summaryData.status || "draft").charAt(0).toUpperCase() +
            (summaryData.status || "draft").slice(1)}
        </Badge>
        <span className="text-sm text-gray-600">
          Last updated: {summaryData.proposal.generatedAt.toLocaleString()}
        </span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="customize">Customize</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="space-y-6">
          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Investment</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${summaryData.pricing.finalPrice.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Project Duration</p>
                  <p className="text-xl font-bold">
                    {summaryData.timeline.duration} days
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Win Probability</p>
                  <p className="text-xl font-bold text-blue-600">
                    {Math.round(summaryData.pricing.winProbability * 100)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Services</p>
                  <p className="text-xl font-bold">
                    {summaryData.finalEstimate.services.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">{summaryData.customer.name}</p>
                  {summaryData.customer.company && (
                    <p className="text-gray-600">
                      {summaryData.customer.company}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">
                      {summaryData.customer.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">
                      {summaryData.customer.phone}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">
                      {summaryData.customer.address}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Building className="w-4 h-4" />
                    <span className="text-sm capitalize">
                      {summaryData.customer.requirements.buildingType ||
                        "Commercial"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scope of Work */}
          <Card>
            <CardHeader>
              <CardTitle>Scope of Work</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summaryData.services?.map((service: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded"
                  >
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium">{service}</span>
                    {false && ( // Simplified for now
                      <Badge variant="secondary" className="text-xs">
                        Auto-added
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Project Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="font-medium">
                      {summaryData.timeline.startDate.toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Completion Date</p>
                    <p className="font-medium">
                      {summaryData.timeline.endDate.toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {summaryData.timeline.milestones.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Key Milestones</p>
                    <div className="space-y-2">
                      {summaryData.timeline.milestones.map(
                        (milestone: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 text-sm"
                          >
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">
                              {milestone.name}
                            </span>
                            <span className="text-gray-600">
                              {milestone.date.toLocaleDateString()}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Investment Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Investment Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Equipment:</span>
                      <span className="font-medium">
                        ${summaryData.costs.equipment.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Materials:</span>
                      <span className="font-medium">
                        ${summaryData.costs.materials.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Labor:</span>
                      <span className="font-medium">
                        ${summaryData.costs.labor.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Other:</span>
                      <span className="font-medium">
                        ${summaryData.costs.other.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-center p-4 bg-green-50 rounded">
                      <p className="text-sm text-gray-600">
                        Total Project Investment
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        ${summaryData.pricing.finalPrice.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {summaryData.pricing.strategy} Strategy
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customize" className="space-y-6">
          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Branding & Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Company Logo
                </label>
                <div className="flex items-center gap-4">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Logo
                  </Button>
                  {customization.branding.logo && (
                    <img
                      src={customization.branding.logo}
                      alt="Logo"
                      className="h-12"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Primary Color
                  </label>
                  <Input
                    type="color"
                    value={customization.branding.primaryColor}
                    onChange={(e) =>
                      handleCustomizationChange("branding", {
                        ...customization.branding,
                        primaryColor: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Secondary Color
                  </label>
                  <Input
                    type="color"
                    value={customization.branding.secondaryColor}
                    onChange={(e) =>
                      handleCustomizationChange("branding", {
                        ...customization.branding,
                        secondaryColor: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Customization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Content Customization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Introduction
                </label>
                <Textarea
                  value={customization.introduction}
                  onChange={(e) =>
                    handleCustomizationChange("introduction", e.target.value)
                  }
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Closing
                </label>
                <Textarea
                  value={customization.closing}
                  onChange={(e) =>
                    handleCustomizationChange("closing", e.target.value)
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section Toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Include Sections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(customization.includeSections).map(
                  ([section, enabled]) => (
                    <div
                      key={section}
                      className="flex items-center justify-between"
                    >
                      <label className="text-sm font-medium capitalize">
                        {section.replace(/([A-Z])/g, " $1").trim()}
                      </label>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          handleSectionToggle(section, checked)
                        }
                      />
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Format
                  </label>
                  <Select
                    value={exportOptions.format}
                    onValueChange={(value) =>
                      setExportOptions((prev) => ({ ...prev, format: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="docx">Word Document</SelectItem>
                      <SelectItem value="html">Web Page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Delivery Method
                  </label>
                  <Select
                    value={exportOptions.delivery}
                    onValueChange={(value) =>
                      setExportOptions((prev) => ({ ...prev, delivery: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="download">Download</SelectItem>
                      <SelectItem value="portal">Client Portal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Enable Tracking</label>
                  <Switch
                    checked={exportOptions.tracking}
                    onCheckedChange={(checked) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        tracking: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Digital Signature
                  </label>
                  <Switch
                    checked={exportOptions.signature}
                    onCheckedChange={(checked) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        signature: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Follow-up Automation
                  </label>
                  <Switch
                    checked={exportOptions.followUp}
                    onCheckedChange={(checked) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        followUp: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={generateProposal}
              disabled={generating}
              className="h-16 text-left flex-col items-start"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {generating ? "Generating..." : "Generate Proposal"}
              </div>
              <span className="text-xs opacity-75">
                Create professional proposal
              </span>
            </Button>

            <Button
              onClick={exportToPDF}
              disabled={!proposalGenerated || generating}
              variant="outline"
              className="h-16 text-left flex-col items-start"
            >
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export PDF
              </div>
              <span className="text-xs opacity-75">
                Download proposal as PDF
              </span>
            </Button>

            <Button
              onClick={sendProposal}
              disabled={!proposalGenerated || generating}
              variant="outline"
              className="h-16 text-left flex-col items-start"
            >
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send to Client
              </div>
              <span className="text-xs opacity-75">Email with tracking</span>
            </Button>

            <Button
              variant="outline"
              className="h-16 text-left flex-col items-start"
            >
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Share Link
              </div>
              <span className="text-xs opacity-75">
                Generate shareable link
              </span>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="w-5 h-5" />
                Proposal Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-gray-600">Views</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-gray-600">Downloads</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-sm text-gray-600">Last Viewed</p>
                </div>
              </div>

              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  Tracking will begin once the proposal is sent to the client.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Version History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">Version 1.0</p>
                    <p className="text-sm text-gray-600">
                      Initial proposal -{" "}
                      {summaryData.proposal.generatedAt.toLocaleString()}
                    </p>
                  </div>
                  <Badge>Current</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onBack}>
          Back to Pricing
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Draft
          </Button>
          <Button
            onClick={() => {
              onUpdate({ summary: summaryData });
              // In a real app, this might navigate to a project dashboard
              alert("Estimate completed and saved!");
            }}
          >
            Complete Estimate
          </Button>
        </div>
      </div>
    </div>
  );
}
