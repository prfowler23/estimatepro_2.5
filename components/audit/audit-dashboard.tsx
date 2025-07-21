// Audit Dashboard Component
// Comprehensive UI for viewing audit logs, compliance reports, and security monitoring

"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  AlertTriangle,
  Eye,
  Download,
  Filter,
  Search,
  Calendar,
  Users,
  Activity,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Lock,
  UserCheck,
  Globe,
  Settings,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";

// Types
interface AuditEvent {
  id: string;
  event_type: string;
  severity: "low" | "medium" | "high" | "critical";
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  created_at: string;
  compliance_tags: string[];
}

interface ComplianceReport {
  id: string;
  standard: string;
  period_start: string;
  period_end: string;
  total_events: number;
  violations_count: number;
  status: "compliant" | "non_compliant" | "warning";
  generated_at: string;
}

interface AuditFilters {
  startDate?: string;
  endDate?: string;
  eventTypes?: string[];
  severity?: string[];
  userId?: string;
  resourceType?: string;
  search?: string;
}

// Severity badge component
const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const variants = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  return (
    <Badge
      className={variants[severity as keyof typeof variants] || variants.medium}
    >
      {severity.toUpperCase()}
    </Badge>
  );
};

// Event type icon component
const EventTypeIcon: React.FC<{ eventType: string }> = ({ eventType }) => {
  const iconMap: Record<string, React.ReactNode> = {
    user_login: <UserCheck className="w-4 h-4" />,
    user_logout: <UserCheck className="w-4 h-4" />,
    api_access: <Globe className="w-4 h-4" />,
    data_access: <Database className="w-4 h-4" />,
    security_violation: <AlertTriangle className="w-4 h-4" />,
    system_error: <XCircle className="w-4 h-4" />,
    estimate_created: <FileText className="w-4 h-4" />,
    estimate_updated: <FileText className="w-4 h-4" />,
    integration_sync: <Settings className="w-4 h-4" />,
    default: <Activity className="w-4 h-4" />,
  };

  return iconMap[eventType] || iconMap.default;
};

