"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CollaborativeField } from "./CollaborativeField";
import { useCollaboration } from "./CollaborationProvider";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { CollaboratorAvatars } from "./CollaboratorAvatars";
import { RealTimeChangeIndicator } from "./RealTimeChangeIndicator";
import {
  Users,
  Eye,
  Edit3,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface CollaborativeStepExampleProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
  stepId: string;
}

export function CollaborativeStepExample({
  data,
  onUpdate,
  onNext,
  onBack,
  stepId,
}: CollaborativeStepExampleProps) {
  const { isMobile } = useMobileDetection();
  const {
    isConnected,
    activeUsers,
    canEdit,
    canNavigateToStep,
    updatePresence,
    broadcastChange,
    getFieldStatus,
    getRecentChanges,
    permissions,
  } = useCollaboration();

  const [localData, setLocalData] = useState(data);

  // Update presence when component mounts
  React.useEffect(() => {
    updatePresence({
      currentStep: parseInt(stepId.replace("step-", "")),
      cursor: {
        stepId,
      },
    });
  }, [stepId, updatePresence]);

  const handleFieldChange = async (field: string, value: any) => {
    const oldValue = localData[field];
    const newData = { ...localData, [field]: value };

    setLocalData(newData);
    onUpdate(newData);

    // Broadcast change to collaborators
    if (isConnected) {
      await broadcastChange(stepId, field, oldValue, value);
    }
  };

  const handleNext = () => {
    if (
      canNavigateToStep &&
      !canNavigateToStep(parseInt(stepId.replace("step-", "")) + 1)
    ) {
      return;
    }
    onNext();
  };

  // Get current users viewing this step
  const stepViewers = activeUsers.filter(
    (user) => user.currentStep === parseInt(stepId.replace("step-", "")),
  );

  // Get recent activity for this step
  const stepChanges = getRecentChanges()
    .filter((change) => change.stepId === stepId)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Collaboration Status Header */}
      {isConnected && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="font-medium text-blue-900">
                  Live Collaboration
                </span>
              </div>

              {stepViewers.length > 1 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    {stepViewers.length} user{stepViewers.length > 1 ? "s" : ""}{" "}
                    on this step
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <CollaboratorAvatars
                compact
                maxVisible={3}
                showInviteButton={permissions?.canShare}
              />

              {!isMobile && (
                <Badge variant="outline" className="text-xs">
                  {permissions?.canEdit
                    ? "Editor"
                    : permissions?.canComment
                      ? "Viewer"
                      : "Guest"}
                </Badge>
              )}
            </div>
          </div>

          {/* Recent Activity Summary */}
          {stepChanges.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Clock className="w-3 h-3" />
                <span>
                  Last updated by {stepChanges[0].userName} -{" "}
                  {stepChanges[0].fieldPath}
                </span>
                {stepChanges.length > 1 && (
                  <span className="text-blue-500">
                    (+{stepChanges.length - 1} more changes)
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Step Content */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Step Example: Customer Information
            </h2>

            {/* Step-level activity indicator */}
            {isConnected && stepChanges.length > 0 && (
              <RealTimeChangeIndicator
                fieldPath={stepId}
                compact
                showHistory={false}
                maxChanges={3}
              />
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Customer Details Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Customer Details</h3>

                {/* Field-level collaboration status */}
                {isConnected && (
                  <div className="flex items-center gap-2">
                    {getFieldStatus("customer.name") === "editing" && (
                      <Badge
                        variant="default"
                        className="text-xs flex items-center gap-1"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                        Being edited
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <CollaborativeField
                field="customer.name"
                value={localData.customerName || ""}
                onChange={(value) => handleFieldChange("customerName", value)}
                label="Customer Name"
                placeholder="Enter customer name"
                required
                stepId={stepId}
                showCollaborationInfo={isConnected}
              />

              <CollaborativeField
                field="customer.company"
                value={localData.company || ""}
                onChange={(value) => handleFieldChange("company", value)}
                label="Company"
                placeholder="Enter company name"
                stepId={stepId}
                showCollaborationInfo={isConnected}
              />

              <CollaborativeField
                field="customer.email"
                value={localData.email || ""}
                onChange={(value) => handleFieldChange("email", value)}
                type="email"
                label="Email Address"
                placeholder="customer@company.com"
                required
                stepId={stepId}
                showCollaborationInfo={isConnected}
              />
            </div>

            {/* Project Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Project Details</h3>

              <CollaborativeField
                field="project.type"
                value={localData.projectType || ""}
                onChange={(value) => handleFieldChange("projectType", value)}
                type="select"
                label="Project Type"
                options={[
                  { value: "office", label: "Office Building" },
                  { value: "retail", label: "Retail Store" },
                  { value: "restaurant", label: "Restaurant" },
                  { value: "hospital", label: "Hospital/Medical" },
                  { value: "school", label: "School/Educational" },
                ]}
                stepId={stepId}
                showCollaborationInfo={isConnected}
              />

              <CollaborativeField
                field="project.size"
                value={localData.projectSize || ""}
                onChange={(value) => handleFieldChange("projectSize", value)}
                type="number"
                label="Building Size (sq ft)"
                placeholder="50000"
                stepId={stepId}
                showCollaborationInfo={isConnected}
              />

              <CollaborativeField
                field="project.description"
                value={localData.description || ""}
                onChange={(value) => handleFieldChange("description", value)}
                type="textarea"
                label="Project Description"
                placeholder="Describe the cleaning project requirements..."
                stepId={stepId}
                showCollaborationInfo={isConnected}
              />
            </div>
          </div>

          {/* Collaboration Features Demo */}
          {isConnected && (
            <Card className="p-4 bg-gray-50 border-gray-200">
              <h4 className="font-medium mb-3">Collaboration Features</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Real-time sync enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>
                    {activeUsers.length} active user
                    {activeUsers.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-purple-600" />
                  <span>Field-level tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-600" />
                  <span>Conflict resolution</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span>Change history</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span>Smart validation</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={isConnected && !canEdit()}>
          Continue
          {isConnected && !canEdit() && (
            <span className="ml-2 text-xs">(Read-only)</span>
          )}
        </Button>
      </div>

      {/* Activity Feed for this step */}
      {isConnected && stepChanges.length > 0 && !isMobile && (
        <Card className="p-4">
          <h4 className="font-medium mb-3">Recent Activity</h4>
          <div className="space-y-2">
            {stepChanges.map((change, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="font-medium">{change.userName}</span>
                  <span className="text-gray-600">
                    updated {change.fieldPath}
                  </span>
                </div>
                <span className="text-gray-500 text-xs">
                  {new Date(change.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default CollaborativeStepExample;
