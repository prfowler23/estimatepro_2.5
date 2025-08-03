// Audit Dashboard Component
// Comprehensive UI for viewing audit logs, compliance reports, and security monitoring

"use client";

import React, {
  useState,
  useEffect,
  useTransition,
  useDeferredValue,
  useId,
  useMemo,
  useCallback,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "isomorphic-dompurify";
import { FixedSizeList as List } from "react-window";
import { z } from "zod";
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

// Validation Schemas
const AuditEventDetailsSchema = z.record(z.string(), z.unknown());

const AuditFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  eventTypes: z.array(z.string()).optional(),
  severity: z.array(z.enum(["low", "medium", "high", "critical"])).optional(),
  userId: z.string().min(1).max(100).optional(),
  resourceType: z.string().min(1).max(50).optional(),
  search: z.string().min(1).max(200).optional(),
});

// Types
type SeverityLevel = "low" | "medium" | "high" | "critical";
type ComplianceStatus = "compliant" | "non_compliant" | "warning";

interface AuditEventDetails {
  [key: string]: unknown;
}

interface AuditEvent {
  id: string;
  event_type: string;
  severity: SeverityLevel;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details: AuditEventDetails;
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
  status: ComplianceStatus;
  generated_at: string;
}

interface AuditFilters {
  startDate?: string;
  endDate?: string;
  eventTypes?: string[];
  severity?: SeverityLevel[];
  userId?: string;
  resourceType?: string;
  search?: string;
}

interface AuditError {
  type: "network" | "validation" | "permission" | "unknown";
  message: string;
  details?: unknown;
}

// Custom hook for debounced filters
const useAuditFilters = (initialFilters: AuditFilters = {}) => {
  const [filters, setFilters] = useState<AuditFilters>(initialFilters);
  const [isPending, startTransition] = useTransition();
  const deferredFilters = useDeferredValue(filters);

  const updateFilters = useCallback(
    (newFilters: Partial<AuditFilters>) => {
      startTransition(() => {
        const result = AuditFiltersSchema.safeParse({
          ...filters,
          ...newFilters,
        });
        if (result.success) {
          setFilters(result.data);
        } else {
          console.warn("Invalid filter data:", result.error);
        }
      });
    },
    [filters],
  );

  const clearFilters = useCallback(() => {
    startTransition(() => {
      setFilters({});
    });
  }, []);

  return {
    filters: deferredFilters,
    updateFilters,
    clearFilters,
    isPending,
  };
};

// Utility function to safely display JSON
const sanitizeAndFormatJSON = (data: unknown): string => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    return DOMPurify.sanitize(jsonString, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  } catch (error) {
    return "Invalid JSON data";
  }
};

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

// Error Boundary Component
class AuditErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback?: React.ComponentType<{ error: Error }>;
  },
  { hasError: boolean; error?: Error }
> {
  constructor(props: {
    children: React.ReactNode;
    fallback?: React.ComponentType<{ error: Error }>;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Audit Dashboard Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="p-6 text-center">
    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
    <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
    <p className="text-gray-600 mb-4">Unable to load the audit dashboard</p>
    <Button onClick={() => window.location.reload()}>Reload Page</Button>
  </div>
);

// Virtual List Item Component
const AuditEventItem: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: { events: AuditEvent[]; onSelectEvent: (event: AuditEvent) => void };
}> = ({ index, style, data }) => {
  const event = data.events[index];
  if (!event) return null;

  return (
    <div style={style} className="px-2">
      <div
        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer mb-2"
        onClick={() => data.onSelectEvent(event)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            data.onSelectEvent(event);
          }
        }}
        aria-label={`Audit event: ${event.action} at ${new Date(event.created_at).toLocaleString()}`}
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
            <Badge variant="outline">{event.compliance_tags[0]}</Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export const AuditDashboard: React.FC = () => {
  const { filters, updateFilters, clearFilters, isPending } = useAuditFilters();
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [activeTab, setActiveTab] = useState("events");
  const [exportUserId, setExportUserId] = useState("");
  const queryClient = useQueryClient();

  // Generate unique IDs for form elements
  const startDateId = useId();
  const endDateId = useId();
  const severityId = useId();
  const eventTypeId = useId();
  const userIdFilterId = useId();
  const exportUserIdId = useId();

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
                  <label
                    htmlFor={startDateId}
                    className="text-sm font-medium mb-1 block"
                  >
                    Start Date
                  </label>
                  <Input
                    id={startDateId}
                    type="date"
                    value={filters.startDate || ""}
                    onChange={(e) =>
                      updateFilters({ startDate: e.target.value })
                    }
                    aria-label="Filter by start date"
                  />
                </div>
                <div>
                  <label
                    htmlFor={endDateId}
                    className="text-sm font-medium mb-1 block"
                  >
                    End Date
                  </label>
                  <Input
                    id={endDateId}
                    type="date"
                    value={filters.endDate || ""}
                    onChange={(e) => updateFilters({ endDate: e.target.value })}
                    aria-label="Filter by end date"
                  />
                </div>
                <div>
                  <label
                    htmlFor={severityId}
                    className="text-sm font-medium mb-1 block"
                  >
                    Severity
                  </label>
                  <Select
                    onValueChange={(value) =>
                      updateFilters({ severity: [value as SeverityLevel] })
                    }
                  >
                    <SelectTrigger
                      id={severityId}
                      aria-label="Filter by severity level"
                    >
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
                  <label
                    htmlFor={eventTypeId}
                    className="text-sm font-medium mb-1 block"
                  >
                    Event Type
                  </label>
                  <Select
                    onValueChange={(value) =>
                      updateFilters({ eventTypes: [value] })
                    }
                  >
                    <SelectTrigger
                      id={eventTypeId}
                      aria-label="Filter by event type"
                    >
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
                  <label
                    htmlFor={userIdFilterId}
                    className="text-sm font-medium mb-1 block"
                  >
                    User ID
                  </label>
                  <Input
                    id={userIdFilterId}
                    placeholder="Enter user ID"
                    value={filters.userId || ""}
                    onChange={(e) => updateFilters({ userId: e.target.value })}
                    maxLength={100}
                    aria-label="Filter by user ID"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full"
                    disabled={isPending}
                    aria-label="Clear all filters"
                  >
                    Clear Filters
                  </Button>
                </div>
                {isPending && (
                  <div className="col-span-full">
                    <div className="text-sm text-blue-600 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Updating filters...
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Events List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Audit Events
                {eventsData?.events?.length > 0 && (
                  <Badge variant="secondary">
                    {eventsData.events.length.toLocaleString()} events
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div
                  className="text-center py-8"
                  role="status"
                  aria-live="polite"
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  Loading events...
                </div>
              ) : eventsData?.events?.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No audit events found
                  </h3>
                  <p className="text-gray-500">
                    Try adjusting your filters or check back later.
                  </p>
                </div>
              ) : (
                <div
                  className="h-96"
                  role="region"
                  aria-label="Audit events list"
                >
                  <List
                    height={384}
                    itemCount={eventsData?.events?.length || 0}
                    itemSize={80}
                    itemData={{
                      events: eventsData?.events || [],
                      onSelectEvent: setSelectedEvent,
                    }}
                  >
                    {AuditEventItem}
                  </List>
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
