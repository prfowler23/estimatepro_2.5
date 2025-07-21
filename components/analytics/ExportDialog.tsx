"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Download,
  FileText,
  Table,
  FileSpreadsheet,
  Code,
  Mail,
  Calendar,
  Settings,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { error as logError } from "@/lib/utils/logger";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardData: any;
  filters: any;
  className?: string;
}

export function ExportDialog({
  isOpen,
  onClose,
  dashboardData,
  filters,
  className = "",
}: ExportDialogProps) {
  const [exportType, setExportType] = useState<
    "pdf" | "excel" | "csv" | "json"
  >("pdf");
  const [selectedSections, setSelectedSections] = useState<string[]>([
    "metrics",
    "insights",
    "benchmarks",
    "charts",
  ]);
  const [includeFilters, setIncludeFilters] = useState(true);
  const [scheduleExport, setScheduleExport] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const exportTypes = [
    {
      type: "pdf",
      name: "PDF Report",
      description: "Professional report with charts and insights",
      icon: <FileText className="w-5 h-5" />,
      recommended: true,
    },
    {
      type: "excel",
      name: "Excel Workbook",
      description: "Detailed data with multiple sheets",
      icon: <FileSpreadsheet className="w-5 h-5" />,
      recommended: false,
    },
    {
      type: "csv",
      name: "CSV Data",
      description: "Raw data for analysis",
      icon: <Table className="w-5 h-5" />,
      recommended: false,
    },
    {
      type: "json",
      name: "JSON Data",
      description: "Structured data for developers",
      icon: <Code className="w-5 h-5" />,
      recommended: false,
    },
  ];

  const availableSections = [
    {
      id: "metrics",
      name: "Key Metrics",
      description: "Performance metrics and KPIs",
    },
    {
      id: "insights",
      name: "AI Insights",
      description: "Predictive insights and recommendations",
    },
    {
      id: "benchmarks",
      name: "Benchmarks",
      description: "Performance comparisons",
    },
    {
      id: "charts",
      name: "Charts & Graphs",
      description: "Visual data representations",
    },
    {
      id: "userStats",
      name: "User Statistics",
      description: "Individual user performance",
    },
    {
      id: "timeSeries",
      name: "Time Series Data",
      description: "Historical trends and patterns",
    },
  ];

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId],
    );
  };

  const generateExportFile = (data: any, type: string): string => {
    const timestamp = new Date().toISOString().split("T")[0];

    if (type === "json") {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      return URL.createObjectURL(blob);
    }

    if (type === "csv") {
      const headers = ["Section", "Metric", "Value", "Date"];
      const rows = [headers.join(",")];

      // Convert data to CSV format
      if (data.data?.metrics) {
        data.data.metrics.forEach((metric: any) => {
          rows.push(
            [
              "Metrics",
              metric.name || "Unknown",
              metric.value || "0",
              data.generatedAt,
            ].join(","),
          );
        });
      }

      const csvString = rows.join("\n");
      const blob = new Blob([csvString], { type: "text/csv" });
      return URL.createObjectURL(blob);
    }

    // For PDF and Excel, create a simple text file for now
    const content = `Analytics Export Report
Generated: ${data.generatedAt}
Export Type: ${type.toUpperCase()}
Sections: ${data.sections.join(", ")}

${
  data.filters
    ? `Filters Applied:
${JSON.stringify(data.filters, null, 2)}`
    : "No filters applied"
}

Raw Data:
${JSON.stringify(data.data, null, 2)}`;

    const blob = new Blob([content], { type: "text/plain" });
    return URL.createObjectURL(blob);
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Simulate export process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Generate export data
      const exportData = {
        type: exportType,
        sections: selectedSections,
        filters: includeFilters ? filters : null,
        data: dashboardData,
        generatedAt: new Date().toISOString(),
      };

      // Store the export data for download
      const fileUrl = generateExportFile(exportData, exportType);
      (window as any).lastExportUrl = fileUrl;
      (window as any).lastExportFilename =
        `analytics-report-${new Date().toISOString().split("T")[0]}.${exportType}`;

      setExportComplete(true);
    } catch (error) {
      logError("Analytics export failed", {
        component: "ExportDialog",
        action: "handleExport",
        exportType,
        selectedSections,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const resetDialog = () => {
    setExportComplete(false);
    setIsExporting(false);
    setSelectedSections(["metrics", "insights", "benchmarks", "charts"]);
    setIncludeFilters(true);
    setScheduleExport(false);
    setEmailRecipients("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card
        className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${className}`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold">Export Analytics</h2>
                <p className="text-gray-600">
                  Export your analytics data and insights
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetDialog();
                onClose();
              }}
            >
              Cancel
            </Button>
          </div>

          {exportComplete ? (
            /* Success State */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">
                  Export Complete!
                </h3>
                <p className="text-gray-600">
                  Your analytics report has been generated successfully.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={() => {
                    // Trigger download
                    const link = document.createElement("a");
                    link.href = (window as any).lastExportUrl || "#";
                    link.download =
                      (window as any).lastExportFilename ||
                      `analytics-report-${new Date().toISOString().split("T")[0]}.${exportType}`;
                    link.click();

                    // Clean up the object URL after download
                    setTimeout(() => {
                      if ((window as any).lastExportUrl) {
                        URL.revokeObjectURL((window as any).lastExportUrl);
                        delete (window as any).lastExportUrl;
                        delete (window as any).lastExportFilename;
                      }
                    }, 1000);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetDialog();
                    onClose();
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            /* Export Configuration */
            <div className="space-y-6">
              {/* Export Type Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold">Export Format</h3>
                <RadioGroup
                  value={exportType}
                  onValueChange={(value) => setExportType(value as any)}
                >
                  <div className="grid grid-cols-2 gap-4">
                    {exportTypes.map((type) => (
                      <div key={type.type} className="relative">
                        <RadioGroupItem
                          value={type.type}
                          id={type.type}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={type.type}
                          className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 peer-checked:border-blue-500 peer-checked:bg-blue-50"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            {type.icon}
                            <span className="font-medium">{type.name}</span>
                            {type.recommended && (
                              <Badge variant="secondary" className="text-xs">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-gray-600 text-center">
                            {type.description}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {/* Section Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold">Include Sections</h3>
                <div className="grid grid-cols-1 gap-3">
                  {availableSections.map((section) => (
                    <div
                      key={section.id}
                      className="flex items-center space-x-3"
                    >
                      <Checkbox
                        id={section.id}
                        checked={selectedSections.includes(section.id)}
                        onCheckedChange={() => handleSectionToggle(section.id)}
                      />
                      <Label
                        htmlFor={section.id}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{section.name}</div>
                            <div className="text-sm text-gray-600">
                              {section.description}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {(section.id === "metrics" &&
                              dashboardData?.metrics?.length) ||
                              0}{" "}
                            items
                          </Badge>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <h3 className="font-semibold">Export Options</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="includeFilters"
                      checked={includeFilters}
                      onCheckedChange={(checked) =>
                        setIncludeFilters(checked === true)
                      }
                    />
                    <Label htmlFor="includeFilters">
                      Include current filters and date range
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="scheduleExport"
                      checked={scheduleExport}
                      onCheckedChange={(checked) =>
                        setScheduleExport(checked === true)
                      }
                    />
                    <Label htmlFor="scheduleExport">
                      Schedule regular exports
                    </Label>
                  </div>
                </div>

                {scheduleExport && (
                  <div className="ml-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-800">
                        Schedule Settings
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm">Frequency</Label>
                        <select className="w-full mt-1 p-2 border border-gray-300 rounded">
                          <option>Daily</option>
                          <option>Weekly</option>
                          <option>Monthly</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-sm">Email Recipients</Label>
                        <input
                          type="email"
                          placeholder="Enter email addresses (comma separated)"
                          value={emailRecipients}
                          onChange={(e) => setEmailRecipients(e.target.value)}
                          className="w-full mt-1 p-2 border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Current Filters Summary */}
              {includeFilters && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-800">
                      Current Filters
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Date Range:</span>
                      <span>
                        {filters.startDate?.toLocaleDateString()} -{" "}
                        {filters.endDate?.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completion Status:</span>
                      <Badge variant="outline">
                        {filters.completionStatus}
                      </Badge>
                    </div>
                    {filters.templates?.length > 0 && (
                      <div className="flex justify-between">
                        <span>Templates:</span>
                        <span>{filters.templates.length} selected</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Estimated File Size */}
              <Alert>
                <FileText className="h-4 w-4" />
                <div>
                  <h4 className="font-medium">Estimated Export Size</h4>
                  <p className="text-sm">
                    Based on your selections, the export will be approximately{" "}
                    <strong>
                      {exportType === "pdf"
                        ? "2-5 MB"
                        : exportType === "excel"
                          ? "1-3 MB"
                          : exportType === "csv"
                            ? "500 KB - 2 MB"
                            : "200 KB - 1 MB"}
                    </strong>
                  </p>
                </div>
              </Alert>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetDialog();
                    onClose();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={isExporting || selectedSections.length === 0}
                  className="flex items-center gap-2"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default ExportDialog;
