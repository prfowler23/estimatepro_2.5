"use client";

// PHASE 3 FIX: Extracted template status display into focused component
import React from "react";
import { WorkflowTemplate } from "@/lib/services/workflow-templates";

interface TemplateStatusDisplayProps {
  selectedTemplate: WorkflowTemplate | null;
  onChangeTemplate: () => void;
  className?: string;
}

export function TemplateStatusDisplay({
  selectedTemplate,
  onChangeTemplate,
  className = "",
}: TemplateStatusDisplayProps) {
  if (!selectedTemplate) return null;

  return (
    <div
      className={`p-3 bg-blue-50 rounded-lg border border-blue-200 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{selectedTemplate.icon}</span>
          <div>
            <span className="font-medium text-blue-900">
              Using Template: {selectedTemplate.name}
            </span>
            <p className="text-sm text-blue-700">
              {selectedTemplate.description}
            </p>
          </div>
        </div>
        <button
          onClick={onChangeTemplate}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Change Template
        </button>
      </div>
    </div>
  );
}