export const AuditDashboard: React.FC = () => {
  const [filters, setFilters] = useState<AuditFilters>({});
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [activeTab, setActiveTab] = useState("events");
  const queryClient = useQueryClient();

  // Fetch audit events
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["audit-events", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("start_date", filters.startDate);
      if (filters.endDate) params.append("end_date", filters.endDate);
      if (filters.eventTypes?.length)
        params.append("event_types", filters.eventTypes.join(","));
      if (filters.severity?.length)
        params.append("severity", filters.severity.join(","));
      if (filters.userId) params.append("user_id", filters.userId);
      if (filters.resourceType)
        params.append("resource_type", filters.resourceType);

      const response = await fetch(`/api/audit/events?${params}`);
      if (!response.ok) throw new Error("Failed to fetch audit events");
      return response.json();
    },
  });

  // Fetch compliance reports
  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ["compliance-reports"],
    queryFn: async () => {
      const response = await fetch("/api/audit/compliance?action=reports");
      if (!response.ok) throw new Error("Failed to fetch compliance reports");
      return response.json();
    },
  });

  // Fetch compliance statistics
  const { data: statisticsData, isLoading: statisticsLoading } = useQuery({
    queryKey: ["compliance-statistics"],
    queryFn: async () => {
      const response = await fetch("/api/audit/compliance?action=statistics");
      if (!response.ok)
        throw new Error("Failed to fetch compliance statistics");
      return response.json();
    },
  });

  // Generate compliance report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (params: {
      standard: string;
      start_date: string;
      end_date: string;
    }) => {
      const response = await fetch("/api/audit/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_report", ...params }),
      });
      if (!response.ok) throw new Error("Failed to generate compliance report");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Compliance report generated successfully" });
      queryClient.invalidateQueries({ queryKey: ["compliance-reports"] });
    },
    onError: (error) => {
      toast({
        title: "Error generating compliance report",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Export user data mutation
  const exportDataMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch("/api/audit/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_data", user_id: userId }),
      });
      if (!response.ok) throw new Error("Failed to export user data");
      return response.json();
    },
    onSuccess: (data) => {
      // Download the exported data
      const blob = new Blob([JSON.stringify(data.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-audit-data-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "User data exported successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error exporting user data",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Detect suspicious activity mutation
  const detectSuspiciousMutation = useMutation({
    mutationFn: async (params: { user_id?: string; hours_back: number }) => {
      const response = await fetch("/api/audit/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detect_suspicious", ...params }),
      });
      if (!response.ok) throw new Error("Failed to detect suspicious activity");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Suspicious activity detection completed",
        description: `Found ${data.suspicious_activity?.length || 0} suspicious patterns`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error detecting suspicious activity",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Statistics cards
  const statisticsCards = [
    {
      title: "Total Events",
      value: statisticsData?.statistics?.total_events || 0,
      icon: <Activity className="w-5 h-5" />,
      color: "text-blue-600",
    },
    {
      title: "High Risk Events",
      value: statisticsData?.statistics?.high_risk_events || 0,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "text-red-600",
    },
    {
      title: "Security Events",
      value: statisticsData?.statistics?.security_events || 0,
      icon: <Shield className="w-5 h-5" />,
      color: "text-orange-600",
    },
    {
      title: "Data Access Events",
      value: statisticsData?.statistics?.data_access_events || 0,
      icon: <Database className="w-5 h-5" />,
      color: "text-green-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Dashboard</h1>
          <p className="text-gray-600">
            Monitor system activity and compliance
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => detectSuspiciousMutation.mutate({ hours_back: 24 })}
            disabled={detectSuspiciousMutation.isPending}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Detect Suspicious Activity
          </Button>
          <Button
            onClick={() =>
              generateReportMutation.mutate({
                standard: "gdpr",
                start_date: new Date(
                  Date.now() - 30 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                end_date: new Date().toISOString(),
              })
            }
            disabled={generateReportMutation.isPending}
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statisticsCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div className={`${stat.color}`}>{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="events">Audit Events</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Audit Events Tab */}
        <TabsContent value="events" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={filters.startDate || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, startDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={filters.endDate || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, endDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Severity
                  </label>
                  <Select
                    onValueChange={(value) =>
                      setFilters({ ...filters, severity: [value] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Event Type
                  </label>
                  <Select
                    onValueChange={(value) =>
                      setFilters({ ...filters, eventTypes: [value] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user_login">User Login</SelectItem>
                      <SelectItem value="api_access">API Access</SelectItem>
                      <SelectItem value="data_access">Data Access</SelectItem>
                      <SelectItem value="security_violation">
                        Security Violation
                      </SelectItem>
                      <SelectItem value="system_error">System Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    User ID
                  </label>
                  <Input
                    placeholder="Enter user ID"
                    value={filters.userId || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, userId: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => setFilters({})}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events List */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Events</CardTitle>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="text-center py-8">Loading events...</div>
              ) : (
                <div className="space-y-2">
                  {eventsData?.events?.map((event: AuditEvent) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-center space-x-3">
                        <EventTypeIcon eventType={event.event_type} />
                        <div>
                          <div className="font-medium">{event.action}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(event.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <SeverityBadge severity={event.severity} />
                        {event.compliance_tags.length > 0 && (
                          <Badge variant="outline">
                            {event.compliance_tags[0]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {complianceLoading ? (
                <div className="text-center py-8">
                  Loading compliance reports...
                </div>
              ) : (
                <div className="space-y-3">
                  {complianceData?.reports?.map((report: ComplianceReport) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">
                          {report.standard.toUpperCase()} Report
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(report.period_start).toLocaleDateString()} -{" "}
                          {new Date(report.period_end).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          {report.total_events} events,{" "}
                          {report.violations_count} violations
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          className={
                            report.status === "compliant"
                              ? "bg-green-100 text-green-800"
                              : report.status === "warning"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }
                        >
                          {report.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">User Data Management</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Input placeholder="User ID" className="flex-1" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportDataMutation.mutate("user-id")}
                        disabled={exportDataMutation.isPending}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Export Data
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600">
                      Export user audit data for GDPR compliance
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Threat Detection</h3>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        detectSuspiciousMutation.mutate({ hours_back: 24 })
                      }
                      disabled={detectSuspiciousMutation.isPending}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Scan for Suspicious Activity
                    </Button>
                    <p className="text-sm text-gray-600">
                      Analyze user behavior patterns for security threats
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Details Modal */}
      {selectedEvent && (
        <Dialog
          open={!!selectedEvent}
          onOpenChange={() => setSelectedEvent(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Event Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Event Type</label>
                  <p className="text-sm">{selectedEvent.event_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <SeverityBadge severity={selectedEvent.severity} />
                </div>
                <div>
                  <label className="text-sm font-medium">User ID</label>
                  <p className="text-sm">{selectedEvent.user_id || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">IP Address</label>
                  <p className="text-sm">{selectedEvent.ip_address || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Resource</label>
                  <p className="text-sm">
                    {selectedEvent.resource_type
                      ? `${selectedEvent.resource_type}:${selectedEvent.resource_id}`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Timestamp</label>
                  <p className="text-sm">
                    {new Date(selectedEvent.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Action</label>
                <p className="text-sm">{selectedEvent.action}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Compliance Tags</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedEvent.compliance_tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Details</label>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-40">
                  {JSON.stringify(selectedEvent.details, null, 2)}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
