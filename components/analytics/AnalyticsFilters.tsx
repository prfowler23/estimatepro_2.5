"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AnalyticsFilter } from "@/lib/types/analytics-types";
import {
  Calendar as CalendarIcon,
  Filter,
  RefreshCw,
  Users,
  CheckCircle,
} from "lucide-react";

interface AnalyticsFiltersProps {
  filters: AnalyticsFilter;
  onChange: (filters: AnalyticsFilter) => void;
  onReset: () => void;
  className?: string;
}

export function AnalyticsFilters({
  filters,
  onChange,
  onReset,
  className = "",
}: AnalyticsFiltersProps) {
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  const handleDateRangeChange = (
    field: "startDate" | "endDate",
    date: Date | undefined,
  ) => {
    if (date) {
      onChange({
        ...filters,
        [field]: date,
      });
    }
  };

  const handleQuickRange = (range: string) => {
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3months":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "6months":
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return;
    }

    onChange({
      ...filters,
      startDate,
      endDate: now,
    });
  };

  const handleCompletionStatusChange = (
    status: "all" | "completed" | "abandoned",
  ) => {
    onChange({
      ...filters,
      completionStatus: status,
    });
  };

  const handleCollaborationLevelChange = (level: "solo" | "team" | "all") => {
    onChange({
      ...filters,
      collaborationLevel: level,
    });
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "Select date";
    return date.toLocaleDateString();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.userIds?.length) count++;
    if (filters.templates?.length) count++;
    if (filters.steps?.length) count++;
    if (filters.completionStatus !== "all") count++;
    if (filters.collaborationLevel !== "all") count++;
    if (filters.qualityRange) count++;
    return count;
  };

  const quickRanges = [
    { key: "today", label: "Today" },
    { key: "week", label: "Last 7 days" },
    { key: "month", label: "Last 30 days" },
    { key: "3months", label: "Last 3 months" },
    { key: "6months", label: "Last 6 months" },
    { key: "year", label: "Last year" },
  ];

  const completionStatuses = [
    { key: "all", label: "All Workflows", icon: Filter },
    { key: "completed", label: "Completed", icon: CheckCircle },
    { key: "abandoned", label: "Abandoned", icon: RefreshCw },
  ];

  const collaborationLevels = [
    { key: "all", label: "All" },
    { key: "solo", label: "Solo Work" },
    { key: "team", label: "Team Work" },
  ];

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold">Filters</h3>
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary">
                {getActiveFiltersCount()} active
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </Button>
        </div>

        {/* Date Range */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Date Range</h4>

          {/* Quick Range Buttons */}
          <div className="flex flex-wrap gap-2">
            {quickRanges.map((range) => (
              <Button
                key={range.key}
                variant="outline"
                size="sm"
                onClick={() => handleQuickRange(range.key)}
                className="text-xs"
              >
                {range.label}
              </Button>
            ))}
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Start Date
              </label>
              <Input
                type="date"
                value={
                  filters.startDate
                    ? filters.startDate.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) => {
                  const date = e.target.value
                    ? new Date(e.target.value)
                    : undefined;
                  handleDateRangeChange("startDate", date);
                }}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                End Date
              </label>
              <Input
                type="date"
                value={
                  filters.endDate
                    ? filters.endDate.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) => {
                  const date = e.target.value
                    ? new Date(e.target.value)
                    : undefined;
                  handleDateRangeChange("endDate", date);
                }}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Completion Status */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Completion Status
          </h4>
          <div className="flex flex-wrap gap-2">
            {completionStatuses.map((status) => {
              const Icon = status.icon;
              return (
                <Button
                  key={status.key}
                  variant={
                    filters.completionStatus === status.key
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    handleCompletionStatusChange(status.key as any)
                  }
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {status.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Collaboration Level */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Collaboration Level
          </h4>
          <div className="flex flex-wrap gap-2">
            {collaborationLevels.map((level) => (
              <Button
                key={level.key}
                variant={
                  filters.collaborationLevel === level.key
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() => handleCollaborationLevelChange(level.key as any)}
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                {level.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Quality Range */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Quality Score Range
          </h4>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={filters.qualityRange?.[0] || 0}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                onChange({
                  ...filters,
                  qualityRange: [value, filters.qualityRange?.[1] || 100],
                });
              }}
              className="flex-1"
            />
            <span className="text-sm text-gray-600 min-w-16">
              {filters.qualityRange?.[0] || 0} -{" "}
              {filters.qualityRange?.[1] || 100}%
            </span>
          </div>
        </div>

        {/* Templates Filter */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Templates</h4>
          <div className="flex flex-wrap gap-2">
            {[
              "Office Building",
              "Retail Store",
              "Restaurant",
              "Hospital",
              "School",
            ].map((template) => (
              <Button
                key={template}
                variant={
                  filters.templates?.includes(template) ? "default" : "outline"
                }
                size="sm"
                onClick={() => {
                  const current = filters.templates || [];
                  const updated = current.includes(template)
                    ? current.filter((t) => t !== template)
                    : [...current, template];
                  onChange({
                    ...filters,
                    templates: updated,
                  });
                }}
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {template}
              </Button>
            ))}
          </div>
        </div>

        {/* Steps Filter */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Workflow Steps</h4>
          <div className="flex flex-wrap gap-2">
            {[
              "Initial Contact",
              "Scope Details",
              "Files/Photos",
              "Area of Work",
              "Takeoff",
              "Duration",
              "Expenses",
              "Pricing",
              "Summary",
            ].map((step) => (
              <Button
                key={step}
                variant={filters.steps?.includes(step) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const current = filters.steps || [];
                  const updated = current.includes(step)
                    ? current.filter((s) => s !== step)
                    : [...current, step];
                  onChange({
                    ...filters,
                    steps: updated,
                  });
                }}
                className="text-xs"
              >
                {step}
              </Button>
            ))}
          </div>
        </div>

        {/* Active Filters Summary */}
        {getActiveFiltersCount() > 0 && (
          <div className="pt-3 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Active Filters
            </h4>
            <div className="space-y-2 text-sm">
              {filters.completionStatus !== "all" && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant="secondary">{filters.completionStatus}</Badge>
                </div>
              )}
              {filters.collaborationLevel !== "all" && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Collaboration:</span>
                  <Badge variant="secondary">
                    {filters.collaborationLevel}
                  </Badge>
                </div>
              )}
              {filters.templates?.length && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Templates:</span>
                  <Badge variant="secondary">
                    {filters.templates.length} selected
                  </Badge>
                </div>
              )}
              {filters.steps?.length && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Steps:</span>
                  <Badge variant="secondary">
                    {filters.steps.length} selected
                  </Badge>
                </div>
              )}
              {filters.qualityRange && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Quality:</span>
                  <Badge variant="secondary">
                    {filters.qualityRange[0]}-{filters.qualityRange[1]}%
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default AnalyticsFilters;
