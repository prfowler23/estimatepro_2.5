"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserWorkflowStats } from "@/lib/types/analytics-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
  Clock,
  Target,
  BarChart3,
} from "lucide-react";

interface UserPerformanceTableProps {
  userStats: UserWorkflowStats[];
  onUserSelect?: (userId: string) => void;
  className?: string;
}

type SortField =
  | "userName"
  | "totalWorkflows"
  | "completedWorkflows"
  | "averageCompletionTime"
  | "averageQualityScore"
  | "weeklyCompletionRate"
  | "monthlyCompletionRate";
type SortDirection = "asc" | "desc";

export function UserPerformanceTable({
  userStats,
  onUserSelect,
  className = "",
}: UserPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>("totalWorkflows");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedUsers = React.useMemo(() => {
    return [...userStats].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [userStats, sortField, sortDirection]);

  const handleUserClick = (userId: string) => {
    setSelectedUser(selectedUser === userId ? null : userId);
    onUserSelect?.(userId);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "declining":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "senior_estimator":
        return "bg-blue-100 text-blue-800";
      case "estimator":
        return "bg-green-100 text-green-800";
      case "junior_estimator":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPerformanceColor = (value: number, field: string) => {
    switch (field) {
      case "completionRate":
        return value >= 90
          ? "text-green-600"
          : value >= 75
            ? "text-yellow-600"
            : "text-red-600";
      case "qualityScore":
        return value >= 85
          ? "text-green-600"
          : value >= 70
            ? "text-yellow-600"
            : "text-red-600";
      case "avgTime":
        return value <= 30
          ? "text-green-600"
          : value <= 45
            ? "text-yellow-600"
            : "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-gray-50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortField === field &&
          (sortDirection === "asc" ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          ))}
      </div>
    </TableHead>
  );

  if (userStats.length === 0) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">
          No User Data Available
        </h3>
        <p className="text-gray-500">
          User performance statistics will appear here as users complete
          workflows.
        </p>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">User Performance</h3>
            <Badge variant="secondary">
              {userStats.length} user{userStats.length > 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Sort by:</span>
            <Badge variant="outline">
              {sortField.replace(/([A-Z])/g, " $1").toLowerCase()}
            </Badge>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="userName">User</SortableHeader>
                <SortableHeader field="totalWorkflows">
                  Workflows
                </SortableHeader>
                <SortableHeader field="averageCompletionTime">
                  Avg Time
                </SortableHeader>
                <SortableHeader field="averageQualityScore">
                  Quality
                </SortableHeader>
                <SortableHeader field="weeklyCompletionRate">
                  Weekly Rate
                </SortableHeader>
                <SortableHeader field="monthlyCompletionRate">
                  Monthly Rate
                </SortableHeader>
                <TableHead>Trends</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user) => (
                <React.Fragment key={user.userId}>
                  <TableRow
                    className={`hover:bg-gray-50 cursor-pointer ${
                      selectedUser === user.userId ? "bg-blue-50" : ""
                    }`}
                    onClick={() => handleUserClick(user.userId)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{user.userName}</div>
                          <Badge
                            className={`text-xs ${getRoleColor(user.userRole)}`}
                          >
                            {user.userRole.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="font-medium">{user.totalWorkflows}</div>
                        <div className="text-sm text-gray-500">
                          {user.completedWorkflows} completed
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className={`text-center ${getPerformanceColor(user.averageCompletionTime, "avgTime")}`}
                      >
                        <div className="font-medium">
                          {user.averageCompletionTime.toFixed(1)}m
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.averageStepDuration.toFixed(1)}m/step
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className={`text-center ${getPerformanceColor(user.averageQualityScore, "qualityScore")}`}
                      >
                        <div className="font-medium">
                          {user.averageQualityScore.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.averageErrorRate.toFixed(1)} errors
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className={`text-center ${getPerformanceColor(user.weeklyCompletionRate, "completionRate")}`}
                      >
                        <div className="font-medium">
                          {user.weeklyCompletionRate.toFixed(1)}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className={`text-center ${getPerformanceColor(user.monthlyCompletionRate, "completionRate")}`}
                      >
                        <div className="font-medium">
                          {user.monthlyCompletionRate.toFixed(1)}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(user.qualityTrend)}
                        {getTrendIcon(user.efficiencyTrend)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUserSelect?.(user.userId);
                        }}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Details */}
                  {selectedUser === user.userId && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-gray-50 p-6">
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-800">
                            Detailed Performance Metrics
                          </h4>

                          <div className="grid md:grid-cols-3 gap-6">
                            {/* Performance Metrics */}
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-700 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" />
                                Performance
                              </h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Backtrack Rate:</span>
                                  <span className="font-medium">
                                    {user.averageBacktrackRate.toFixed(1)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>AI Usage:</span>
                                  <span className="font-medium">
                                    {user.averageAIUsage.toFixed(1)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Error Rate:</span>
                                  <span className="font-medium">
                                    {user.averageErrorRate.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Problem Areas */}
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-700 flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Areas for Improvement
                              </h5>
                              <div className="space-y-2">
                                <div>
                                  <span className="text-sm text-gray-600">
                                    Slowest Steps:
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {user.slowestSteps.map((step, index) => (
                                      <Badge
                                        key={index}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {step}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-sm text-gray-600">
                                    Common Errors:
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {user.mostCommonErrors.map(
                                      (error, index) => (
                                        <Badge
                                          key={index}
                                          variant="outline"
                                          className="text-xs bg-red-50"
                                        >
                                          {error.replace("_", " ")}
                                        </Badge>
                                      ),
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Recommendations */}
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-700 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Recommendations
                              </h5>
                              <div className="space-y-2">
                                <div>
                                  <span className="text-sm text-gray-600">
                                    Underutilized Features:
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {user.underutilizedFeatures.map(
                                      (feature, index) => (
                                        <Badge
                                          key={index}
                                          variant="outline"
                                          className="text-xs bg-yellow-50"
                                        >
                                          {feature.replace("_", " ")}
                                        </Badge>
                                      ),
                                    )}
                                  </div>
                                </div>
                                <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                                  <strong>Training Focus:</strong> Based on
                                  performance data, consider training on{" "}
                                  {user.slowestSteps[0]} and{" "}
                                  {user.underutilizedFeatures[0]?.replace(
                                    "_",
                                    " ",
                                  )}
                                  to improve efficiency.
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-gray-800">
                {(
                  userStats.reduce(
                    (sum, user) => sum + user.totalWorkflows,
                    0,
                  ) / userStats.length
                ).toFixed(0)}
              </div>
              <div className="text-gray-500">Avg Workflows</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-800">
                {(
                  userStats.reduce(
                    (sum, user) => sum + user.averageCompletionTime,
                    0,
                  ) / userStats.length
                ).toFixed(1)}
                m
              </div>
              <div className="text-gray-500">Avg Time</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-800">
                {(
                  userStats.reduce(
                    (sum, user) => sum + user.averageQualityScore,
                    0,
                  ) / userStats.length
                ).toFixed(1)}
              </div>
              <div className="text-gray-500">Avg Quality</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-800">
                {(
                  userStats.reduce(
                    (sum, user) => sum + user.weeklyCompletionRate,
                    0,
                  ) / userStats.length
                ).toFixed(1)}
                %
              </div>
              <div className="text-gray-500">Avg Weekly Rate</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default UserPerformanceTable;
