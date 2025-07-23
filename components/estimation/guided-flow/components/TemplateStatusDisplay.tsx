import React from "react";
import { WorkflowTemplate } from "@/lib/services/workflow-templates";
import { Button } from "@/components/ui/button";

interface TemplateStatusDisplayProps {
  selectedTemplate: WorkflowTemplate | null;
  onChangeTemplate: () => void;
}

export const TemplateStatusDisplay: React.FC<TemplateStatusDisplayProps> = ({
  selectedTemplate,
  onChangeTemplate,
}) => {
  if (!selectedTemplate) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-2 bg-gray-100 rounded-md">
      <p className="text-sm">
        Using template: <strong>{selectedTemplate.name}</strong>
      </p>
      <Button variant="outline" size="sm" onClick={onChangeTemplate}>
        Change
      </Button>
    </div>
  );
};
