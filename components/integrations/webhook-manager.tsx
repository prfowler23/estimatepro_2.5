"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  description?: string;
  timeout_seconds: number;
  retry_attempts: number;
  retry_delay_seconds: number;
  created_at: string;
  last_triggered?: string;
  success_count: number;
  failure_count: number;
}

interface WebhookDelivery {
  id: string;
  event: string;
  status: "pending" | "delivered" | "failed" | "retrying";
  attempts: number;
  response_status?: number;
  error_message?: string;
  created_at: string;
  delivered_at?: string;
}

interface WebhookStats {
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  success_rate: number;
  average_response_time: number;
}

const AVAILABLE_EVENTS = [
  "estimate.created",
  "estimate.updated",
  "estimate.approved",
  "estimate.rejected",
  "estimate.sent",
  "customer.created",
  "customer.updated",
  "integration.sync.completed",
  "integration.sync.failed",
  "user.created",
  "user.updated",
  "payment.received",
  "payment.failed",
  "project.started",
  "project.completed",
  "notification.sent",
  "alert.triggered",
  "backup.completed",
  "system.maintenance",
];

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(
    null,
  );
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state for webhook creation/editing
  const [formData, setFormData] = useState({
    url: "",
    events: [] as string[],
    description: "",
    timeout_seconds: 10,
    retry_attempts: 3,
    retry_delay_seconds: 5,
    active: true,
  });

  useEffect(() => {
    loadWebhooks();
  }, []);

  useEffect(() => {
    if (selectedWebhook) {
      loadWebhookDeliveries(selectedWebhook.id);
    }
  }, [selectedWebhook]);

  const loadWebhooks = async () => {
    try {
      const response = await fetch("/api/integrations/webhooks");
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to load webhooks",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Error already handled by toast notification
      toast({
        title: "Error",
        description: "Failed to load webhooks",
        variant: "destructive",
      });
    }
  };

  const loadWebhookDeliveries = async (webhookId: string) => {
    try {
      const response = await fetch(
        `/api/integrations/webhooks/${webhookId}/deliveries`,
      );
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.deliveries || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      // Error handled silently - deliveries will remain empty
    }
  };

  const handleCreateWebhook = async () => {
    if (!formData.url || formData.events.length === 0) {
      toast({
        title: "Error",
        description: "URL and at least one event are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Webhook created successfully",
        });
        setIsCreateDialogOpen(false);
        resetForm();
        loadWebhooks();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to create webhook",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create webhook",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWebhook = async () => {
    if (!selectedWebhook) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/integrations/webhooks?id=${selectedWebhook.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "Webhook updated successfully",
        });
        setIsEditDialogOpen(false);
        resetForm();
        loadWebhooks();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to update webhook",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Error handled by toast notification
      toast({
        title: "Error",
        description: "Failed to update webhook",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this webhook? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/integrations/webhooks?id=${webhookId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "Webhook deleted successfully",
        });
        loadWebhooks();
        if (selectedWebhook?.id === webhookId) {
          setSelectedWebhook(null);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to delete webhook",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Error handled by toast notification
      toast({
        title: "Error",
        description: "Failed to delete webhook",
        variant: "destructive",
      });
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    try {
      const response = await fetch(
        `/api/integrations/webhooks/${webhookId}/deliveries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "test" }),
        },
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "Test webhook sent successfully",
        });
        if (selectedWebhook?.id === webhookId) {
          loadWebhookDeliveries(webhookId);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to send test webhook",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Error handled by toast notification
      toast({
        title: "Error",
        description: "Failed to send test webhook",
        variant: "destructive",
      });
    }
  };

  const handleRetryFailedDeliveries = async (webhookId: string) => {
    try {
      const response = await fetch(
        `/api/integrations/webhooks/${webhookId}/deliveries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "retry_failed" }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: `${data.retried_count} failed deliveries scheduled for retry`,
        });
        loadWebhookDeliveries(webhookId);
      } else {
        toast({
          title: "Error",
          description: "Failed to retry deliveries",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Error handled by toast notification
      toast({
        title: "Error",
        description: "Failed to retry deliveries",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      url: "",
      events: [],
      description: "",
      timeout_seconds: 10,
      retry_attempts: 3,
      retry_delay_seconds: 5,
      active: true,
    });
  };

  const openEditDialog = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    setFormData({
      url: webhook.url,
      events: webhook.events,
      description: webhook.description || "",
      timeout_seconds: webhook.timeout_seconds,
      retry_attempts: webhook.retry_attempts,
      retry_delay_seconds: webhook.retry_delay_seconds,
      active: webhook.active,
    });
    setIsEditDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "retrying":
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "delivered":
        return "default";
      case "failed":
        return "destructive";
      case "pending":
        return "secondary";
      case "retrying":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Webhook Management</h2>
          <p className="text-muted-foreground">
            Configure webhooks to receive real-time notifications about events
            in your system
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Webhook</DialogTitle>
            </DialogHeader>
            <WebhookForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleCreateWebhook}
              loading={loading}
              submitLabel="Create Webhook"
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="deliveries" disabled={!selectedWebhook}>
            Deliveries
          </TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4">
          {webhooks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No webhooks configured
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first webhook to start receiving real-time
                  notifications
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Webhook
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {webhooks.map((webhook) => (
                <Card
                  key={webhook.id}
                  className={
                    selectedWebhook?.id === webhook.id ? "border-blue-500" : ""
                  }
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-lg">
                            {webhook.url}
                          </CardTitle>
                          <Badge
                            variant={webhook.active ? "default" : "secondary"}
                          >
                            {webhook.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {webhook.description && (
                          <p className="text-sm text-muted-foreground">
                            {webhook.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {webhook.events.map((event) => (
                            <Badge
                              key={event}
                              variant="outline"
                              className="text-xs"
                            >
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestWebhook(webhook.id)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(webhook)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Success Rate</p>
                        <p className="font-medium">
                          {webhook.success_count + webhook.failure_count > 0
                            ? Math.round(
                                (webhook.success_count /
                                  (webhook.success_count +
                                    webhook.failure_count)) *
                                  100,
                              )
                            : 0}
                          %
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Total Deliveries
                        </p>
                        <p className="font-medium">
                          {webhook.success_count + webhook.failure_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Triggered</p>
                        <p className="font-medium">
                          {webhook.last_triggered
                            ? new Date(
                                webhook.last_triggered,
                              ).toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedWebhook(webhook)}
                          className="w-full"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          {selectedWebhook && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">
                          {stats.total_deliveries}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Successful</p>
                        <p className="text-2xl font-bold text-green-600">
                          {stats.successful_deliveries}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Failed</p>
                        <p className="text-2xl font-bold text-red-600">
                          {stats.failed_deliveries}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Success Rate</p>
                        <p className="text-2xl font-bold">
                          {stats.success_rate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Avg Response Time
                        </p>
                        <p className="text-2xl font-bold">
                          {stats.average_response_time.toFixed(2)}s
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleRetryFailedDeliveries(selectedWebhook.id)
                      }
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Failed Deliveries
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Deliveries</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Response</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Delivered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.map((delivery) => (
                        <TableRow key={delivery.id}>
                          <TableCell className="font-medium">
                            {delivery.event}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(delivery.status)}
                              <Badge
                                variant={getStatusBadgeVariant(delivery.status)}
                              >
                                {delivery.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{delivery.attempts}</TableCell>
                          <TableCell>
                            {delivery.response_status ? (
                              <Badge
                                variant={
                                  delivery.response_status < 300
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {delivery.response_status}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(delivery.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {delivery.delivered_at
                              ? new Date(delivery.delivered_at).toLocaleString()
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Webhook Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Webhook</DialogTitle>
          </DialogHeader>
          <WebhookForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleUpdateWebhook}
            loading={loading}
            submitLabel="Update Webhook"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface WebhookFormProps {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  loading: boolean;
  submitLabel: string;
}

function WebhookForm({
  formData,
  setFormData,
  onSubmit,
  loading,
  submitLabel,
}: WebhookFormProps) {
  const handleEventToggle = (event: string) => {
    const newEvents = formData.events.includes(event)
      ? formData.events.filter((e: string) => e !== event)
      : [...formData.events, event];
    setFormData({ ...formData, events: newEvents });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="url">Webhook URL *</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://your-domain.com/webhook"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Events *</Label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
          {AVAILABLE_EVENTS.map((event) => (
            <div key={event} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={event}
                checked={formData.events.includes(event)}
                onChange={() => handleEventToggle(event)}
                className="rounded"
              />
              <Label htmlFor={event} className="text-sm">
                {event}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Optional description for this webhook"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="timeout">Timeout (seconds)</Label>
          <Input
            id="timeout"
            type="number"
            min="1"
            max="30"
            value={formData.timeout_seconds}
            onChange={(e) =>
              setFormData({
                ...formData,
                timeout_seconds: parseInt(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="retries">Retry Attempts</Label>
          <Input
            id="retries"
            type="number"
            min="0"
            max="5"
            value={formData.retry_attempts}
            onChange={(e) =>
              setFormData({
                ...formData,
                retry_attempts: parseInt(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="delay">Retry Delay (seconds)</Label>
          <Input
            id="delay"
            type="number"
            min="1"
            max="300"
            value={formData.retry_delay_seconds}
            onChange={(e) =>
              setFormData({
                ...formData,
                retry_delay_seconds: parseInt(e.target.value),
              })
            }
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="active"
          checked={formData.active}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, active: checked })
          }
        />
        <Label htmlFor="active">Active</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={() => {}}>
          Cancel
        </Button>
        <Button type="button" onClick={onSubmit} disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
