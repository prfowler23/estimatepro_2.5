"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { ComponentErrorBoundary } from "@/components/error-handling/component-error-boundary";

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

// Zod validation schema for webhook form
const webhookFormSchema = z.object({
  url: z
    .string()
    .min(1, "URL is required")
    .url("Please enter a valid URL")
    .refine(
      (url) => url.startsWith("https://"),
      "URL must use HTTPS for security",
    ),
  events: z
    .array(z.string())
    .min(1, "At least one event must be selected")
    .max(10, "Maximum 10 events allowed"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),
  timeout_seconds: z
    .number()
    .int("Timeout must be a whole number")
    .min(1, "Timeout must be at least 1 second")
    .max(30, "Timeout cannot exceed 30 seconds"),
  retry_attempts: z
    .number()
    .int("Retry attempts must be a whole number")
    .min(0, "Retry attempts cannot be negative")
    .max(5, "Maximum 5 retry attempts allowed"),
  retry_delay_seconds: z
    .number()
    .int("Retry delay must be a whole number")
    .min(1, "Retry delay must be at least 1 second")
    .max(300, "Retry delay cannot exceed 5 minutes"),
  active: z.boolean(),
});

type WebhookFormData = z.infer<typeof webhookFormSchema>;

function WebhookManagerComponent() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(
    null,
  );
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form setup
  const createForm = useForm<WebhookFormData>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: {
      url: "",
      events: [],
      description: "",
      timeout_seconds: 10,
      retry_attempts: 3,
      retry_delay_seconds: 5,
      active: true,
    },
  });

  const editForm = useForm<WebhookFormData>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: {
      url: "",
      events: [],
      description: "",
      timeout_seconds: 10,
      retry_attempts: 3,
      retry_delay_seconds: 5,
      active: true,
    },
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

  const handleCreateWebhook = async (data: WebhookFormData) => {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Webhook created successfully",
        });
        setIsCreateDialogOpen(false);
        createForm.reset();
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

  const handleUpdateWebhook = async (data: WebhookFormData) => {
    if (!selectedWebhook) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/integrations/webhooks?id=${selectedWebhook.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "Webhook updated successfully",
        });
        setIsEditDialogOpen(false);
        editForm.reset();
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

  const resetCreateForm = () => {
    createForm.reset();
  };

  const openEditDialog = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    editForm.reset({
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
            <Button onClick={resetCreateForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Webhook</DialogTitle>
            </DialogHeader>
            <WebhookForm
              form={createForm}
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
            form={editForm}
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
  form: ReturnType<typeof useForm<WebhookFormData>>;
  onSubmit: (data: WebhookFormData) => void;
  loading: boolean;
  submitLabel: string;
}

function WebhookForm({
  form,
  onSubmit,
  loading,
  submitLabel,
}: WebhookFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Webhook URL *</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://your-domain.com/webhook"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Must be a valid HTTPS URL for security
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="events"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Events *</FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                  {AVAILABLE_EVENTS.map((event) => (
                    <div key={event} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={event}
                        checked={field.value.includes(event)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            field.onChange([...field.value, event]);
                          } else {
                            field.onChange(
                              field.value.filter((e) => e !== event),
                            );
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={event} className="text-sm">
                        {event}
                      </Label>
                    </div>
                  ))}
                </div>
              </FormControl>
              <FormDescription>
                Select the events you want to receive notifications for
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional description for this webhook"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Help identify this webhook (max 500 characters)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="timeout_seconds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Timeout (seconds)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 10)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="retry_attempts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Retry Attempts</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 3)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="retry_delay_seconds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Retry Delay (seconds)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="300"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 5)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Active</FormLabel>
                <FormDescription>
                  Enable this webhook to receive events
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => {}}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Export wrapped with error boundary
export function WebhookManager() {
  return (
    <ComponentErrorBoundary
      componentName="WebhookManager"
      showDetails={process.env.NODE_ENV === "development"}
    >
      <WebhookManagerComponent />
    </ComponentErrorBoundary>
  );
}
