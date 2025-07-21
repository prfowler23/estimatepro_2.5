import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import {
  Mail,
  FileText,
  AlertCircle,
  Phone,
  Users,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { InitialContactData, GuidedFlowData } from "@/lib/types/estimate-types";
import { SmartField } from "@/components/ai/SmartField";
import { MobileOptimizedSmartField } from "@/components/ui/mobile/MobileOptimizedSmartField";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { HelpTooltip } from "@/components/help/HelpTooltip";
import {
  useAIErrorHandler,
  useNetworkErrorHandler,
} from "@/hooks/useErrorHandler";
import { useErrorRecovery } from "@/components/error/ErrorRecoveryProvider";

const CONTACT_METHODS = [
  {
    id: "email",
    name: "Email Thread",
    icon: Mail,
    description: "Paste email conversation",
  },
  {
    id: "meeting",
    name: "Meeting Notes",
    icon: Users,
    description: "Notes from meeting",
  },
  {
    id: "phone",
    name: "Phone Call",
    icon: Phone,
    description: "Call summary notes",
  },
  {
    id: "walkin",
    name: "Walk-in",
    icon: MessageSquare,
    description: "In-person discussion",
  },
];

interface InitialContactProps {
  data: GuidedFlowData;
  onUpdate: (stepData: Partial<GuidedFlowData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function InitialContact({
  data,
  onUpdate,
  onNext,
  onBack,
}: InitialContactProps) {
  const { isMobile } = useMobileDetection();
  const [contactData, setContactData] = useState<InitialContactData>({
    contactMethod: data?.initialContact?.contactMethod || "email",
    initialNotes: data?.initialContact?.initialNotes || "",
    aiExtractedData: data?.initialContact?.aiExtractedData,
  });

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionComplete, setExtractionComplete] = useState(false);

  // Error handling hooks
  const aiErrorHandler = useAIErrorHandler();
  const networkErrorHandler = useNetworkErrorHandler();
  const { reportError } = useErrorRecovery();

  // Sync local state with parent data
  useEffect(() => {
    if (data?.initialContact) {
      setContactData(data.initialContact);
    }
  }, [data?.initialContact]);

  useEffect(() => {
    setExtractionComplete(!!contactData.aiExtractedData);
  }, [contactData.aiExtractedData]);

  const handleContactMethodChange = (
    method: InitialContactData["contactMethod"],
  ) => {
    setContactData((prev) => ({
      ...prev,
      contactMethod: method,
      initialNotes: "", // Clear content when changing methods
      aiExtractedData: undefined, // Clear extracted data
    }));
    setExtractionComplete(false);
  };

  const detectRedFlags = (
    extractedData: InitialContactData["aiExtractedData"],
  ): string[] => {
    const redFlags: string[] = [];

    if (!extractedData) return redFlags;

    // Timeline urgency check
    if (
      extractedData.requirements.timeline?.toLowerCase().includes("urgent") ||
      extractedData.requirements.timeline?.toLowerCase().includes("asap")
    ) {
      redFlags.push("Urgent timeline mentioned - may require rush pricing");
    }

    // Budget constraints
    if (
      extractedData.requirements.budget &&
      extractedData.requirements.budget.toLowerCase().includes("budget")
    ) {
      redFlags.push("Budget constraints mentioned - price sensitivity likely");
    }

    // Complex service requirements
    if (extractedData.requirements.services.length > 4) {
      redFlags.push(
        "Multiple services requested - complex coordination required",
      );
    }

    // Confidence check
    if (extractedData.confidence < 0.6) {
      redFlags.push("Low extraction confidence - verify details manually");
    }

    return redFlags;
  };

  const handleEmailExtraction = async () => {
    // Validation with error handling
    if (
      !aiErrorHandler.validateAndHandle(
        contactData.initialNotes?.trim() || "",
        (content) => content.length > 0,
        "Please enter content to extract information from",
      )
    ) {
      return;
    }

    const extractionResult = await aiErrorHandler.handleAsyncOperation(
      async () => {
        setIsExtracting(true);

        // Get the current session for authentication
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Please log in to use AI extraction");
        }

        const response = await fetch("/api/ai/extract-contact-info", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            content: contactData.initialNotes,
            contactMethod: contactData.contactMethod,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `AI extraction failed: ${response.status} ${errorText}`,
          );
        }

        const result = await response.json();

        // Detect red flags based on extracted data
        const redFlags = detectRedFlags(result.extractedData);

        const extractedDataWithRedFlags = {
          ...result.extractedData,
          redFlags,
        };

        setContactData((prev) => ({
          ...prev,
          aiExtractedData: extractedDataWithRedFlags,
        }));

        setExtractionComplete(true);
        return extractedDataWithRedFlags;
      },
      {
        errorType: "ai_service",
        errorCode: "CONTACT_EXTRACTION_FAILED",
        fieldId: "original_content",
      },
    );

    setIsExtracting(false);

    if (!extractionResult) {
      // Error was handled by the error system, but offer manual entry option
      reportError(
        "AI extraction failed. You can continue by entering information manually.",
        {
          errorType: "ai_service",
          errorCode: "AI_EXTRACTION_FALLBACK",
        },
      );
    }
  };

  const getPlaceholderText = () => {
    switch (contactData.contactMethod) {
      case "email":
        return "Paste the email thread here, including any back-and-forth conversation about the cleaning project...";
      case "meeting":
        return "Enter notes from your meeting, including project requirements, timeline, budget discussions...";
      case "phone":
        return "Summarize the phone conversation, including customer needs, building details, timeline...";
      case "walkin":
        return "Enter details from the in-person discussion, including project scope and customer requirements...";
      default:
        return "Enter the contact information and project details...";
    }
  };

  const handleNext = () => {
    onUpdate({ initialContact: contactData });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Initial Contact</h2>
        <p className="text-gray-600">
          Start by selecting how you received this project inquiry and enter the
          details.
        </p>
      </div>

      {/* Contact Method Selector */}
      <div>
        <HelpTooltip
          fieldId="contact_method"
          trigger="hover"
          helpContent={{
            id: "contact-method-help",
            title: "Contact Method Selection",
            content:
              "Choose how you received this project inquiry. This helps the AI understand the context and extract information more accurately.",
            type: "tooltip",
            triggers: [{ type: "onFocus", priority: 5 }],
            audience: ["novice", "intermediate"],
            context: { fieldId: "contact_method" },
            priority: 5,
            tags: ["contact", "ai-enhancement"],
            lastUpdated: new Date().toISOString(),
          }}
        >
          <h3 className="font-semibold mb-3 text-sm sm:text-base">
            How did you receive this inquiry?
          </h3>
        </HelpTooltip>
        <div
          className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}
        >
          {CONTACT_METHODS.map((method) => {
            const IconComponent = method.icon;
            const isSelected = contactData.contactMethod === method.id;

            return (
              <Card
                key={method.id}
                className={`p-4 cursor-pointer transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "hover:border-gray-400"
                }`}
                onClick={() =>
                  handleContactMethodChange(
                    method.id as InitialContactData["contactMethod"],
                  )
                }
              >
                <div className="text-center">
                  <IconComponent
                    className={`w-8 h-8 mx-auto mb-2 ${
                      isSelected ? "text-blue-600" : "text-gray-400"
                    }`}
                  />
                  <h4 className="font-medium text-sm">{method.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {method.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Content Input */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <HelpTooltip
            fieldId="original_content"
            trigger="hover"
            helpContent={{
              id: "ai-extraction-help",
              title: "AI Information Extraction",
              content:
                'Paste your email conversation or meeting notes here, then click "Extract Information with AI" to automatically populate customer details and project requirements.',
              type: "tooltip",
              triggers: [{ type: "onFocus", priority: 8 }],
              audience: ["novice", "intermediate"],
              context: { fieldId: "original_content" },
              priority: 8,
              tags: ["ai-feature", "extraction"],
              lastUpdated: new Date().toISOString(),
            }}
          >
            <h3 className="font-semibold">
              {contactData.contactMethod === "email"
                ? "Email Content"
                : "Contact Details"}
            </h3>
          </HelpTooltip>
          <HelpTooltip
            fieldId="ai_extract_button"
            trigger="hover"
            helpContent={{
              id: "extract-button-help",
              title: "AI Extraction Feature",
              content:
                "Click this button to automatically extract customer information and project details from your text. The AI will identify names, addresses, services needed, and project requirements.",
              type: "tooltip",
              triggers: [{ type: "onFocus", priority: 7 }],
              audience: ["novice"],
              context: { fieldId: "ai_extract_button" },
              priority: 7,
              tags: ["ai-feature", "automation"],
              lastUpdated: new Date().toISOString(),
            }}
          >
            <Button
              onClick={handleEmailExtraction}
              disabled={!contactData.initialNotes?.trim() || isExtracting}
              className="flex items-center"
              data-tutorial="ai-extract"
            >
              {isExtracting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Extracting...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Extract Information with AI
                </>
              )}
            </Button>
          </HelpTooltip>
        </div>

        <textarea
          className={`w-full p-4 border rounded-lg resize-none ${isMobile ? "h-32 text-sm" : "h-40"}`}
          placeholder={getPlaceholderText()}
          value={contactData.initialNotes}
          onChange={(e) =>
            setContactData((prev) => ({
              ...prev,
              initialNotes: e.target.value,
            }))
          }
        />
      </div>

      {/* Extracted Data Display */}
      {contactData.aiExtractedData && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Extracted Information</h3>

          {/* Red Flags Alert */}
          {(() => {
            const redFlags = detectRedFlags(contactData.aiExtractedData);
            return (
              redFlags.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <div>
                    <h4 className="font-medium mb-2">⚠️ Red Flags Detected</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {redFlags.map((flag, index) => (
                        <li key={index} className="text-sm">
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Alert>
              )
            );
          })()}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Customer Details */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Customer Details</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Name:</strong>{" "}
                  {contactData.aiExtractedData.customer.name}
                </div>
                <div>
                  <strong>Company:</strong>{" "}
                  {contactData.aiExtractedData.customer.company}
                </div>
                <div>
                  <strong>Email:</strong>{" "}
                  {contactData.aiExtractedData.customer.email}
                </div>
                <div>
                  <strong>Phone:</strong>{" "}
                  {contactData.aiExtractedData.customer.phone}
                </div>
                <div>
                  <strong>Address:</strong>{" "}
                  {contactData.aiExtractedData.customer.address}
                </div>
              </div>
            </Card>

            {/* Requirements */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Requirements</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Services:</strong>{" "}
                  {contactData.aiExtractedData.requirements.services.join(", ")}
                </div>
                <div>
                  <strong>Building Type:</strong>{" "}
                  {contactData.aiExtractedData.requirements.buildingType}
                </div>
                <div>
                  <strong>Building Size:</strong>{" "}
                  {contactData.aiExtractedData.requirements.buildingSize}
                </div>
                <div>
                  <strong>Floors:</strong>{" "}
                  {contactData.aiExtractedData.requirements.floors}
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Timeline & Requirements</h4>
              <div className="space-y-2 text-sm">
                {contactData.aiExtractedData.requirements.timeline && (
                  <div>
                    <strong>Timeline:</strong>{" "}
                    {contactData.aiExtractedData.requirements.timeline}
                  </div>
                )}
                {contactData.aiExtractedData.requirements.budget && (
                  <div>
                    <strong>Budget:</strong>{" "}
                    {contactData.aiExtractedData.requirements.budget}
                  </div>
                )}
                <div>
                  <strong>Urgency Score:</strong>
                  <span
                    className={`ml-2 px-2 py-1 rounded text-xs ${
                      contactData.aiExtractedData.urgencyScore > 0.7
                        ? "bg-red-100 text-red-700"
                        : contactData.aiExtractedData.urgencyScore > 0.4
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {Math.round(contactData.aiExtractedData.urgencyScore * 100)}
                    %
                  </span>
                </div>
                <div>
                  <strong>Confidence:</strong>
                  <span
                    className={`ml-2 px-2 py-1 rounded text-xs ${
                      contactData.aiExtractedData.confidence > 0.8
                        ? "bg-green-100 text-green-700"
                        : contactData.aiExtractedData.confidence > 0.6
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {Math.round(contactData.aiExtractedData.confidence * 100)}%
                  </span>
                </div>
              </div>
            </Card>

            {/* Requirements Details */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Service Requirements</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Services:</strong>{" "}
                  {contactData.aiExtractedData.requirements.services.join(", ")}
                </div>
                <div>
                  <strong>Building Type:</strong>{" "}
                  {contactData.aiExtractedData.requirements.buildingType}
                </div>
                {contactData.aiExtractedData.requirements.buildingSize && (
                  <div>
                    <strong>Building Size:</strong>{" "}
                    {contactData.aiExtractedData.requirements.buildingSize}
                  </div>
                )}
                {contactData.aiExtractedData.requirements.floors && (
                  <div>
                    <strong>Floors:</strong>{" "}
                    {contactData.aiExtractedData.requirements.floors}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Manual Customer Data Entry */}
      {!contactData.aiExtractedData && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Manual Customer Information
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Fill in customer details manually or use AI extraction above for
            automatic data parsing.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Customer Details</h4>

              {isMobile ? (
                <MobileOptimizedSmartField
                  field="customer.name"
                  value={
                    (contactData.aiExtractedData as any)?.customer?.name || ""
                  }
                  onChange={(value) =>
                    setContactData((prev) => ({
                      ...prev,
                      aiExtractedData: {
                        ...(prev.aiExtractedData as any),
                        customer: {
                          ...(prev.aiExtractedData as any)?.customer,
                          name: value,
                        },
                      } as any,
                    }))
                  }
                  label="Customer Name"
                  placeholder="Enter customer name"
                  required
                  enablePredictions
                  flowData={data}
                  currentStep={1}
                />
              ) : (
                <SmartField
                  field="customer.name"
                  value={
                    (contactData.aiExtractedData as any)?.customer?.name || ""
                  }
                  onChange={(value) =>
                    setContactData((prev) => ({
                      ...prev,
                      aiExtractedData: {
                        ...(prev.aiExtractedData as any),
                        customer: {
                          ...(prev.aiExtractedData as any)?.customer,
                          name: value,
                        },
                      } as any,
                    }))
                  }
                  label="Customer Name"
                  placeholder="Enter customer name"
                  required
                  enablePredictions
                  flowData={data}
                  currentStep={1}
                />
              )}

              <SmartField
                field="customer.company"
                value={
                  (contactData.aiExtractedData as any)?.customer?.company || ""
                }
                onChange={(value) =>
                  setContactData((prev) => ({
                    ...prev,
                    aiExtractedData: {
                      ...(prev.aiExtractedData as any),
                      customer: {
                        ...(prev.aiExtractedData as any)?.customer,
                        company: value,
                      },
                    } as any,
                  }))
                }
                label="Company Name"
                placeholder="Enter company name"
                enablePredictions
                flowData={data}
                currentStep={1}
              />

              <SmartField
                field="customer.email"
                value={
                  (contactData.aiExtractedData as any)?.customer?.email || ""
                }
                onChange={(value) =>
                  setContactData((prev) => ({
                    ...prev,
                    aiExtractedData: {
                      ...(prev.aiExtractedData as any),
                      customer: {
                        ...(prev.aiExtractedData as any)?.customer,
                        email: value,
                      },
                    } as any,
                  }))
                }
                type="email"
                label="Email Address"
                placeholder="customer@example.com"
                enablePredictions
                flowData={data}
                currentStep={1}
              />

              <SmartField
                field="customer.phone"
                value={
                  (contactData.aiExtractedData as any)?.customer?.phone || ""
                }
                onChange={(value) =>
                  setContactData((prev) => ({
                    ...prev,
                    aiExtractedData: {
                      ...(prev.aiExtractedData as any),
                      customer: {
                        ...(prev.aiExtractedData as any)?.customer,
                        phone: value,
                      },
                    } as any,
                  }))
                }
                type="phone"
                label="Phone Number"
                placeholder="(555) 123-4567"
                flowData={data}
                currentStep={1}
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Project Requirements</h4>

              <SmartField
                field="requirements.buildingType"
                value={
                  (contactData.aiExtractedData as any)?.requirements
                    ?.buildingType || ""
                }
                onChange={(value) =>
                  setContactData((prev) => ({
                    ...prev,
                    aiExtractedData: {
                      ...(prev.aiExtractedData as any),
                      requirements: {
                        ...(prev.aiExtractedData as any)?.requirements,
                        buildingType: value,
                      },
                    } as any,
                  }))
                }
                type="select"
                label="Building Type"
                options={[
                  { value: "office", label: "Office Building" },
                  { value: "retail", label: "Retail Store" },
                  { value: "restaurant", label: "Restaurant" },
                  { value: "hospital", label: "Hospital/Medical" },
                  { value: "school", label: "School/Educational" },
                  { value: "industrial", label: "Industrial" },
                  { value: "residential", label: "Residential" },
                ]}
                enableSmartDefaults
                flowData={data}
                currentStep={1}
              />

              <SmartField
                field="requirements.buildingSize"
                value={
                  (contactData.aiExtractedData as any)?.requirements
                    ?.buildingSize || ""
                }
                onChange={(value) =>
                  setContactData((prev) => ({
                    ...prev,
                    aiExtractedData: {
                      ...(prev.aiExtractedData as any),
                      requirements: {
                        ...(prev.aiExtractedData as any)?.requirements,
                        buildingSize: value,
                      },
                    } as any,
                  }))
                }
                label="Building Size"
                placeholder="e.g., 50,000 sq ft"
                enableSmartDefaults
                flowData={data}
                currentStep={1}
              />

              <SmartField
                field="requirements.floors"
                value={
                  (contactData.aiExtractedData as any)?.requirements?.floors ||
                  ""
                }
                onChange={(value) =>
                  setContactData((prev) => ({
                    ...prev,
                    aiExtractedData: {
                      ...(prev.aiExtractedData as any),
                      requirements: {
                        ...(prev.aiExtractedData as any)?.requirements,
                        floors: Number(value),
                      },
                    } as any,
                  }))
                }
                type="number"
                label="Number of Floors"
                placeholder="1"
                enableSmartDefaults
                flowData={data}
                currentStep={1}
              />

              <SmartField
                field="timeline.requestedDate"
                value={
                  (contactData.aiExtractedData as any)?.timeline
                    ?.requestedDate || ""
                }
                onChange={(value) =>
                  setContactData((prev) => ({
                    ...prev,
                    aiExtractedData: {
                      ...(prev.aiExtractedData as any),
                      timeline: {
                        ...(prev.aiExtractedData as any)?.timeline,
                        requestedDate: value,
                      },
                    } as any,
                  }))
                }
                type="date"
                label="Requested Completion Date"
                enableSmartDefaults
                flowData={data}
                currentStep={1}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Navigation - Hidden on mobile */}
      {!isMobile && (
        <div className="flex justify-between pt-6">
          <Button variant="outline" disabled>
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={
              !extractionComplete &&
              !(contactData.aiExtractedData as any)?.customer?.name
            }
          >
            Continue to Scope Details
          </Button>
        </div>
      )}
    </div>
  );
}
